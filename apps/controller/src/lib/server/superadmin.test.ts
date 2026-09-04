import { describe, expect, it, vi } from 'vitest';

/*
  The allow-list is parsed once at module scope, which is deliberate — it should not be re-read per
  request. That means each configuration under test needs its own module instance, so every case
  resets the registry and re-imports rather than mutating a shared value. Mutating one would test a
  module that does not exist in production.
*/
const mocked = vi.hoisted(() => ({ emails: '' as string | undefined }));
vi.mock('$app/env/private', () => ({
  get SUPERADMIN_EMAILS() {
    return mocked.emails;
  }
}));

async function withAllowList(value: string | undefined) {
  mocked.emails = value;
  vi.resetModules();
  return import('./superadmin');
}

/** A `locals` shaped like the real one. */
const localsFor = (email?: string): App.Locals =>
  email
    ? {
        user: {
          id: 7,
          email,
          displayName: 'Operator',
          accountId: 1,
          emailVerifiedAt: null,
          authorityUserId: null,
          authorityEnterpriseId: null
        }
      }
    : {};

describe('who is a superadmin', () => {
  it('nobody, when the list is unset or blank', async () => {
    for (const value of [undefined, '', '   ', ',', ' , , ']) {
      const { isSuperadmin, superadminConfigured, superadminCount } = await withAllowList(value);
      expect(superadminConfigured()).toBe(false);
      expect(superadminCount()).toBe(0);
      expect(isSuperadmin('anyone@example.com')).toBe(false);
    }
  });

  it('matches case-insensitively, because no real mail system distinguishes it', async () => {
    const { isSuperadmin } = await withAllowList('Ops@Example.com');
    expect(isSuperadmin('ops@example.com')).toBe(true);
    expect(isSuperadmin('OPS@EXAMPLE.COM')).toBe(true);
    expect(isSuperadmin('  ops@example.com  ')).toBe(true);
  });

  it('accepts several, with untidy spacing', async () => {
    const { isSuperadmin, superadminCount } = await withAllowList(
      ' first@example.com , second@example.com,third@example.com '
    );
    expect(superadminCount()).toBe(3);
    for (const email of ['first@example.com', 'second@example.com', 'third@example.com']) {
      expect(isSuperadmin(email)).toBe(true);
    }
  });

  /*
    Every address here stays inside a RESERVED domain — example.com, .test, .invalid.

    Not pedantry: `verify-privacy-boundary.mjs` rejects any address outside them, and it caught this
    file when a near-miss case used `example.co`. That is a real registrable TLD, so a fixture using
    it is a live address somebody could own. The gate was right and the case was rewritten rather
    than the gate loosened.
  */
  it('refuses anyone not on it, including near misses', async () => {
    const { isSuperadmin } = await withAllowList('ops@example.com');
    for (const email of [
      'ops@example.com.attacker.test', // a suffix must not match
      'attacker.test/ops@example.com', // nor a prefix
      'ops@example.test', // same local part, different domain
      'ops@example.invalid', // and another
      'ops+extra@example.com', // sub-addressing is a DIFFERENT address to an exact check
      'ops @example.com',
      '',
      undefined,
      null
    ]) {
      expect(isSuperadmin(email as string | undefined | null)).toBe(false);
    }
  });
});

describe('the guard', () => {
  /*
    404 and not 403. A 403 tells an unauthorised visitor that the route exists and they merely need
    a better credential; a 404 is indistinguishable from the route not existing. Same posture as
    `requireOwnedRoom` for another account's room.
  */
  it('answers 404 for an anonymous visitor', async () => {
    const { requireSuperadmin } = await withAllowList('ops@example.com');
    expect(() => requireSuperadmin(localsFor())).toThrowError(expect.objectContaining({ status: 404 }));
  });

  it('answers 404 for a signed-in user who is not on the list', async () => {
    const { requireSuperadmin } = await withAllowList('ops@example.com');
    expect(() => requireSuperadmin(localsFor('customer@example.com'))).toThrowError(
      expect.objectContaining({ status: 404 })
    );
  });

  /*
    The state that matters most. With no list configured, NOBODY gets in — not even the first user,
    not the lowest account id, not "the only account". An empty allow-list must fail closed, because
    the alternative ("if nothing is configured, let the owner through") is a bootstrap backdoor.
  */
  it('answers 404 for everyone when no superadmin is configured', async () => {
    const { requireSuperadmin } = await withAllowList('');
    expect(() => requireSuperadmin(localsFor('anyone@example.com'))).toThrowError(
      expect.objectContaining({ status: 404 })
    );
  });

  it('returns the user when they are on the list', async () => {
    const { requireSuperadmin } = await withAllowList('ops@example.com');
    const user = requireSuperadmin(localsFor('ops@example.com'));
    expect(user.email).toBe('ops@example.com');
    expect(user.id).toBe(7);
  });

  it('never writes the refused address into the log', async () => {
    const { requireSuperadmin } = await withAllowList('ops@example.com');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(() => requireSuperadmin(localsFor('victim@example.com'))).toThrow();
      const logged = JSON.stringify(warn.mock.calls);
      // The id is enough to trace; the address would make the log itself a place to harvest from.
      expect(logged).not.toContain('victim@example.com');
      expect(logged).toContain('7');
    } finally {
      warn.mockRestore();
    }
  });
});

/**
 * Operator roles.
 *
 * The allow-list was one boolean until 2026-08-08. These pin the two properties that decide whether
 * the upgrade was safe: an existing bare-email deployment keeps its authority, and a malformed
 * entry grants NOTHING rather than everything.
 */
describe('operator roles', () => {
  it('treats a bare email as full, so an existing deployment is not silently demoted', async () => {
    const { operatorRoleOf, isSuperadmin } = await withAllowList('ops@example.test');
    expect(operatorRoleOf('ops@example.test')).toBe('full');
    expect(isSuperadmin('ops@example.test')).toBe(true);
  });

  it('reads an explicit role', async () => {
    const { operatorRoleOf } = await withAllowList(
      'a@example.test:read-only, b@example.test:support, c@example.test:full'
    );
    expect(operatorRoleOf('a@example.test')).toBe('read-only');
    expect(operatorRoleOf('b@example.test')).toBe('support');
    expect(operatorRoleOf('c@example.test')).toBe('full');
  });

  /*
    The important one. A typo has two possible failure modes — grant more than intended, or grant
    nothing — and only the second is visible the moment somebody tries to use it.
  */
  it('drops an entry with an unknown role rather than defaulting it to full', async () => {
    const { operatorRoleOf, isSuperadmin, superadminCount } = await withAllowList(
      'typo@example.test:suport, good@example.test:support'
    );
    expect(operatorRoleOf('typo@example.test')).toBe(null);
    expect(isSuperadmin('typo@example.test')).toBe(false);
    expect(superadminCount()).toBe(1);
  });

  it('is case-insensitive on the address and on the role', async () => {
    const { operatorRoleOf } = await withAllowList('Ops@Example.TEST:SUPPORT');
    expect(operatorRoleOf('ops@example.test')).toBe('support');
  });

  it('ranks roles so a comparison decides authority', async () => {
    const { operatorRoleAtLeast } = await withAllowList('x@example.test');
    expect(operatorRoleAtLeast('full', 'support')).toBe(true);
    expect(operatorRoleAtLeast('support', 'support')).toBe(true);
    expect(operatorRoleAtLeast('read-only', 'support')).toBe(false);
    expect(operatorRoleAtLeast('support', 'full')).toBe(false);
    // read-only is the floor: everybody on the list can at least look.
    expect(operatorRoleAtLeast('read-only', 'read-only')).toBe(true);
  });

  it('keeps an email that contains no colon working, and one that does', async () => {
    // `lastIndexOf(':')` rather than `split(':')` — an address is not supposed to contain a colon,
    // but the parse must not silently mangle one that does.
    const { operatorRoleOf } = await withAllowList('weird:name@example.test:support');
    expect(operatorRoleOf('weird:name@example.test')).toBe('support');
  });
});
