import { describe, expect, it } from 'vitest';
import {
  BadgeCutoverRefusal,
  normalizeBadgeSource,
  resolveBadgePlan
} from '../../../scripts/cutover-badge-authority.mjs';

const ENTERPRISE_ID = '10000000-0000-8000-8000-000000000001';
const ROOM_ID = '20000000-0000-8000-8000-000000000001';
const MEMBER_ID = '30000000-0000-8000-8000-000000000001';
const LIGHT_BADGE_ID = '40000000-0000-8000-8000-000000000001';
const DARK_BADGE_ID = '40000000-0000-8000-8000-000000000002';
const MEMBER_HASH = 'a'.repeat(64);

function rawBadge(overrides: Record<string, unknown> = {}) {
  return {
    legacyId: '41',
    legacyAccountId: '11',
    enterpriseId: ENTERPRISE_ID,
    targetId: null,
    label: ' Momentum ',
    textColor: '#FFFFFF',
    backgroundColor: '#102030',
    emoji: ' 🚀 ',
    imageDataUrl: null,
    darkThemeLegacyId: '42',
    autoAssignRoles: JSON.stringify(['Presenter', 'member', 'presenter']),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    authorityRevision: null,
    authorityContentHash: null,
    ...overrides
  };
}

function rawMember(overrides: Record<string, unknown> = {}) {
  return {
    legacyId: '51',
    legacyAccountId: '11',
    targetId: MEMBER_ID,
    enterpriseId: ENTERPRISE_ID,
    roomId: ROOM_ID,
    badgesJson: JSON.stringify([42, 41, 41]),
    authorityRevision: 0,
    authorityContentHash: MEMBER_HASH,
    ...overrides
  };
}

function source() {
  return normalizeBadgeSource(
    [
      rawBadge(),
      rawBadge({
        legacyId: '42',
        label: '',
        emoji: null,
        imageDataUrl: 'data:image/png;base64,AQ==',
        darkThemeLegacyId: null,
        autoAssignRoles: []
      })
    ],
    [rawMember()]
  );
}

function expectRefusal(operation: () => unknown, code: string) {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(BadgeCutoverRefusal);
    expect((error as BadgeCutoverRefusal).code).toBe(code);
    return;
  }
  throw new Error(`expected badge cutover refusal ${code}`);
}

describe('badge cutover planner', () => {
  it('normalizes roles, assignments, images, colors, references, and timestamps deterministically', () => {
    const normalized = source();
    expect(normalized.badges[0]).toMatchObject({
      label: 'Momentum',
      textColor: '#FFFFFF',
      emoji: '🚀',
      darkThemeLegacyId: '42',
      autoAssignRoles: ['member', 'presenter'],
      createdAt: '2026-01-01T00:00:00.000Z'
    });
    expect(normalized.badges[1].imageDataUrl).toBe('data:image/png;base64,AQ==');
    expect(normalized.members[0].badgeLegacyIds).toEqual(['41', '42']);
  });

  it('allocates exact UUID mappings and resumes only the same complete ledger', () => {
    const normalized = source();
    const targets = new Map([
      ['41', LIGHT_BADGE_ID],
      ['42', DARK_BADGE_ID]
    ]);
    const plan = resolveBadgePlan(normalized.badges, [], (row) => targets.get(row.legacyId)!);
    const mappings = plan.map((item) => ({
      legacyId: item.row.legacyId,
      targetId: item.targetId,
      sourceDigest: item.sourceDigest
    }));
    expect(plan.map((item) => item.targetId)).toEqual([LIGHT_BADGE_ID, DARK_BADGE_ID]);
    expect(resolveBadgePlan(normalized.badges, mappings, () => 'unreachable').every((item) => item.mapped)).toBe(true);
    expectRefusal(
      () => resolveBadgePlan(normalized.badges, mappings.slice(0, 1), () => DARK_BADGE_ID),
      'partial-target-commit'
    );
    expectRefusal(
      () =>
        resolveBadgePlan(
          source().badges.map((badge, index) => (index === 0 ? { ...badge, label: 'Drift' } : badge)),
          mappings,
          () => DARK_BADGE_ID
        ),
      'source-changed-since-target-commit'
    );
  });

  it('refuses missing membership proofs, cross-account references, partial proofs, and malformed images', () => {
    expectRefusal(
      () =>
        normalizeBadgeSource(
          [rawBadge(), rawBadge({ legacyId: '42', darkThemeLegacyId: null })],
          [rawMember({ authorityRevision: null })]
        ),
      'membership-prerequisite-incomplete'
    );
    expectRefusal(
      () => normalizeBadgeSource([rawBadge({ darkThemeLegacyId: '99' })], [rawMember({ badgesJson: '[]' })]),
      'cross-account-dark-theme'
    );
    expectRefusal(
      () =>
        normalizeBadgeSource(
          [rawBadge({ targetId: LIGHT_BADGE_ID, authorityRevision: 0, darkThemeLegacyId: null })],
          [rawMember({ badgesJson: '[]' })]
        ),
      'partial-source-proof'
    );
    expectRefusal(
      () =>
        normalizeBadgeSource(
          [rawBadge({ imageDataUrl: 'data:image/svg+xml;base64,AQ==' })],
          [rawMember({ badgesJson: '[]' })]
        ),
      'invalid-image-type'
    );
  });
});
