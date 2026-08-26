import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  A BAN THAT LANDS MID-SESSION ENDS THE SESSION, SERVER-SIDE.

  ## Why this file exists at all

  It does not guard a defect. It guards a CLAIM THAT WAS WRONG, which had been written down and was
  on its way to being built.

  `TODO.md` row 9 carried, as the last unbuilt item of the `privCmdsIn` sweep:

      **`i.banned && emit("logout")`** on the broadcast switch (byte 1010700) is still unbuilt —
      a banned member is disconnected but not logged out

  Both halves of that are false, and reading settled it in two steps.

  **The reference's emit goes nowhere.** `logout` occurs EXACTLY ONCE in the whole 2,891,205-byte
  bundle, case-insensitively, and that occurrence is the emit itself:

  ```js
  case "kickUser": i.xrefID == this.globals.user.userXrefID && (
    this.appEventBus.emit("kickPage", i.msg),
    i.banned && this.appEventBus.emit("logout"),
    this.disconnect());
  ```

  There is no `subscribe("logout")`, no `signOut`, nothing. Upstream fires an event with no listener,
  so "reproducing" it faithfully would mean writing a line that does nothing — and building a real
  logout on the strength of it would be inventing behaviour the evidence does not show.

  **Ours already logs them out, and does it somewhere a client cannot argue with.** `+page.server.ts`
  ends the session on the next load, and the comment above it already said so:

  ```ts
  if (isBannedFromRoom(roomConfig.member) || isShutOutByRoomState(...)) {
    logout(cookies); locals.user = null; locals.sessionId = undefined; redirectSignedOut();
  }
  ```

  That is strictly stronger than the capture. An emit in the browser is advice a modified client can
  decline; destroying the session row and clearing the cookie is not. The 2026-08-07 rule — authority
  decided on the server, from data the server owns — is the reason it belongs there and not in a
  frame handler.

  ## So what is asserted

  The behaviour, not the absence. Row 9 was the FIFTH recorded blocker in this sweep to be false, and
  every one of them was false in the same way: it described the repository from memory rather than
  from the repository. A row can be corrected once and drift back. A test cannot.

  Deliberately NOT asserted: that no `logout` frame handler exists. Adding one later would be
  harmless duplication, and a test forbidding it would be guarding a preference.
*/

const PAGE_SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const SESSION_SERVER = readFileSync(
  new URL('../routes/session/+page.server.ts', import.meta.url),
  'utf8'
);

/**
 * The `load` guard, sliced from its condition to the end of its block.
 *
 * Asserted found before anything is read out of it: a `slice` from `indexOf(...) === -1` starts at
 * the end of the file and returns the empty string, and every `toContain` below would then pass
 * against nothing. That is the vacuity failure this suite polices elsewhere and it applies here.
 */
const banGuard = (): string => {
  const at = PAGE_SERVER.indexOf('if (\n    isBannedFromRoom(roomConfig.member) ||');
  expect(
    at,
    'the ban guard is no longer in +page.server.ts in the shape this reads'
  ).toBeGreaterThan(-1);
  const end = PAGE_SERVER.indexOf('\n  }', at);
  expect(end, 'the guard must close at two-space indent').toBeGreaterThan(at);
  return PAGE_SERVER.slice(at, end);
};

describe('a ban that lands mid-session ends the session', () => {
  it('destroys the session on the next load rather than trusting a frame', () => {
    const guard = banGuard();

    /*
      All four, because three of them leave a hole. `logout(cookies)` deletes the row and clears the
      cookie; the two `locals` writes stop THIS request continuing to serve a page as the banned
      account after the deletion; and the redirect is what the visitor actually experiences. Dropping
      the `locals` pair is the subtle one — the session is gone from the database and the request in
      flight still has a populated user, so the rest of `load` would run for somebody who no longer
      has a session at all.
    */
    expect(guard).toContain('logout(cookies)');
    expect(guard).toContain('locals.user = null');
    expect(guard).toContain('locals.sessionId = undefined');
    expect(guard).toContain('redirectSignedOut()');
  });

  it('logs out BEFORE it redirects, so the redirect cannot skip the teardown', () => {
    const guard = banGuard();
    /*
      `redirectSignedOut` THROWS — it is a SvelteKit redirect. Anything after it never runs, so the
      order here is not style: putting the redirect first would leave the cookie live and the session
      row intact, and the ban would last exactly until the member navigated back.
    */
    expect(guard.indexOf('logout(cookies)')).toBeLessThan(guard.indexOf('redirectSignedOut()'));
  });

  it('covers the room CLOSING under somebody by the same path', () => {
    // One guard, two reasons. A member of a room that shut is in the same position as a banned one:
    // the session is no longer entitled to the page, and the next load is where that is noticed.
    expect(banGuard()).toContain('isShutOutByRoomState(roomConfig.room.state, roomConfig.member)');
  });

  it('refuses a banned member at the door as well, so re-entry is not the hole', () => {
    /*
      The second half of the answer, and the reason the logout is enough on its own. Ending the
      session would be cosmetic if the member could simply hand their token back in at `/session`.
      They cannot: the handoff verifier refuses them before a session is ever issued.
    */
    expect(SESSION_SERVER).toContain('if (isBannedFromRoom(membership)) {');
    expect(SESSION_SERVER).toContain("error(403, 'You do not have access to this room.')");
  });
});
