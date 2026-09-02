import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { modalTargetFromRosterRow } from './room/modal-target.js';
import type { RoomRole } from './server/room-role.js';

/*
  A PREDICATE THAT COMPARES AGAINST A VALUE NOTHING CAN HOLD.

  `modalTargetFromRosterRow` decided the user-info modal's Permissions row with

      permissions: user.role === 'user' ? 'r' : 'a'

  and `RoomRole` is `'admin' | 'staff' | 'member'`. **There is no `'user'`.** The true arm was
  unreachable, every roster-derived target was stamped `'a'` — which the modal renders as
  "Presenter / Admin" — and three further branches downstream were decided by a constant:

    * `ModalHost.svelte:2341`'s membership-star block is gated on `permissions !== 'a'`, so it could
      never render for anybody, for any supply of `years`;
    * `:2371`'s `permissions === 'r'` arm was dead;
    * `roster-private-chat.ts:36` reads `(permissions === 'a' || hasAdminChat === true)`, so the
      first disjunct always won and `hasAdminChat` was never consulted.

  `'user'` is the REFERENCE's role vocabulary. Ours is `RoomRole`. The comparison typechecked on both
  sides — `string === string` — which is exactly why nothing caught it.

  ## Why this file tests the VALUES and not the source

  A source assertion could pin today's expression and would say nothing about the next one. What has
  to hold is a property: **every role this application can actually mint maps to a real answer, and
  both answers are reachable.** That is what a dead predicate violates, and it is checkable by
  calling the function with each role rather than by reading it.

  `ROLES` is derived from `RoomRole` through a satisfies-typed tuple, so adding a fourth role to the
  union without adding it here fails to COMPILE. A hand-written array would have let the next role
  in unmeasured, which is the same class of drift as the defect itself.
*/

/**
 * Every role this deployment can mint, checked against the union at compile time.
 *
 * `satisfies readonly RoomRole[]` rather than a type annotation: the annotation would WIDEN the
 * tuple to `RoomRole[]` and lose the literal types, so the exhaustiveness check below could not see
 * which members are present.
 */
const ROLES = ['admin', 'staff', 'member'] as const satisfies readonly RoomRole[];

/** The compile-time half: a role added to the union and not to `ROLES` is an error here. */
type Missing = Exclude<RoomRole, (typeof ROLES)[number]>;
const _exhaustive: Missing extends never ? true : never = true;

const row = (over: Partial<Parameters<typeof modalTargetFromRosterRow>[0]> = {}) =>
  modalTargetFromRosterRow({
    id: 7,
    displayName: 'Dana',
    email: 'dana@example.test',
    emailHash: 'h',
    avatarUrl: '/a.svg',
    status: 'online',
    role: 'member',
    ...over
  });

describe('the Permissions the user-info modal draws', () => {
  it('is exercised at all — the floor', () => {
    expect(_exhaustive).toBe(true);
    expect(ROLES.length).toBeGreaterThan(2);
    expect(row().permissions).toBeTypeOf('string');
  });

  it('answers `a` for a presenter and `r` for everyone else, on the ROW’S OWN flag', () => {
    /*
      `isP` and not the role, and the two are not interchangeable: `events/+server.ts:192` records
      the roster frame moving OFF `isPresenterRole(user.role)` onto `membership?.isP === true`,
      because a row's `role` is another account's `users` row and goes stale until that account
      loads a page. `private-chat.svelte.ts:444` already reads `isP` for the identical question.
    */
    expect(row({ isP: true }).permissions).toBe('a');
    expect(row({ isP: false }).permissions).toBe('r');
  });

  it('BOTH answers are reachable from a role this application can actually mint', () => {
    /*
      THE ASSERTION THIS FILE EXISTS FOR. A predicate comparing against a value no row can hold
      produces one answer forever, and every branch downstream of it becomes a constant. Asserting
      the SET of outcomes is what catches that, where asserting one outcome would not.
    */
    const outcomes = new Set(
      ROLES.flatMap((role) => [
        row({ role, isP: true }).permissions,
        row({ role, isP: false }).permissions
      ])
    );
    expect(
      [...outcomes].sort(),
      'Both `a` and `r` must be produceable. If only one appears, the predicate is comparing ' +
        "against something no roster row can hold — which is how `role === 'user'` stamped every " +
        'member "Presenter / Admin" and left three branches downstream decided by a constant.'
    ).toEqual(['a', 'r']);
  });

  it('and the role alone never decides it, for any role', () => {
    /* Holding `isP` fixed across every role must not change the answer. */
    for (const role of ROLES) {
      expect(row({ role, isP: true }).permissions, `${role} + isP`).toBe('a');
      expect(row({ role, isP: false }).permissions, `${role} + !isP`).toBe('r');
    }
  });

  it('a row with no `isP` at all is a MEMBER, not an admin', () => {
    /*
      The fail-closed half. `isP` is optional because two supply paths reach this builder, and a
      member's copy is redacted at the hub — so an absent flag must mean "not a presenter". The old
      expression failed OPEN here: absent `role` still produced `'a'`.
    */
    expect(row({}).permissions).toBe('r');
    expect(row({ isP: undefined }).permissions).toBe('r');
  });

  it('the reference’s role vocabulary is not this application’s, and is named nowhere in the builder', () => {
    /*
      `'user'` is the REFERENCE's string. Reading the source is right for this one case: the point is
      that the token is absent, and no call can demonstrate the absence of a comparison.
      Comments stripped, because this file's own reasoning quotes the defective expression and the
      builder's does too — an unstripped read would match the prose describing the bug.
    */
    const code = readFileSync('src/lib/room/modal-target.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
    expect(code).toContain('permissions:');
    expect(code, "the reference's `'user'` role must not decide anything here").not.toContain(
      "=== 'user'"
    );
  });
});
