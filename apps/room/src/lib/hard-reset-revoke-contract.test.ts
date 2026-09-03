import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DEAD_PREFERENCE_KEYS } from './dead-preference-keys.js';
import { codeOf } from './source-comments.js';

/**
 * "Hard Reset" and "Hard Reset and Revoke Tokens" — two menu entries that did the same thing.
 *
 * ## What was measured on 2026-09-03
 *
 * Upstream has ONE command and two callers, bytes 2,169,105 and 2,169,459:
 *
 * ```js
 * hardReset()          { confirm(…) → sendServerAdminCommand("hardResetSession", {revoke: !1}) }
 * hardResetAndRevoke() { confirm(…) → sendServerAdminCommand("hardResetSession", {revoke: !0}) }
 * ```
 *
 * The whole difference between the two controls is that boolean. This room sent neither: the
 * handler wrote `savePreference('sessionTokensRevoked', …)` into the clicking presenter's own
 * settings blob and called `hardReset()` with no argument, **so the two entries were one control
 * wearing two labels.**
 *
 * `sessionTokensRevoked` had **zero readers anywhere in `apps/room/src`**, and it is not upstream's
 * name either — **zero occurrences in the 2,891,205-byte bundle**. This room invented a key for a
 * value that was never meant to be stored.
 *
 * ## How it was found, which is the part worth keeping
 *
 * Not by a gate. By reading the session's own diff the way `CLAUDE.md`'s "Before saying done"
 * section asks — *"every comment claiming X is bounded/constant/checked still matches the next
 * line"*. The docblock said **"it is read by the next page load either way"**, and that sentence was
 * the only evidence the write stood on. It is the fourth key of this family found this week and the
 * second false docblock; `R-4`'s blocker collapsed the same way, on a comment asserting its own
 * premise.
 *
 * ## What this file asserts
 *
 * Not that sessions are deleted — `session-limit-contract.test.ts` owns eviction against a real
 * database. That the DISTINCTION cannot silently collapse again:
 *
 *   the flag reaches the server    a command taking no argument is the old bug exactly
 *   both callers pass it           and they pass DIFFERENT values, or the two entries are one
 *   the revoke happens FIRST       a client that reloads on the frame while its row still exists
 *                                  walks straight back in
 *   the caller is spared           a presenter signed out by their own toolbar button
 *   the key is NAMED dead          so the copies already in browsers are evicted
 */

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');

const COMMANDS = read('../routes/session-commands.remote.ts');
const CONTROLS = read('./room/session-room-commands.ts');
const CONTROLS_CODE = codeOf('session-room-commands.ts', CONTROLS);
const BUNDLE = read('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js');

describe('the flag travels', () => {
  it('the command takes it, where it took nothing', () => {
    expect(COMMANDS).toContain(
      'export const hardReset = command(z.object({ revoke: z.boolean() }), async ({ revoke }) => {'
    );
  });

  it('and the two menu entries pass DIFFERENT values', () => {
    /*
      The assertion that would have caught the original defect. Two controls that both call
      `hardReset()` satisfy "the flag travels" the moment one of them passes `true`; what makes them
      two controls is that the value is DERIVED from which one was pressed.
    */
    expect(CONTROLS_CODE).toContain(
      "hardReset({ revoke: action === 'session-hard-reset-revoke' })"
    );
  });

  it('and no preference stands in for it any more', () => {
    /*
      Comment-stripped: the block quotes `savePreference('sessionTokensRevoked', …)` in order to
      record that it went. A raw-source assertion would match the sentence saying so.
    */
    expect(CONTROLS_CODE).not.toContain('sessionTokensRevoked');
  });

  it('and the key is NAMED dead, so a stored copy is evicted', () => {
    expect(DEAD_PREFERENCE_KEYS).toContain('sessionTokensRevoked');
  });
});

describe('what revoke does, and in what order', () => {
  it('deletes the room s sessions BEFORE the frame goes out', () => {
    /*
      Asserted by POSITION, the same property `session-door-contract.test.ts` pins one door over and
      for the same reason: a member whose browser reloads on the frame while their session row still
      exists is admitted again, and the revoke would have reached nobody it was aimed at.
    */
    const at = COMMANDS.indexOf('export const hardReset = command(');
    expect(at, 'hardReset must be findable').toBeGreaterThan(-1);

    const deleteAt = COMMANDS.indexOf('db\n      .delete(sessions)', at);
    const frameAt = COMMANDS.indexOf("cmd: 'hardReset'", at);
    expect(deleteAt, 'the revoke must delete sessions').toBeGreaterThan(at);
    expect(frameAt, 'the frame must be published').toBeGreaterThan(at);
    expect(frameAt, 'the revoke must happen BEFORE the frame').toBeGreaterThan(deleteAt);
  });

  it('is scoped to THIS room and spares the caller', () => {
    /*
      Two bounds, and each is a decision recorded at the command. `roomShortCode` makes it a room act
      rather than an account one — a member of two rooms keeps the other. `ne(sessions.id, …)` keeps
      a presenter from signing themselves out with a button on their own toolbar.
    */
    expect(COMMANDS).toContain(
      "and(eq(sessions.roomShortCode, room), ne(sessions.id, locals.sessionId ?? ''))"
    );
  });

  it('and does NOTHING to any session when revoke is false', () => {
    /*
      The half that keeps "Hard Reset" the lighter of the two. Asserted as the guard rather than by
      running the command, because the delete is one statement and what matters is that it is
      unreachable without the flag — a delete moved outside this `if` would pass every other case in
      this file.
    */
    const at = COMMANDS.indexOf('export const hardReset = command(');
    const guardAt = COMMANDS.indexOf('if (revoke) {', at);
    const deleteAt = COMMANDS.indexOf('.delete(sessions)', at);
    expect(guardAt, 'the delete must sit behind a revoke guard').toBeGreaterThan(at);
    expect(deleteAt).toBeGreaterThan(guardAt);
  });
});

describe('against the pinned bundle', () => {
  it('both upstream callers exist, and differ only in the flag', () => {
    expect(BUNDLE).toContain('sendServerAdminCommand("hardResetSession",{revoke:!1})');
    expect(BUNDLE).toContain('sendServerAdminCommand("hardResetSession",{revoke:!0})');
  });

  it('and sessionTokensRevoked is not upstream s name at all', () => {
    /*
      The measurement that makes the retirement a correction rather than a preference. Every other
      key on `DEAD_PREFERENCE_KEYS` is the reference's own name, kept so an existing member's blob is
      recognised; this one this room invented, for an argument that was never meant to be stored.
    */
    expect(BUNDLE).not.toContain('sessionTokensRevoked');
  });
});
