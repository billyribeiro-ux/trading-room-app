import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RoomPrivateCommands } from '#lib/room/private-commands.js';
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

describe('a presenter can only set an avatar for a member of their own room', () => {
  it('gates on the presenter role and the caller own room, in one call', () => {
    /*
      `presenterRoom()` returns the room only after the role check, which is what makes "gated" and
      "scoped to the caller's tenant" the same event — see `auth.ts`. A `roomShortCode` argument
      would let a presenter of room A command room B, so the command must not take one.
    */
    expect(SOURCE).toContain('const room = presenterRoom();');
    expect(SOURCE).not.toContain('roomShortCode:');
  });

  it('checks membership BEFORE the durable write, not after', () => {
    const check = SOURCE.indexOf('requireRoomMember(targetUserId, room)');
    const write = SOURCE.indexOf('db.update(users)');
    const store = SOURCE.indexOf('storeUpload(file)');

    expect(check, 'the membership check is gone').toBeGreaterThan(-1);
    expect(write, 'the durable write is gone').toBeGreaterThan(-1);

    /*
      Before the WRITE and before the STORE. Checking after the upload would still refuse the row,
      but it would have written a stranger's file to disk on the way — a check that runs after the
      side effect it is protecting is not protecting it.
    */
    expect(check).toBeLessThan(write);
    expect(check).toBeLessThan(store);
  });

  it('proves the content type as well as the type', () => {
    /*
      `z.instanceof(File)` proves the TYPE and this proves the CONTENT TYPE. The picker restricts to
      images; this is that restriction enforced where it cannot be edited out — the same line and
      reasoning `uploadComposerImage` carries.
    */
    expect(SOURCE).toContain("file.type.startsWith('image/')");
  });

  it('patches the roster snapshot before publishing it', () => {
    /*
      THE BUG THE FIRST DRAFT HAD. `RosterUser.avatarUrl` is captured into the subscriber context at
      SUBSCRIBE TIME, so `publishRosterToRoom` alone re-pushes the OLD url and every other member
      keeps the previous picture until they reconnect — while the durable row already disagrees.
    */
    const patch = SOURCE.indexOf('setRosterAvatar(room, targetUserId, stored.url)');
    const publish = SOURCE.indexOf('publishRosterToRoom(room)');
    expect(patch, 'the roster snapshot is no longer patched').toBeGreaterThan(-1);
    expect(patch).toBeLessThan(publish);
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
      profilePictureChanged: (avatarUrl) => applied.push(avatarUrl)
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
