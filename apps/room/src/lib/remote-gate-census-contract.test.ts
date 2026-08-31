import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * ── EVERY REMOTE FUNCTION IS GATED, AND A NEW ONE CANNOT SHIP WITHOUT SAYING HOW ───────────────
 *
 * A `*.remote.ts` file is a door. SvelteKit exposes each `query` and `command` it exports as an
 * HTTP endpoint the browser can call directly, so a file that forgets its gate is not a component
 * that renders the wrong thing — it is an unauthenticated route into a multi-tenant fintech
 * application, and nothing about the page that stopped drawing the button would prevent it.
 *
 * That is the 2026-08-07 escalation's shape, and this repository has met it from two other
 * directions already. `authority-gate-contract.test.ts` records a control rendered for members whose
 * server call refused them — a gate that WORKED and a render that did not. `roster-privacy.test.ts`
 * records the reverse: a wire that carried `locStr` and `email` to every subscriber while the
 * sidebar politely declined to draw them. Between those two lies the case neither can see: **a door
 * with no gate at all.** Nothing renders wrong, nothing leaks through a wire anybody reads, and the
 * endpoint answers whoever asks.
 *
 * ## Measured before it was written, which is why it is a census and not a hope
 *
 * All 35 files present on 2026-08-31 call at least one gate. This file does not fix a defect; it
 * makes the absence of one checkable, on every run, for every file added afterwards. A guard written
 * the day a thing is already true is the cheapest one there is.
 *
 * ## Deny by default, and stated as a VOCABULARY rather than a pattern
 *
 * The gates are named, from `server/auth.ts`. A regex for "some call that looks authoritative" would
 * be satisfied by any function whose name happened to start with `require`, including one a future
 * file defines locally and that checks nothing. Naming them means a NEW gate has to be added here
 * deliberately, which is the moment somebody reads what it actually proves.
 *
 * ## What this does NOT claim
 *
 * That the gate on each door is the RIGHT one. `presenterRoom()` on a member-facing query would pass
 * here and be wrong; so would `requireUser()` alone on something that should be presenter-only. That
 * judgement belongs to each door's own contract test, and several exist. This asserts the one thing
 * a census can: that no door was shipped with none.
 */

const ROUTES = fileURLToPath(new URL('../routes/', import.meta.url));

/**
 * The gates, and what each one PROVES — because "it calls something from auth.ts" is not a rule.
 *
 * `presenterRoom()` is the strong one and the pair is why: it answers *which room* from the session
 * while proving the caller may command it, so a presenter of room A cannot name room B. Handed out
 * separately those two become separable, and applying only the first is exactly the escalation.
 */
const GATES = [
  /** Proves the caller may command, AND which room — one call, so the two cannot come apart. */
  'presenterRoom()',
  /** Proves a presenter, without answering which room. Pair it with the room from the session. */
  'requirePresenter(',
  /** Proves the room this session is in. Not an authority on its own; scopes one. */
  'requireRoomShortCode(',
  /** Proves there is an authenticated account behind the call. */
  'requireUser(',
  /** Proves the session id, for the paths that address a connection rather than a person. */
  'requireSessionId(',
  /** Proves the named account is a member of the named room — the tenancy check, per target. */
  'requireRoomMember('
] as const;

const files = globSync('*.remote.ts', { cwd: ROUTES }).sort();

/**
 * Doors that answer with ANOTHER account's private details, which must be presenter-only.
 *
 * Declared by name rather than inferred. There is no way to tell from source text that a query
 * returns somebody else's address, so this list is a claim a reader can check and a reviewer can
 * challenge — and a new door of the same kind is added here by the person who knows it is one.
 */
const ANOTHER_ACCOUNTS_DETAILS = [
  /** `email`, `loggedIn`, and since 2026-08-31 the live connection's `ip` and `userAgent`. */
  'user-detail.remote.ts',
  /** The admin notes kept ABOUT a member, which the member cannot see. */
  'user-notes.remote.ts',
  /** Who was in the room and when. */
  'session-history.remote.ts',
  /** Every member's per-room permission bits. */
  'permissions.remote.ts'
] as const;

describe('the remote-function census', () => {
  it('found doors to check at all', () => {
    /*
      The vacuity floor, and it is the one that matters most here: `globSync` returning nothing would
      make every assertion below pass over an empty list, reporting that every door is gated because
      there are no doors. 30 is well under the 35 present when this was written and well over any
      plausible deletion.
    */
    expect(files.length, 'no *.remote.ts files were discovered').toBeGreaterThan(30);
  });

  it('names only gates that exist', () => {
    /*
      The second vacuity floor. A renamed export would leave every needle below matching nothing, and
      "no file calls any gate" and "the vocabulary is stale" are the same result read two ways. This
      makes the second one fail loudly instead.
    */
    const auth = readFileSync(fileURLToPath(new URL('./server/auth.ts', import.meta.url)), 'utf8');
    for (const gate of GATES) {
      const declared = gate.replace(/\($|\(\)$/, '');
      expect(auth, `${declared} is no longer exported from auth.ts`).toContain(
        `export function ${declared}(`
      );
    }
  });

  it('gates every single one', () => {
    /*
      Read from CODE, not the raw file. Several of these carry long docblocks quoting the gate they
      describe — `debug-log.remote.ts` explains `presenterRoom()` at length in prose — so a raw
      search would pass for a file that only TALKS about being gated.
    */
    const ungated = files.filter((file) => {
      const code = codeOf(file, readFileSync(`${ROUTES}${file}`, 'utf8'));
      return !GATES.some((gate) => code.includes(gate));
    });

    expect(
      ungated,
      `these remote files call no gate at all. Every export in a *.remote.ts is an HTTP endpoint the ` +
        `browser can call directly, so a door with no gate answers whoever asks — the page that ` +
        `stopped drawing the button does not stop the call. Add the gate the door needs, from ` +
        `server/auth.ts; if a door is deliberately open (debug-log's reply is, because the ` +
        `authority is that somebody ASKED), it still calls requireUser and requireRoomShortCode to ` +
        `know who and where.`
    ).toEqual([]);
  });

  it('makes the doors onto another account’s details presenter-only', () => {
    /*
      The one judgement this file does make, because it is the one with a blast radius: these four
      answer with data about somebody who is not the caller. `presenterRoom()` and nothing weaker —
      `requireUser()` alone would let any authenticated member ask about any other, and
      `requireRoomShortCode()` alone would scope the room without proving the role.
    */
    for (const file of ANOTHER_ACCOUNTS_DETAILS) {
      expect(files, `${file} is listed here but does not exist`).toContain(file);
      const code = codeOf(file, readFileSync(`${ROUTES}${file}`, 'utf8'));
      expect(
        code,
        `${file} answers with another account's details and is not presenter-only`
      ).toContain('presenterRoom()');
    }
  });

  it('keeps the room out of the argument list on those doors', () => {
    /*
      `presenterRoom()` takes the room from the SESSION. A door that also accepted one as an argument
      would hand the caller a choice between them, and the reference does exactly that — it sends
      `rid` from `globals.sessData.roomID`, a client-held value naming which room to ask about. One
      of these four taking a `room` or `shortCode` field would be that same door reopened.
    */
    for (const file of ANOTHER_ACCOUNTS_DETAILS) {
      const code = codeOf(file, readFileSync(`${ROUTES}${file}`, 'utf8'));
      for (const argument of ['room:', 'shortCode:', 'roomId:', 'roomID:']) {
        expect(
          code.includes(`${argument} z.`),
          `${file} accepts ${argument} as an argument; the room must come from the session`
        ).toBe(false);
      }
    }
  });
});
