import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  A ROW WITH NO PASSWORD HASH MAY NEVER ACQUIRE ONE.

  ## What this guards, and why it is a source test

  The runtime proof lives in `password-reset.db.test.ts` — "a member record cannot be turned into a
  login" — which builds the attacker's row by calling `inviteRoomUser`, tries the reset, and reads
  the row back out of a real PostgreSQL. That is the real evidence, and its negative control has been
  seen red on the right assertion.

  It cannot run in CI. `vite.config.ts` excludes `*.db.test.ts` because the runner has no `initdb`,
  so the strongest test of this rule is also the one that is not standing guard on merges. This file
  is the half that does: it fails if either predicate is deleted, which is the realistic regression —
  somebody simplifying a WHERE clause that looks over-specified.

  It is deliberately narrow about what it reads. Both assertions extract the enclosing function's
  own body first and search only inside it, because a match anywhere in a 300-line module would pass
  even after the guard moved somewhere it does nothing.

  ## The rule

  `inviteRoomUser` files invited room members as `users` rows carrying the ROOM OWNER's `accountId`
  and a null `passwordHash`. `schema.ts` calls such a row "a member record, not a login" and
  `verifyPassword` refuses it outright. There is no per-user role column, so `requireOwnedRoom`
  admits any session whose `accountId` matches — meaning a member record that could ever authenticate
  would be a peer of the account owner, across every room the account has.
*/

/**
 * The text between a named declaration and its own closing brace, so a match cannot drift.
 *
 * The terminator is `}` followed by a NEWLINE, and that detail is the whole correctness of this
 * helper rather than a stylistic choice. A first draft searched for `\n}` and was wrong about the
 * code in the way this repository forbids reporting: `setPasswordFromReset`'s parameter is an inline
 * type literal, so five lines into the declaration there is a column-zero `}` — in `}): Promise<…> {`
 * — and the extracted "body" was the argument list. The assertion below then failed against correct
 * code, which is a manufactured defect, not a finding. `}` + newline does not match that line
 * because a `)` follows it, and it does match the real close.
 */
function bodyOf(source: string, declaration: string): string {
  const start = source.indexOf(declaration);
  expect(start, `${declaration} is no longer in this file — the anchor moved, not the rule`).toBeGreaterThan(-1);
  const end = source.indexOf('\n}\n', start);
  expect(end, `${declaration} has no top-level close, so this test would read the rest of the file`).toBeGreaterThan(
    start
  );
  return source.slice(start, end);
}

describe('the password-reset write refuses rows that cannot authenticate', () => {
  const auth = readFileSync('src/lib/server/auth.ts', 'utf8');

  it('setPasswordFromReset carries the guard inside its own WHERE', () => {
    const body = bodyOf(auth, 'export async function setPasswordFromReset');

    expect(
      body.includes('isNotNull(users.passwordHash)'),
      "setPasswordFromReset must exclude null-hash rows in the UPDATE's own WHERE. Without it, " +
        'redeeming a reset link sets a password on an invited member record and reset-password then ' +
        "calls createLoginSession — handing that person the room owner's whole account, because " +
        'requireOwnedRoom gates on accountId and no per-user role exists. See the docblock above it ' +
        'and the runtime proof in password-reset.db.test.ts.'
    ).toBe(true);
  });

  it('verifyPassword still refuses a null hash — the other half of the same invariant', () => {
    /*
      Executable rather than read, because it can be: this one needs no database. If it ever returns
      true the WHERE clause above becomes the only thing left standing.
    */
    const body = bodyOf(auth, 'export function verifyPassword');
    expect(body.includes('if (!stored) return false'), 'a null hash must short-circuit to false').toBe(true);
  });
});

describe('the password-reset request declines to send a member record a link', () => {
  it('forgot-password gates the send on a non-null hash', () => {
    /*
      The second fence, and the lesser one — it withholds a lure rather than being the boundary. It
      matters anyway: a "set a new password" mail to somebody who has merely been invited to a room
      is an invitation to try, and it costs nothing to not send it.

      The response is unchanged either way. This branch falls through to the same GENERIC_REQUEST_ACK
      as "no account" and "inside the cooldown", so it adds no enumeration oracle — which it would if
      it answered differently, by distinguishing invited people from strangers.
    */
    const source = readFileSync('src/routes/(public)/forgot-password/+page.server.ts', 'utf8');

    expect(
      source.includes('user.passwordHash !== null'),
      'the send must be gated on the row being able to authenticate'
    ).toBe(true);

    expect(
      source.includes('passwordHash: users.passwordHash'),
      'and the column has to be selected, or the gate above reads undefined and admits everything'
    ).toBe(true);
  });
});
