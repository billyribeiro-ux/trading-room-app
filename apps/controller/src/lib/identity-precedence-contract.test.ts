import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  THE AUTHENTICATED SESSION IS THE IDENTITY, AND A FORM FIELD MAY NOT OVERRULE IT.

  ## The defect this was written for, found 2026-09-01

  `(public)/session/[code]/+page.server.ts` resolved the entering member's email as:

      const email = String(form.get('email') ?? locals.user?.email ?? storedIdentity?.email ?? '')

  A CLIENT-SUPPLIED FIELD, ahead of the authenticated controller session. The same file's `load`
  states the opposite rule in as many words — *"The authenticated controller session is the identity
  authority. A remembered room guest is only a fallback; it must never replace the account that just
  launched the room from the controller"* — so the comment and the line underneath it disagreed, and
  the line is what runs.

  That is the shape of the 2026-08-07 privilege escalation, which CLAUDE.md names and forbids:
  **every authority decision is made on the server from data the server owns, never asserted by the
  client.** The email reaching `decideRoomEntry` decides which member enters, which room rules apply
  to them, and which identity the room is handed.

  ## And a second defect in the same expression

  `??` only falls through on `null`/`undefined`. A submitted-but-BLANK field is `''`, a real value,
  so `email=` alone stopped the chain and produced an empty identity for a signed-in account. The
  fix uses `||`, which falls through on the empty string too.

  ## Why a source contract and not a behavioural one

  The subject is an ORDER OF PRECEDENCE inside one expression. A behavioural test would need a
  request, a session, a cookie and a database, and would still pass if the expression were rewritten
  to read the form first in a case the fixture did not cover. Reading the expression asserts the rule
  itself, which is what the next reader has to get right.

  The anonymous path is asserted too, and it is the reason this cannot simply drop the form field:
  a guest who has not authenticated HAS no `locals.user`, and their typed email is the only identity
  there is.
*/

const ROUTE = 'src/routes/(public)/session/[code]/+page.server.ts';
const source = readFileSync(ROUTE, 'utf8');

/**
 * THE resolution line — the one in the ACTION, not the one in the cookie helper.
 *
 * `source.split('\n').find(l => l.includes('const email ='))` finds the WRONG one: a
 * `parseStoredIdentity` helper at the top of the file declares `const email = String(parsed.email)`
 * forty lines before the action does, so the first match is a line that reads no session at all and
 * every assertion below reported `-1`. Anchored on `locals.user` instead, which only the action's
 * line contains, and asserted to be unique so a second reader of the session cannot appear without
 * this file noticing.
 */
const resolutionLine = (code: string) => {
  const lines = code.split('\n').filter((line) => line.includes('const email =') && line.includes('locals.user'));
  return lines;
};

/**
 * The file with comments removed.
 *
 * Load-bearing, and the repository has paid for its absence eight times: this file's own docblock
 * quotes the DEFECTIVE expression verbatim two paragraphs up, and every assertion below would match
 * that quotation instead of the code. A check whose subject is the prose describing it is a check
 * that passes forever.
 */
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

describe('the identity the room is handed', () => {
  it('reads the route, and the route still resolves an email', () => {
    /* The floor: a moved file or a renamed variable would make every assertion below vacuous. */
    expect(code).toContain('const email =');
    expect(code.length).toBeGreaterThan(2000);
  });

  it('puts the AUTHENTICATED SESSION first, ahead of anything the client sent', () => {
    const lines = resolutionLine(code);
    expect(lines, 'exactly one line resolves the entering identity from the session').toHaveLength(1);
    const line = lines[0];

    const session = line.indexOf('locals.user?.email');
    const typed = line.indexOf('typedEmail');

    expect(session, 'the authenticated session must be read here').toBeGreaterThan(-1);
    expect(typed, 'the typed field must still be read, for anonymous guests').toBeGreaterThan(-1);
    expect(
      session,
      'A client-supplied form field is ordered ahead of the authenticated controller session. ' +
        "That is the 2026-08-07 privilege escalation's shape, and this file's own `load` docblock " +
        'forbids it: the session is the identity authority. Put `locals.user?.email` first.'
    ).toBeLessThan(typed);
  });

  it('falls through a BLANK submitted field rather than accepting it as an answer', () => {
    const line = resolutionLine(code)[0];
    expect(
      line.includes('||'),
      '`??` only falls through on null/undefined, so a submitted-but-blank `email=` is a real ' +
        'value that stops the chain and hands an EMPTY identity to `decideRoomEntry` for a ' +
        'signed-in account. Use `||`.'
    ).toBe(true);
    expect(line, 'the nullish operator must not decide this chain').not.toMatch(/\?\?\s*locals\.user/);
  });

  it('still admits an anonymous guest, whose typed email is the only identity there is', () => {
    /*
      The half a "just trust the session" fix would break. `ROOM_BASE_URL` blank means this
      repository IS the room and this form renders; a guest has no `locals.user` at all.
    */
    expect(code).toContain('typedEmail');
    expect(code).toContain("form.get('email')");
  });

  it('hands that email to the ONE decision function rather than re-deciding here', () => {
    /* `decideRoomEntry` is where the room's rules live; a second copy is how one of them drifts. */
    expect(code).toContain('decideRoomEntry(');
    expect(code).toMatch(/decideRoomEntry\(settings,\s*\{[\s\S]{0,200}?email,/);
  });
});
