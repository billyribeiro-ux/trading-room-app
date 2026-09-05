import { describe, expect, it } from 'vitest';
import {
  CustomerApiKeyCutoverRefusal,
  customerApiKeyContentHash,
  normalizeCustomerApiKeySource,
  resolveCustomerApiKeyPlan
} from '../../../scripts/cutover-customer-api-key-authority.mjs';

const ENTERPRISE_ID = '10000000-0000-8000-8000-000000000001';
const OWNERSHIP_ID = '20000000-0000-8000-8000-000000000001';

function rawKey(overrides: Record<string, unknown> = {}) {
  return {
    legacyId: '0123456789abcdef01234567',
    legacyAccountId: '11',
    enterpriseId: ENTERPRISE_ID,
    secretHash: 'a'.repeat(64),
    lastFour: 'cdef',
    secretCiphertext: 'v1.AQID.BAUG.BwgJ',
    restrictionsJson: JSON.stringify({
      sessions: ['room-one', 'room-one'],
      scopes: ['sessions/users', 'sessions/list'],
      ips: ['192.0.2.8/08', '192.0.2.8/8']
    }),
    ownedSessions: ['room-one'],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastUsedAt: null,
    authorityRevision: null,
    authorityContentHash: null,
    authorityReconciledAt: null,
    ...overrides
  };
}

function expectRefusal(operation: () => unknown, code: string) {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(CustomerApiKeyCutoverRefusal);
    expect((error as CustomerApiKeyCutoverRefusal).code).toBe(code);
    return;
  }
  throw new Error(`expected customer API-key cutover refusal ${code}`);
}

describe('customer API-key cutover planner', () => {
  it('normalizes all restriction axes and timestamps deterministically', () => {
    const [key] = normalizeCustomerApiKeySource([rawKey()]);
    expect(key.restrictions).toEqual({
      ips: ['192.0.2.8/8'],
      scopes: ['sessions/list', 'sessions/users'],
      sessions: ['room-one']
    });
    expect(key.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(
      customerApiKeyContentHash({
        id: key.legacyId,
        revision: 0,
        lastFour: key.lastFour,
        restrictions: key.restrictions,
        createdAt: key.createdAt,
        updatedAt: key.createdAt,
        lastUsedAt: null
      })
    ).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('allocates an opaque ledger ownership UUID and resumes only owned rows', () => {
    const source = normalizeCustomerApiKeySource([rawKey()]);
    const [planned] = resolveCustomerApiKeyPlan(source, [], () => OWNERSHIP_ID);
    expect(planned).toMatchObject({ ownershipId: OWNERSHIP_ID, mapped: false });
    const mapping = {
      legacyId: planned.row.legacyId,
      targetId: planned.ownershipId,
      sourceDigest: planned.sourceDigest
    };
    expect(resolveCustomerApiKeyPlan(source, [mapping], () => 'unreachable')[0]).toMatchObject({
      ownershipId: OWNERSHIP_ID,
      mapped: true
    });
    expectRefusal(
      () => resolveCustomerApiKeyPlan(source, [{ ...mapping, legacyId: 'f'.repeat(24) }], () => OWNERSHIP_ID),
      'extra-target-mapping'
    );
    expectRefusal(
      () => resolveCustomerApiKeyPlan(normalizeCustomerApiKeySource([rawKey({ authorityRevision: 0 })]), []),
      'partial-source-proof'
    );
  });

  it('refuses unrecoverable credentials, malformed restrictions, and unowned sessions', () => {
    expectRefusal(
      () => normalizeCustomerApiKeySource([rawKey({ secretCiphertext: null })]),
      'unrecoverable-legacy-secret'
    );
    expectRefusal(
      () => normalizeCustomerApiKeySource([rawKey({ restrictionsJson: '{' })]),
      'invalid-restrictions-json'
    );
    expectRefusal(
      () => normalizeCustomerApiKeySource([rawKey({ restrictionsJson: JSON.stringify({ sessions: ['other'] }) })]),
      'unowned-session-restriction'
    );
    expectRefusal(
      () => normalizeCustomerApiKeySource([rawKey({ restrictionsJson: JSON.stringify({ scopes: ['root'] }) })]),
      'unknown-scope-restriction'
    );
  });
});
