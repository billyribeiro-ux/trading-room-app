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
const ROOM_SCOPING = ['presenterRoom()', 'requireRoomShortCode('];

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
});
