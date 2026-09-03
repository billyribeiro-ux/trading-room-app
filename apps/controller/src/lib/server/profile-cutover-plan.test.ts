import { describe, expect, it } from 'vitest';
import { CutoverRefusal, normalizeSourceRows, resolvePlan } from '../../../scripts/cutover-profile-authority.mjs';

const ACCOUNT_ID = '10000000-0000-8000-8000-000000000001';
const USER_ID = '20000000-0000-8000-8000-000000000001';
const LEGACY_HASH =
  '00112233445566778899aabbccddeeff:' +
  '5699cfee2c5c280e66678242092f368ce88ff05305af2c75a9e629d473deb2165' +
  'b3797e0e31ec3cda30414573befb697f928384c38b187e8c176107e5be20f01';

function rawSource(overrides: { accounts?: Record<string, unknown>[]; users?: Record<string, unknown>[] } = {}) {
  return {
    accounts: overrides.accounts ?? [
      {
        legacyId: '1',
        name: 'Example Trading',
        ownerEmail: 'Owner@Example.Test ',
        status: 'active',
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        authorityId: null
      }
    ],
    users: overrides.users ?? [
      {
        legacyId: '7',
        legacyAccountId: '1',
        email: 'Owner@Example.Test ',
        displayName: 'Owner',
        passwordHash: LEGACY_HASH,
        emailVerifiedAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        authorityId: null
      }
    ]
  };
}

function expectRefusal(operation: () => unknown, code: string) {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(CutoverRefusal);
    expect((error as CutoverRefusal).code).toBe(code);
    return;
  }
  throw new Error(`expected cutover refusal ${code}`);
}

describe('Gate 3 profile cutover planner', () => {
  it('normalizes source identity and assigns stable target ids without exposing credentials', () => {
    const raw = rawSource();
    const source = normalizeSourceRows(raw.accounts, raw.users);
    const allocations = [ACCOUNT_ID, USER_ID];
    const plan = resolvePlan(source, [], () => allocations.shift()!);

    expect(source.accounts[0].ownerEmail).toBe('owner@example.test');
    expect(source.users[0].email).toBe('owner@example.test');
    expect(plan.accounts[0].mapping.targetId).toBe(ACCOUNT_ID);
    expect(plan.users[0].mapping.targetId).toBe(USER_ID);
    expect(plan.users[0].mapping.sourceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(plan.users[0].mapping).not.toHaveProperty('passwordHash');
  });

  it('recovers a target-committed mapping and refuses ledger disagreement', () => {
    const raw = rawSource();
    const source = normalizeSourceRows(raw.accounts, raw.users);
    const mappingRows: { entityType: 'enterprise' | 'user'; legacyId: string; targetId: string }[] = [
      { entityType: 'enterprise', legacyId: '1', targetId: ACCOUNT_ID },
      { entityType: 'user', legacyId: '7', targetId: USER_ID }
    ];
    expect(resolvePlan(source, mappingRows).users[0].mapping.ledgerWasMapped).toBe(true);

    const mappedRaw = rawSource();
    mappedRaw.users[0].authorityId = '30000000-0000-8000-8000-000000000001';
    const mappedSource = normalizeSourceRows(mappedRaw.accounts, mappedRaw.users);
    expectRefusal(() => resolvePlan(mappedSource, mappingRows), 'mapping-disagreement');
  });

  it('refuses ambiguous source ownership, malformed credentials, and case-folded duplicate identities', () => {
    const missingOwner = rawSource();
    missingOwner.users[0].passwordHash = null;
    expectRefusal(() => normalizeSourceRows(missingOwner.accounts, missingOwner.users), 'missing-account-owner');

    const malformed = rawSource();
    malformed.users[0].passwordHash = 'not-a-controller-hash';
    expectRefusal(() => normalizeSourceRows(malformed.accounts, malformed.users), 'invalid-legacy-password');

    const duplicate = rawSource();
    duplicate.users.push({ ...duplicate.users[0], legacyId: '8', email: 'OWNER@example.test' });
    expectRefusal(() => normalizeSourceRows(duplicate.accounts, duplicate.users), 'duplicate-user-email');
  });
});
