// @vitest-environment node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

import {
  publishRosterToRoom,
  setRosterLocation,
  subscribeToRoom,
  type RoomEvent,
  type RosterUser
} from './room-events';

/*
  A MEMBER MUST NEVER RECEIVE ANOTHER MEMBER'S PRIVATE FIELDS — on the wire, not merely on screen.

  Two fields are presenter-only, and they are guarded together because they are one question: may
  this recipient see another member's personal details? `locStr` is the city; `email` is the address.

  ## The defect, found 2026-08-18 by reading the fan-out path

  `RosterUser.locStr` carries a member's city, e.g. `Waterbury, CT, US`. Its own docblock in
  `room-events.ts` says: *"It sits beside the IP under `privData` in the reference and is
  presenter-only on the way out — `locationVisibleTo` is the gate, and nothing here may publish it
  to a member."*

  The gate existed and worked. It is `roster-gates.ts:locationVisibleTo`, and `RoomSidebar.svelte`
  wraps the city line in `{#if locationVisible(user)}`, so a member's screen showed nothing.

  **The wire was never filtered.** `roomRoster()` returns whole `RosterUser` objects, `publishToRoom`
  hands the identical object to every listener in the room, and FOUR call sites published it: on
  join, on leave, on teardown, and every time a browser's geolocation lookup answered. A member with
  DevTools open read every other member's city out of the SSE payload. The UI was declining to draw
  data it had already been handed.

  That is the shape the root standard names in as many words: *"Every authority decision is made on
  the server from data the server owns — never asserted by the client, ever, for any reason."* A
  render gate is not an authority decision; it is a decoration over one nobody made.

  ## `email` followed the same day, on the owner's decision

  The REFERENCE never puts an address in a roster entry — `roster-gates.ts` records it verbatim:
  *"its roster entries carry only `emailHash`, never the address. Ours carry `email`, so the second
  clause is a direct comparison — same result, without an md5 implementation in the browser."* That
  shortcut broadcast every member's address to every other member.

  Chosen over adding md5 to the client bundle, with the cost stated rather than discovered: a MEMBER
  can no longer match the roster search box against a full address. Name search is untouched, and
  `emailHash` still travels, so avatars, chat badges and `uniqueRoster` are unaffected.

  ## Why this file EXECUTES rather than reads source

  A source-text assertion cannot answer the only question that matters — what bytes reach a member.
  So this subscribes a real presenter and a real member to a real room through the real hub, sets a
  real location, publishes, and inspects what each listener was actually handed.

  ## Fails closed

  An anonymous listener has no `RosterUser` and is therefore not a presenter, so it is redacted. The
  authority is the subscriber's own `isP`, which `sess/[room]/events/+server.ts` sets from the room's
  membership row server-side — the note at that assignment records deliberately choosing it as the
  SINGLE source rather than falling back to the session role, precisely because two ways of
  computing one fact is the shape of the 2026-08-07 privilege escalation.
*/

/*
  Built against the real `RosterUser`, not a hand-written subset — a first draft carried a `nick`
  field the type does not have, and `svelte-check` named it. The annotated return type is what makes
  that a compile error rather than a fixture that quietly drifts from the shape the hub publishes.
*/
const rosterUser = (id: number, isP: boolean): RosterUser => ({
  id,
  userXrefID: `xref-${id}`,
  displayName: `User ${id}`,
  email: `user${id}@example.test`,
  avatarUrl: '',
  role: isP ? 'staff' : 'member',
  status: 'active',
  emailHash: `hash-${id}`,
  isP,
  isFT: false,
  hasAdminChat: false,
  locStr: '',
  /*
    All four ON in the fixture, deliberately. A default of `false` would make the redaction
    assertions below pass against a hub that forwarded them untouched, which is the vacuous-guard
    failure this repository keeps finding in its own tests.
  */
  hasMic: true,
  hasScreen: true,
  hasCam: true,
  canEditNotes: true
});

const ROOM = 'privacy-probe-room';
const teardowns: (() => void)[] = [];

/** Subscribes and records the frames that listener receives. */
const listen = (user: RosterUser | null) => {
  const received: RoomEvent[] = [];
  teardowns.push(subscribeToRoom(ROOM, (event) => received.push(event), user));
  return received;
};

/** The `users` array out of the most recent `getRoster` frame this listener saw. */
const lastRoster = (received: RoomEvent[]): RosterUser[] => {
  for (let index = received.length - 1; index >= 0; index -= 1) {
    const frame = received[index];
    const data = frame.data as { cmd?: string; users?: RosterUser[] };
    if (frame.channel === 'roster' && data?.cmd === 'getRoster' && data.users) return data.users;
  }
  throw new Error('no getRoster frame was received at all');
};

afterEach(() => {
  while (teardowns.length) teardowns.pop()?.();
});

describe('roster location is redacted per recipient, at the hub', () => {
  it('a MEMBER receives no location and no email for anybody', () => {
    const presenter = rosterUser(1, true);
    const member = rosterUser(2, false);
    const presenterFrames = listen(presenter);
    const memberFrames = listen(member);

    // Both people report a city, exactly as `POST /api/roster/location` does.
    expect(setRosterLocation(ROOM, presenter.id, 'Waterbury, CT, US')).toBe(true);
    expect(setRosterLocation(ROOM, member.id, 'Lisbon, PT')).toBe(true);
    publishRosterToRoom(ROOM);

    const seenByMember = lastRoster(memberFrames);
    expect(seenByMember, 'the member must still see the whole roster').toHaveLength(2);
    expect(
      seenByMember.map((entry) => entry.locStr),
      'a member must receive no location at all - not even their own neighbours’'
    ).toEqual(['', '']);
    expect(
      seenByMember.map((entry) => entry.email),
      'nor any address: the reference never puts one in a roster entry'
    ).toEqual(['', '']);

    /*
      Redaction must not cost a row, a name, or the HASH. `emailHash` is what gravatar URLs, chat
      badges and `uniqueRoster` are keyed on, so blanking it would break three things that have
      nothing to do with privacy.
    */
    expect(seenByMember.map((entry) => entry.displayName).sort()).toEqual(['User 1', 'User 2']);
    expect(seenByMember.map((entry) => entry.emailHash).sort()).toEqual(['hash-1', 'hash-2']);

    /*
      THE FOUR PERMISSION FLAGS ARE PRESENTER-ONLY TOO, added 2026-08-23 with the write path.

      They exist so `#permissionsModal` can seed its checkboxes from the truth. A member cannot open
      that modal and no gate a member evaluates reads them, so they are stripped here on the same
      argument `locStr` and `email` were: the wire is the boundary, and a field with no reader on
      this side of it is a disclosure with no purpose.

      `hasAdminChat` deliberately stays visible — the per-row VISIBILITY gate reads it off other
      people's entries, so it has a consumer a member genuinely evaluates.
    */
    expect(
      seenByMember.map((e) => [e.hasMic, e.hasScreen, e.hasCam, e.canEditNotes]),
      'a member must learn nothing about what another member is permitted to do'
    ).toEqual([
      [false, false, false, false],
      [false, false, false, false]
    ]);

    const seenByPresenter = lastRoster(presenterFrames);
    expect(
      seenByPresenter.map((entry) => entry.locStr).sort(),
      'a presenter is the one role that may see them'
    ).toEqual(['Lisbon, PT', 'Waterbury, CT, US']);
    expect(
      seenByPresenter.map((entry) => entry.email).sort(),
      'the presenter keeps the address for the roster search and the mailto: link'
    ).toEqual(['user1@example.test', 'user2@example.test']);
    /*
      The POSITIVE control for the redaction above, and the reason the write path is safe: the
      presenter must receive the flags INTACT, because `#permissionsModal` seeds its five checkboxes
      from them and the Save button posts that state wholesale. A hub that stripped them for
      everybody would make every Save a revocation — which is exactly what happened while the four
      were not carried at all.
    */
    expect(
      seenByPresenter.map((e) => [e.hasMic, e.hasScreen, e.hasCam, e.canEditNotes]),
      'the presenter seeds the permissions modal from these'
    ).toEqual([
      [true, true, true, true],
      [true, true, true, true]
    ]);
  });

  it('an ANONYMOUS listener is redacted, because absent authority is not presenter', () => {
    const presenter = rosterUser(3, true);
    listen(presenter);
    const anonymousFrames = listen(null);

    expect(setRosterLocation(ROOM, presenter.id, 'Waterbury, CT, US')).toBe(true);
    publishRosterToRoom(ROOM);

    const seen = lastRoster(anonymousFrames);
    expect(
      seen.map((entry) => entry.locStr),
      'no RosterUser means no presenter claim, so it fails closed'
    ).toEqual(['']);
    expect(
      seen.map((entry) => entry.email),
      'and the address is withheld too'
    ).toEqual(['']);
  });

  it('does not hand the presenter and the member the SAME array', () => {
    /*
      Structural, and it is what makes the redaction real rather than incidental. If both recipients
      were handed one object, a later change on either side would be a change on both — and the
      cheapest wrong fix for this defect is to mutate the shared roster in place.
    */
    const presenterFrames = listen(rosterUser(4, true));
    const memberFrames = listen(rosterUser(5, false));
    expect(setRosterLocation(ROOM, 4, 'Waterbury, CT, US')).toBe(true);
    publishRosterToRoom(ROOM);

    expect(lastRoster(presenterFrames)).not.toBe(lastRoster(memberFrames));
  });

  it('survives a listener that throws, like every other fan-out in the hub', () => {
    // One dead connection must not silence the room; `publishToRoom` carries the same contract.
    const presenter = rosterUser(6, true);
    teardowns.push(
      subscribeToRoom(
        ROOM,
        () => {
          throw new Error('this connection is gone');
        },
        presenter
      )
    );
    const memberFrames = listen(rosterUser(7, false));

    expect(() => publishRosterToRoom(ROOM)).not.toThrow();
    expect(lastRoster(memberFrames), 'the surviving listener still got the roster').toHaveLength(2);
  });
});

describe('the roster payload is an EXACT key set, per role', () => {
  /*
    THE GUARD THE SSE ROSTER NEVER HAD, and the asymmetry that let three fields through.

    `page-load-contract.test.ts` pins `data.user` as an exact key set, and says why in its own
    words: *"Pinned as an exact key set rather than as 'does not contain scrypt$': a hash format can
    change, and an allow-list is the only form of this assertion that also catches the NEXT
    sensitive column somebody adds to `users`."*

    That guard was on the page load, which carries the viewer's OWN account. It was never on the SSE
    roster, which carries EVERYBODY's — the strictly larger surface. So `locStr`, `email` and
    `createdAt` all reached every member's browser, and each was found by hand rather than by a
    failing test.

    Two lists, because the two roles legitimately receive different payloads now. A new field is a
    deliberate decision on BOTH sides: add it here and say which role may see it, or it fails.
  */
  const PRESENTER_KEYS = [
    'avatarUrl',
    'displayName',
    // Presenter-only. Feeds the roster's exact-email search and the user-info modal's mailto: link.
    'email',
    // The gravatar key and `uniqueRoster`'s dedupe key. Not the address, and every role gets it.
    'emailHash',
    'hasAdminChat',
    'id',
    // `r.isFT` — the "Only select from Trials?" filter on the random draw.
    'isFT',
    // Controller-derived membership age, used only by presenter-facing New markers.
    'isNew',
    // `r.isP` — four gates read the presenter flag off the ENTRY rather than off `role`.
    'isP',
    // Presenter-only. The city line, resolved by the browser and posted back after subscribe.
    'locStr',
    /*
      The four remaining permission checkboxes, added 2026-08-23 — and this list is what forced the
      disclosure decision rather than letting it be made by omission.

      PRESENTER-ONLY IN VALUE, present in shape for both, exactly like `locStr` and `email` above:
      the member's copy arrives as four `false`s, asserted in the redaction test earlier in this
      file. They exist so `#permissionsModal` seeds its checkboxes from the truth; a member cannot
      open that modal and no gate a member evaluates reads them, so there is no reader to disclose
      them to.

      `hasAdminChat` is deliberately NOT among them and stays visible to everyone, because the
      per-row VISIBILITY gate reads it off other people's entries.
    */
    'canEditNotes',
    'hasCam',
    'hasMic',
    'hasScreen',
    'role',
    'status',
    // The identity the per-row roster gate compares against.
    'userXrefID'
  ];
  /* Same SHAPE for a member — the private fields arrive blank rather than absent, so the sidebar
     renders one roster type whichever source filled it. What differs is the VALUES, asserted above. */
  const MEMBER_KEYS = PRESENTER_KEYS;

  it('sends a presenter exactly these keys and no others', () => {
    const presenterFrames = listen(rosterUser(8, true));
    listen(rosterUser(9, false));
    publishRosterToRoom(ROOM);

    for (const entry of lastRoster(presenterFrames)) {
      expect(
        Object.keys(entry).sort(),
        'a field reached the wire that this list does not name. Add it here and say which role may see it - that is the decision this list exists to force, and skipping it is how locStr, email and createdAt each shipped.'
      ).toEqual([...PRESENTER_KEYS].sort());
    }
  });

  it('sends a member exactly these keys and no others', () => {
    listen(rosterUser(10, true));
    const memberFrames = listen(rosterUser(11, false));
    publishRosterToRoom(ROOM);

    for (const entry of lastRoster(memberFrames)) {
      expect(Object.keys(entry).sort()).toEqual([...MEMBER_KEYS].sort());
    }
  });

  it('agrees with the PAGE-LOAD roster on every field the sidebar reads', () => {
    /*
      `+page.server.ts` states the invariant — *"The roster shape must agree between the page load
      and the SSE hub, because the sidebar renders whichever it has"* — and removing `createdAt`
      from the hub put a difference between them for the first time. Proven here rather than
      asserted in a comment, because a claim about two files agreeing is exactly the kind that goes
      stale in one of them.

      The consumers are what "agree" means, so they are the list: `RosterMember`,
      `RosterEntryFlags`, `RoomSidebar`'s entry generic and `userActions.targetFor` between them
      read these. A field either source stops sending breaks a roster the other source filled.
    */
    const READ_BY_THE_SIDEBAR = [
      'id',
      'displayName',
      'avatarUrl',
      'email',
      'emailHash',
      'role',
      'status',
      'userXrefID',
      'isP',
      'isFT',
      'hasAdminChat',
      'locStr'
    ];

    const pageLoad = readFileSync('src/routes/+page.server.ts', 'utf8');
    const from = pageLoad.indexOf('const connectedUser = {');
    expect(from, 'the page load must still build a connectedUser').toBeGreaterThan(-1);

    const frames = listen(rosterUser(13, true));
    publishRosterToRoom(ROOM);
    const fromHub = Object.keys(lastRoster(frames)[0]);

    for (const field of READ_BY_THE_SIDEBAR) {
      expect(fromHub, `the hub must send ${field}`).toContain(field);
      expect(
        pageLoad.slice(from).includes(`${field}:`),
        `the page load must send ${field}, or the sidebar breaks depending on which source filled it`
      ).toBe(true);
    }
  });

  it('carries no `createdAt`, which nothing ever read', () => {
    /*
      Named rather than left to the sweep above, because this one was not a redaction decision — it
      was a field written once and consumed by nobody: not `RosterMember`, not `RosterEntryFlags`,
      not `RoomSidebar`'s generic, not `targetFor`. Deleted rather than blanked, because there is no
      reader to redact for.
    */
    const frames = listen(rosterUser(12, true));
    publishRosterToRoom(ROOM);
    for (const entry of lastRoster(frames)) {
      expect(entry).not.toHaveProperty('createdAt');
    }
  });
});

describe('no route publishes the raw roster around the hub', () => {
  /*
    The executable half above proves the hub redacts. This half proves nothing BYPASSES it — a new
    endpoint calling `publishToRoom(..., { cmd: 'getRoster', users: roomRoster(room) })` would
    reintroduce the leak with every assertion above still green, because those only inspect what the
    hub itself sends.
  */
  const tracked = execSync("git ls-files 'src/**'", { encoding: 'utf8' }).trim().split('\n');
  const serverModules = tracked.filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts')
  );

  it('only `room-events.ts` itself constructs a getRoster frame', () => {
    const offenders: string[] = [];
    for (const file of serverModules) {
      if (file === 'src/lib/server/room-events.ts') continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        // `getRosterCount` is a number and carries nothing private; it is deliberately allowed.
        if (line.includes("cmd: 'getRoster'") && !line.includes('getRosterCount')) {
          offenders.push(`${file}:${index + 1} — ${line.trim().slice(0, 90)}`);
        }
      });
    }

    expect(
      offenders,
      `${offenders.join('\n')}\n\nBuild the frame in room-events.ts, where the subscriber map knows who each recipient is. A getRoster frame assembled anywhere else cannot redact locStr per recipient, which is the defect of 2026-08-18: the roster went out identical to everyone and only the browser declined to draw the city.`
    ).toEqual([]);
  });

  it('and `roomRoster` is not exported into a route that could publish it raw', () => {
    /*
      Weaker than the check above on purpose — `roomRoster(room).length` is a legitimate and common
      call for the count. This asserts only that no route pairs the full roster with a publish.
    */
    const offenders: string[] = [];
    for (const file of serverModules) {
      if (!file.startsWith('src/routes/')) continue;
      const text = readFileSync(file, 'utf8');
      if (/publishToRoom\([^)]*roomRoster\(room\)(?!\.length)/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
