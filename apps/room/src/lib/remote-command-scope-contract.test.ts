import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  EVERY REMOTE COMMAND DECIDES ITS TENANT ON THE SERVER, OR SAYS WHY IT DOES NOT NEED TO.

  ## The gap this closes, found by a negative control that came back GREEN

  `session-commands.remote.ts` was written on 2026-08-26 with `presenterRoom()` on both commands. To
  check the guards, `publishRosterToRoom(presenterRoom())` was mutated to
  `publishRosterToRoom('some-other-room')` — removing the presenter check AND the tenant scope in one
  line, so a member of any room could have rebuilt a roster in a room they had never joined.

  **Nothing failed.** Not `authorization-contract`, not `room-isolation-contract`, not the 2,860-test
  suite. The reason is the shape this repository has now paid for three times in one day:
  `authorization-contract` reads THREE remote modules by name — `chat-messages`, `alert-questions`,
  `post-alert` — so a nineteenth module is covered by nobody, and a twentieth will be too.

  That is the same failure as the orphan gate policing `+page.svelte` plus one directory, and as
  `ACTS` in the disposition contract listing markers by hand. A list of files is a record of where
  somebody last looked.

  ## What is asserted

  Every `export const … = command(` in every `src/routes/*.remote.ts`, DISCOVERED from disk, either

    * establishes the room on the SERVER — `presenterRoom()` or `requireRoomShortCode(...)` — so the
      tenant comes from the session and never from an argument; or
    * is declared below as scoping to the CALLER'S OWN ACCOUNT instead, with the reason.

  There is no third answer, and a command that matches neither fails with its own name. That is the
  2026-08-07 privilege escalation expressed as a gate rather than as a paragraph: the failure mode of
  a command that takes its room from the client is one tenant reading — or writing into — another's.

  ## Why the room-scoping call and not the effect

  Because the effect is unbounded and the entry point is not. A command can publish, write, read or
  delegate, and enumerating those is another hand-kept list; but every one of them needs to know
  WHICH ROOM first, and there are exactly two server-owned ways to answer that. Asserting the answer
  is present is cheap, total, and cannot be satisfied by accident.

  What it does NOT catch is stated rather than implied: a command that calls `presenterRoom()` and
  then ignores it, publishing to a room from an argument anyway. That needs the value traced, not the
  call spotted. The negative control below therefore mutates the CALL — which is the shape the real
  mistake takes, because the argument is usually removed as a whole line.
*/

const REMOTE_DIR = 'src/routes';

const REMOTE_MODULES = readdirSync(REMOTE_DIR)
  .filter((name) => name.endsWith('.remote.ts'))
  .map((name) => `${REMOTE_DIR}/${name}`);

/**
 * The two server-owned ways a command learns its room.
 *
 * Both READ THE SESSION. Neither takes a room from the caller, which is the whole property: a
 * `roomShortCode` on any command's argument would let a presenter of room A act on room B, so no
 * command has one.
 */

/**
 * Helpers that establish the room on a command's behalf, and what each must itself contain.
 *
 * ## Why this is a map and not three more strings in the list above
 *
 * `roomForAvatarChange` joined `ROOM_SCOPING` on 2026-08-29, when the two profile-picture commands
 * stopped calling `presenterRoom()` directly: the capture has TWO authorities for an avatar — a
 * presenter setting anyone's, and any member setting their own — and expressing that twice was how
 * one of them would end up spelled differently.
 *
 * **Adding the name alone would have made this gate weaker than it looks.** A command would then
 * satisfy it by calling any function with that name, whatever the function did — which is precisely
 * the failure the docblock above says this file cannot see, arriving by the front door. So an
 * indirection is admitted only with the terms its own body has to contain, and `every scoping
 * helper is real` below checks them.
 *
 * The chain the two assertions make is what matters: the command reaches the room only through the
 * helper, and the helper reaches it only through the session.
 */
const SCOPING_HELPERS: Readonly<Record<string, readonly string[]>> = {
  roomForAvatarChange: [
    // The presenter path: role first, then the target's membership of the room the role is in.
    'presenterRoom()',
    'requireRoomMember(targetUserId, room)',
    // The self path: scoped to a room, and reached only by an id the SERVER read from the session.
    'requireRoomShortCode(locals)',
    'requireUser(locals).id === targetUserId'
  ],
  /*
    The Admin Notes helper, and it is the first with THREE checks rather than two — the third is a
    password. `presenterRoom()` and `requireRoomMember` are the same pair `roomForAvatarChange` uses
    and for the same reason: these commands write a durable row keyed on the target alone, which no
    subscriber map bounds. `requireNotesAccess` is the one that is new, and it is required HERE
    rather than trusted from the client, because the room's own `canManage` is a flag the room owns.
  */
  /*
    The chat archive's channel check. `presenterRoom()` is the room and the role; the second term is
    the one that makes this an indirection worth admitting rather than a bare call — the channel is a
    name the CALLER chose, and `memberChatChannels` is the only thing that says which names this
    account holds. A helper that took the room and skipped that would let a presenter sweep a badge
    channel they cannot see.
  */
  presenterChannel: [
    'presenterRoom()',
    'memberChatChannels(request, room, user)',
    'isMemberChatChannel(allowed, channel)'
  ],
  roomForNotesOn: [
    'presenterRoom()',
    'requireRoomMember(subjectUserId, room)',
    'requireNotesAccess(room, requireSessionId(getRequestEvent().locals))'
  ]
};

/**
 * The two direct calls, plus every admitted indirection — DERIVED, not listed again.
 *
 * It was listed again until 2026-08-29, and the second entry was already the third place a helper's
 * name had to be written: once where it is defined, once in the map above, once here. A name that
 * must be added in three places is a name that gets added in two, and the failure is silent in the
 * direction that matters — the command looks unscoped and the gate says so, which is at least loud.
 * The reverse, a name here with no entry above, would admit an indirection with no requirements at
 * all, and that is the hole this map exists to close.
 */
const ROOM_SCOPING = [
  'presenterRoom()',
  'requireRoomShortCode(',
  ...Object.keys(SCOPING_HELPERS).map((helper) => `${helper}(`)
];

/**
 * Commands that scope to the CALLER'S OWN ACCOUNT rather than to a room.
 *
 * A real second category, not an escape hatch: a viewer's theme is not a property of any room, and
 * forcing a room lookup into it would invent a constraint the data does not have. Each entry says
 * what bounds it instead, and `every entry is real` below fails if one stops being true.
 */
const PER_VIEWER_COMMANDS: Readonly<Record<string, string>> = {
  saveTheme:
    'a viewer preference on their own account — `requireUser(locals).id`, no target on the argument',
  savePreference:
    'a viewer preference on their own account — `requireUser(locals).id`, no target on the argument',
  editUsername:
    'renames an ACCOUNT, not a room membership. Bounded by `actor.id !== userId && !isPresenterRole(actor.role)`, which is a stricter test than a room scope would be'
};

/** Every `export const NAME = command(` in a module, with the body up to the next export. */
const commandsIn = (file: string): { name: string; body: string }[] => {
  const source = readFileSync(file, 'utf8');
  const found: { name: string; body: string }[] = [];
  const pattern = /export const (\w+) = command\(/g;
  const starts = [...source.matchAll(pattern)];
  for (let i = 0; i < starts.length; i++) {
    const at = starts[i].index;
    const end = i + 1 < starts.length ? starts[i + 1].index : source.length;
    found.push({ name: starts[i][1], body: source.slice(at, end) });
  }
  return found;
};

describe('every remote command decides its tenant on the server', () => {
  it('finds the modules and the commands it is meant to police', () => {
    /*
      Both floors, because either collapsing to zero makes the sweep below pass by covering nothing —
      which is precisely the failure this file was written about, one level up.

      19 modules carrying 37 commands were counted on 2026-08-26. The floors sit below that so
      ordinary work can move a file without a false alarm, and far enough above zero that a broken
      `readdirSync` filter or a changed `export const` shape cannot hide.
    */
    expect(REMOTE_MODULES.length, 'the walk found no .remote.ts modules').toBeGreaterThan(12);
    const all = REMOTE_MODULES.flatMap(commandsIn);
    expect(all.length, 'the command pattern matched nothing').toBeGreaterThan(25);
  });

  it.each(REMOTE_MODULES)('%s scopes every command it exports', (file) => {
    const unscoped = commandsIn(file)
      .filter(({ name }) => !(name in PER_VIEWER_COMMANDS))
      .filter(({ body }) => !ROOM_SCOPING.some((marker) => body.includes(marker)))
      .map(({ name }) => name);

    expect(
      unscoped,
      `These commands never establish a room on the server. A command that does not read the tenant ` +
        `from the SESSION either acts on no room — declare it in PER_VIEWER_COMMANDS with what ` +
        `bounds it instead — or it takes the tenant from its caller, which is the 2026-08-07 ` +
        `privilege escalation:\n  ${unscoped.join('\n  ')}`
    ).toEqual([]);
  });

  it('every PER_VIEWER_COMMANDS entry is real: still exported, and still not room-scoped', () => {
    /*
      The exemptions rot in both directions. A command that is deleted leaves an entry granting
      permission to nothing; one that LATER gains a room scope leaves an entry claiming it has none,
      and the next reader trusts it. Either way the list stops describing the code, which is how a
      list becomes a lie.
    */
    const all = REMOTE_MODULES.flatMap(commandsIn);
    const stale: string[] = [];
    for (const name of Object.keys(PER_VIEWER_COMMANDS)) {
      const found = all.find((entry) => entry.name === name);
      if (!found) {
        stale.push(`${name} — no longer exported by any .remote.ts`);
        continue;
      }
      if (ROOM_SCOPING.some((marker) => found.body.includes(marker))) {
        stale.push(`${name} — now room-scoped, so the exemption is obsolete`);
      }
    }
    expect(stale, `Stale PER_VIEWER_COMMANDS entries:\n  ${stale.join('\n  ')}`).toEqual([]);
  });

  it('every scoping helper is real, so the indirection cannot become a hole', () => {
    /*
      The other half of admitting a helper to `ROOM_SCOPING`. Without this, a command satisfies this
      file by calling a function with the right NAME — and the docblock at the top already records
      that a name is not what this gate is about.

      Each helper is located in whichever module defines it and checked for the terms that make it a
      scoper. A helper that stopped reading the session, or started taking a room from an argument,
      fails here rather than in a tenant's room.
    */
    for (const [helper, required] of Object.entries(SCOPING_HELPERS)) {
      const definer = REMOTE_MODULES.map((file) => readFileSync(file, 'utf8')).find((source) =>
        source.includes(`function ${helper}(`)
      );
      expect(definer, `${helper} is in ROOM_SCOPING but nothing defines it`).toBeDefined();

      const from = (definer ?? '').indexOf(`function ${helper}(`);
      expect(from, `${helper} is not a function of the module that mentions it`).toBeGreaterThan(
        -1
      );
      const next = (definer ?? '').indexOf('\nexport ', from);
      const body = (definer ?? '').slice(from, next === -1 ? undefined : next);

      for (const term of required) {
        expect(body, `${helper} no longer contains ${term}`).toContain(term);
      }
      expect(body, `${helper} takes a room from its caller`).not.toContain('roomShortCode:');
    }
  });
});
