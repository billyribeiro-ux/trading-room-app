import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RoomPrivateCommands } from '#lib/room/private-commands.js';
import { downscaledSize, needsDownscale } from '#lib/profile-picture-downscale.js';
import type { RoomChatMute } from '#lib/room/chat-mute.js';

/**
 * `adminUploadProfilePic` — a presenter sets one member's avatar.
 *
 * ## The property this file exists for
 *
 * This is the FIRST presenter command in the room that writes a durable row keyed on the target
 * alone. Every one before it ends in `publishToUsers(room, [targetUserId], …)`, where delivery is
 * scoped to the room's own subscriber map — naming a stranger's id sends a frame nobody receives, so
 * tenancy is enforced by the transport without anyone having to remember it. `kickUser`'s durable
 * half is scoped the same way, by the controller call that writes the ban.
 *
 * A `db.update(users)` has no such scoping. Without `requireRoomMember` a presenter of room A could
 * set the avatar of a member of room B by guessing an integer — the 2026-08-07 privilege escalation
 * arriving through a feature rather than through a token. **The assertions below are that the call
 * is present and that it runs BEFORE the write**, because a membership check after the row has
 * changed is not a check.
 *
 * ## Why this is asserted from the source rather than by calling the command
 *
 * `uploadProfilePicture` is a SvelteKit remote `command`, which reaches `getRequestEvent()` for the
 * session. Calling it outside a request throws before any of its own logic runs, so a behavioural
 * test would assert that SvelteKit refuses an unbound call — which is true and says nothing about
 * this feature. `remote-command-harness.ts` exists for the commands that can be driven; this one's
 * security property is structural, and the structure is what is checked.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = readFileSync(`${ROOT}routes/profile-picture.remote.ts`, 'utf8');

/**
 * One exported command's body, from its `export const <name> = command(` to the end of the module.
 *
 * Crude on purpose: the assertions below are about ORDER within a command, and the cheapest correct
 * way to bound one is to start at its declaration. Ending at the next `export const` keeps the two
 * commands from bleeding into each other, which is exactly the bug that made this helper necessary.
 */
function commandBody(name: string): string {
  const from = SOURCE.indexOf(`export const ${name} = command(`);
  expect(from, `${name} is no longer exported as a command`).toBeGreaterThan(-1);
  const next = SOURCE.indexOf('\nexport const ', from + 1);
  return SOURCE.slice(from, next === -1 ? SOURCE.length : next);
}

/** `roomForAvatarChange`, which both commands now go through. Bounded by the next declaration. */
function authorityHelper(): string {
  const from = SOURCE.indexOf('function roomForAvatarChange(');
  expect(from, 'roomForAvatarChange is gone').toBeGreaterThan(-1);
  const next = SOURCE.indexOf('\nexport const ', from);
  return SOURCE.slice(from, next === -1 ? SOURCE.length : next);
}

describe('who may change whose avatar', () => {
  /*
    TWO AUTHORITIES, and the capture has both — which this file asserted only half of until
    2026-08-29.

    A PRESENTER may set any member's picture (`setUserProfilePic`, gated `O(14, globals.isPresenter …)`).
    ANY MEMBER may change their OWN: the `edit-user-avatar-options` dropdown, gated
    `O(6, o.user.userXrefID === o.appService.globals.user.userXrefID ? 6 : -1)` at bundle byte
    2,095,081 — with no role term in it at all.

    The gate moved into `roomForAvatarChange` so both commands ask once. These assertions moved with
    it rather than being deleted: what they protect is unchanged, and the helper is now the single
    place either of them could go wrong.
  */
  const helper = authorityHelper();

  it('sends anyone who is NOT the caller down the presenter path, membership and all', () => {
    /*
      `presenterRoom()` returns the room only after the role check, which is what makes "gated" and
      "scoped to the caller's tenant" the same event — see `auth.ts`. A `roomShortCode` argument
      would let a presenter of room A command room B, so neither command may take one.
    */
    expect(helper).toContain('const room = presenterRoom();');
    expect(helper).toContain('requireRoomMember(targetUserId, room);');
    expect(SOURCE).not.toContain('roomShortCode:');
  });

  it('lets a member act on THEMSELVES without a role, and names nobody to do it', () => {
    /*
      THE WIDENING, and the reason it is safe stated as an assertion rather than only in prose: the
      self branch compares the argument against an id the SERVER read from the session. It does not
      trust an id, it refuses every id but one.

      `requireRoomShortCode` and not `presenterRoom`, because demanding a role here would refuse the
      capture's own control; and no membership check, because the caller IS the member.
    */
    const self = helper.indexOf('requireUser(locals).id === targetUserId');
    const scope = helper.indexOf('return requireRoomShortCode(locals);');
    const presenter = helper.indexOf('presenterRoom()');

    expect(self, 'the self branch is gone').toBeGreaterThan(-1);
    expect(scope, 'the self branch no longer scopes to a room').toBeGreaterThan(self);
    expect(scope, 'the self branch must return BEFORE the presenter gate').toBeLessThan(presenter);
  });

  it('checks membership BEFORE the durable write, not after', () => {
    const body = commandBody('uploadProfilePicture');
    const check = body.indexOf('roomForAvatarChange(targetUserId)');
    const write = body.indexOf('db.update(users)');
    const store = body.indexOf('storeUpload(file)');

    expect(check, 'the authority check is gone').toBeGreaterThan(-1);
    expect(write, 'the durable write is gone').toBeGreaterThan(-1);

    /*
      Before the WRITE and before the STORE. Checking after the upload would still refuse the row,
      but it would have written a stranger's file to disk on the way — a check that runs after the
      side effect it is protecting is not protecting it.
    */
    expect(check).toBeLessThan(write);
    expect(check).toBeLessThan(store);
  });

  it('gates the REMOVE the same way, because it writes the same row', () => {
    /*
      A second durable write keyed on the target alone, and therefore a second place the authority
      has to be remembered. It is asserted separately rather than trusted to the shared helper: the
      whole reason that helper exists is that this class of check is easy to leave out of the next
      command, and "the file has one somewhere" is not the property that matters.
    */
    const body = commandBody('removeProfilePicture');
    const check = body.indexOf('roomForAvatarChange(targetUserId)');
    const write = body.indexOf('db.update(users)');
    expect(check, 'removeProfilePicture no longer checks authority').toBeGreaterThan(-1);
    expect(check).toBeLessThan(write);

    /*
      And the value it writes is the SERVER's, derived from the row's own email — not a url the
      caller supplies. A remove that accepted a replacement url would be an upload with no content
      check.
    */
    expect(body).toContain('gravatarUrl(target.email)');
    expect(body).toContain('z.number().int().positive()');
  });

  it('proves the content type as well as the type', () => {
    /*
      `z.instanceof(File)` proves the TYPE and this proves the CONTENT TYPE. The picker restricts to
      images; this is that restriction enforced where it cannot be edited out — the same line and
      reasoning `uploadComposerImage` carries.
    */
    expect(SOURCE).toContain("file.type.startsWith('image/')");
  });

  it('patches the roster snapshot before publishing it, in BOTH commands', () => {
    /*
      THE BUG THE FIRST DRAFT HAD. `RosterUser.avatarUrl` is captured into the subscriber context at
      SUBSCRIBE TIME, so `publishRosterToRoom` alone re-pushes the OLD url and every other member
      keeps the previous picture until they reconnect — while the durable row already disagrees.

      PER COMMAND, not over the whole file, and that is a correction. The first version searched the
      module with `indexOf` and passed only while there was one command in it; adding
      `removeProfilePicture` made it compare the remove's publish against the upload's patch and go
      red for code that was correct. A positional assertion over a file is a positional assertion
      about whatever happens to be in that file.
    */
    for (const name of ['uploadProfilePicture', 'removeProfilePicture']) {
      const body = commandBody(name);
      const patch = body.indexOf('setRosterAvatar(');
      const publish = body.indexOf('publishRosterToRoom(');
      expect(patch, `${name} no longer patches the roster snapshot`).toBeGreaterThan(-1);
      expect(publish, `${name} no longer publishes the roster`).toBeGreaterThan(-1);
      expect(patch, `${name} publishes the roster before patching it`).toBeLessThan(publish);
    }
  });

  it('tells the member AND the room, which are two different updates', () => {
    /*
      The addressed frame updates the member's OWN view of themselves — upstream's
      `case "updateProfilePic"`. The roster publish updates everybody else's view of them. Sending
      only the first leaves the room looking at the old picture; only the second leaves the member
      looking at their own.
    */
    expect(SOURCE).toContain("cmd: 'updateProfilePic'");
    expect(SOURCE).toContain('publishToUsers(room, [targetUserId]');
    expect(SOURCE).toContain('publishRosterToRoom(room)');
  });
});

describe('the membership check is the same notion of live that logging in uses', () => {
  it('shares one TTL constant with the session lookup rather than restating a number', () => {
    /*
      Two definitions of "a live session" is how one of them quietly stops matching the other — a
      membership that outlives a login, or refuses one that has not expired. The constant moved to
      `auth.ts` when `requireRoomMember` became its second reader; this asserts it did not grow a
      twin on the way back.
    */
    const auth = readFileSync(`${ROOT}lib/server/auth.ts`, 'utf8');
    const connection = readFileSync(`${ROOT}lib/server/connection.ts`, 'utf8');

    expect(auth).toContain('export const SESSION_ABSOLUTE_TTL_MS');
    expect(connection).toContain('SESSION_ABSOLUTE_TTL_MS');
    expect(
      connection.includes('const SESSION_ABSOLUTE_TTL_MS ='),
      'connection.ts has grown its own copy of the session TTL again'
    ).toBe(false);
  });

  it('refuses with 404 rather than 403, and says so', () => {
    /*
      A presenter IS allowed to act on members of their own room, so "you may not" is the wrong
      sentence. 404 is the honest one and it also declines to confirm that the id exists elsewhere,
      which a 403 would do.
    */
    const auth = readFileSync(`${ROOT}lib/server/auth.ts`, 'utf8');
    expect(auth).toContain("error(404, 'No such member in this room.')");
  });
});

describe('the picture is downscaled to the reference 125px box before it is uploaded', () => {
  it('scales the LONGEST edge to 125 and the other in proportion', () => {
    /*
      The reference's own arithmetic, byte 2,084,700:
        B > W ? B > 125 && (W *= 125 / B, B = 125)
              : W > 125 && (B *= 125 / W, W = 125)
    */
    expect(downscaledSize(4000, 2000)).toEqual({ width: 125, height: 62 });
    expect(downscaledSize(2000, 4000)).toEqual({ width: 62, height: 125 });
    expect(downscaledSize(500, 500)).toEqual({ width: 125, height: 125 });
  });

  it('leaves an image already inside the box completely alone', () => {
    /*
      The `&&` in both branches. An avatar that is already small must not be re-encoded: the room
      draws it at 45px and 80px, so upscaling it to 125 would add bytes and blur.
    */
    expect(downscaledSize(100, 80)).toEqual({ width: 100, height: 80 });
    expect(downscaledSize(125, 125)).toEqual({ width: 125, height: 125 });
    expect(needsDownscale(100, 80)).toBe(false);
    expect(needsDownscale(126, 10)).toBe(true);
  });

  it('floors rather than rounds, because a canvas dimension is an integer', () => {
    /*
      `W *= 125 / B` produces a float and the reference assigns it straight to `canvas.width`, which
      the platform truncates. Rounding here would diverge by up to half a pixel from what the
      reference actually draws.
    */
    expect(downscaledSize(300, 199)).toEqual({ width: 125, height: 82 });
    expect((199 * 125) / 300).toBeCloseTo(82.9, 1);
  });

  it('returns an undecodable size unchanged rather than throwing', () => {
    /*
      Zero or non-finite means the browser could not decode the file. Carrying on lets the SERVER
      refuse it with the real reason - "That is not an image" - instead of failing here with a
      complaint about a size.
    */
    expect(downscaledSize(0, 0)).toEqual({ width: 0, height: 0 });
    expect(downscaledSize(Number.NaN, 10)).toEqual({ width: Number.NaN, height: 10 });
  });

  it('is applied by the picker, and fails OPEN when the browser cannot decode', () => {
    const modal = readFileSync(`${ROOT}lib/components/ModalHost.svelte`, 'utf8');
    expect(modal).toContain('downscaledSize(bitmap.width, bitmap.height)');
    /* PNG at quality 1, both the reference's. */
    expect(modal).toContain("'image/png', 1");
    /*
      Four escape hatches, each handing the ORIGINAL file up: an undecodable bitmap, a missing 2d
      context, a null blob, and any throw. A resize that refused the upload would replace the
      server's specific message with a vaguer one.
    */
    const from = modal.indexOf('async function sendProfilePicture');
    expect(from, 'the downscaling picker is gone').toBeGreaterThan(-1);
    const to = modal.indexOf('\n  }', from);
    expect(to, 'the picker no longer closes').toBeGreaterThan(from);
    const fallbacks = modal.slice(from, to);
    expect(fallbacks.split('onUploadProfilePicture(user, file)').length - 1).toBe(4);
  });
});

/**
 * Source with comments removed.
 *
 * The assertions below quote sentences that ALSO appear in the docblocks explaining them — this
 * file's own subject is a correction, so the prose necessarily contains the strings the code must
 * contain. A raw `toContain` therefore passes on the comment and measures nothing, which is exactly
 * what happened: the control that deleted the success alert came back green.
 *
 * Third instance of this shape in one day — `orphan-style-contract` hit it through transcription
 * notes and `dead-export-contract` through its own catalog. A gate that reads source must read the
 * CODE.
 */
const codeOf = (source: string) =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('the presenter is told what happened, in the reference own words', () => {
  it('announces success and failure, which the first version did NOT', () => {
    /*
      THE CORRECTION THIS BLOCK EXISTS FOR. The first version of `uploadProfilePicture` argued that
      upstream raises no alert on success. That reasoning was carried over from `getDebugLog`, where
      it is true, and was never checked here — the reference alerts three times, at byte 2,086,100.
    */
    const actions = codeOf(readFileSync(`${ROOT}lib/room/user-actions.svelte.ts`, 'utf8'));
    expect(actions).toContain('Profile picture uploaded successfully for');
    expect(actions).toContain("'Upload Failed...'");
  });

  it('prefers the server reason over the transcribed one', () => {
    /*
      "That is not an image" or the size limit beats `"Upload Failed..."`. The transcription is the
      fallback for when there is no specific reason to give, not the first answer.
    */
    const actions = codeOf(readFileSync(`${ROOT}lib/room/user-actions.svelte.ts`, 'utf8'));
    expect(actions).toContain(
      "cause instanceof Error && cause.message ? cause.message : 'Upload Failed...'"
    );
  });
});

describe('the receiver applies only a well-formed frame', () => {
  function router(applied: string[]) {
    return new RoomPrivateCommands({
      viewerId: () => 5,
      chatMute: {} as RoomChatMute,
      forceReloadRequested: () => {},
      kicked: () => {},
      reconnectAudio: () => Promise.resolve(),
      collectDebugLog: () => '',
      sendDebugLog: () => {},
      debugLogReceived: () => {},
      profilePictureChanged: (avatarUrl) => applied.push(avatarUrl),
      stopLocalScreen: () => {}
    });
  }

  it('applies an avatar addressed to this member', () => {
    const applied: string[] = [];
    expect(
      router(applied).handle(
        { cmd: 'updateProfilePic', targetUserId: 5, avatarUrl: '/uploads/a.png' },
        () => {}
      )
    ).toBe(true);
    expect(applied).toEqual(['/uploads/a.png']);
  });

  it('ignores one addressed to somebody else', () => {
    const applied: string[] = [];
    expect(
      router(applied).handle(
        { cmd: 'updateProfilePic', targetUserId: 6, avatarUrl: '/uploads/a.png' },
        () => {}
      )
    ).toBe(false);
    expect(applied).toEqual([]);
  });

  it('refuses a missing or empty url rather than blanking the avatar', () => {
    /*
      A frame without the url would otherwise set the member's own avatar to `undefined` — the exact
      marker `room-renders.spec.ts` forbids on the page, arriving through a receiver.
    */
    const applied: string[] = [];
    const commands = router(applied);
    expect(commands.handle({ cmd: 'updateProfilePic', targetUserId: 5 }, () => {})).toBe(false);
    expect(
      commands.handle({ cmd: 'updateProfilePic', targetUserId: 5, avatarUrl: '' }, () => {})
    ).toBe(false);
    expect(applied).toEqual([]);
  });
});
