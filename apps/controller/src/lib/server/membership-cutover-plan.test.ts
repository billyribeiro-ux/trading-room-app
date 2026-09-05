import { describe, expect, it } from 'vitest';
import {
  MembershipCutoverRefusal,
  normalizeMembershipRows,
  resolveMembershipPlan
} from '../../../scripts/cutover-membership-authority.mjs';

const ENTERPRISE_ID = '10000000-0000-8000-8000-000000000001';
const ROOM_ID = '20000000-0000-8000-8000-000000000001';
const OWNER_USER_ID = '30000000-0000-8000-8000-000000000001';
const MEMBER_USER_ID = '30000000-0000-8000-8000-000000000002';
const OWNER_MEMBER_ID = '40000000-0000-8000-8000-000000000001';
const MEMBER_ID = '40000000-0000-8000-8000-000000000002';

function raw(overrides: Record<string, unknown> = {}) {
  return {
    legacyId: '31',
    legacyRoomId: '11',
    legacyUserId: '21',
    targetId: null,
    roomId: ROOM_ID,
    enterpriseId: ENTERPRISE_ID,
    userId: OWNER_USER_ID,
    email: ' Owner@Example.Test ',
    displayName: ' Owner ',
    role: 0,
    nonPresenter: false,
    muted: false,
    banned: false,
    paused: false,
    permissionsJson: JSON.stringify({ hasMic: true, hasScreen: false, invented: true }),
    canAccessFiles: true,
    denyArchivesAccess: false,
    isPmRestricted: false,
    isTrial: false,
    hidePersonalInfo: false,
    hideUserCount: false,
    adminNote: null,
    approvalStatus: 'approved',
    hasMobileApp: false,
    hasPassword: true,
    lastSeenAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    authorityRevision: null,
    authorityContentHash: null,
    ...overrides
  };
}

function rows() {
  return normalizeMembershipRows([
    raw(),
    raw({
      legacyId: '32',
      legacyUserId: '22',
      userId: MEMBER_USER_ID,
      email: 'member@example.test',
      displayName: 'Member',
      role: 3,
      nonPresenter: true,
      muted: true,
      permissionsJson: '{}'
    })
  ]);
}

function expectRefusal(operation: () => unknown, code: string) {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(MembershipCutoverRefusal);
    expect((error as MembershipCutoverRefusal).code).toBe(code);
    return;
  }
  throw new Error(`expected membership cutover refusal ${code}`);
}

describe('membership cutover planner', () => {
  it('normalizes legacy roles, permissions, inverse flags, identity text, and time', () => {
    const normalized = rows();
    expect(normalized[0]).toMatchObject({
      email: 'owner@example.test',
      displayName: 'Owner',
      role: 'owner',
      canPublishMic: true,
      canPublishScreen: false,
      canAccessArchives: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    });
    expect(normalized[1]).toMatchObject({ role: 'moderator', isMuted: true, isBanned: false });
  });

  it('adopts the room foundation owner and allocates a member without recording source PII', () => {
    const plan = resolveMembershipPlan(rows(), [], (row) => (row.role === 'owner' ? OWNER_MEMBER_ID : MEMBER_ID));
    expect(plan.map((item) => item.targetId)).toEqual([OWNER_MEMBER_ID, MEMBER_ID]);
    expect(plan.every((item) => item.sourceDigest.match(/^[0-9a-f]{64}$/))).toBe(true);
    expect(JSON.stringify(plan.map((item) => item.sourceDigest))).not.toContain('example.test');
  });

  it('resumes an exact ledger and refuses source, mapping, owner, and state disagreement', () => {
    const normalized = rows();
    const first = resolveMembershipPlan(normalized, [], (row) => (row.role === 'owner' ? OWNER_MEMBER_ID : MEMBER_ID));
    const mappings = first.map((item) => ({
      legacyId: item.row.legacyId,
      targetId: item.targetId,
      sourceDigest: item.sourceDigest
    }));
    expect(resolveMembershipPlan(normalized, mappings, () => 'unreachable').every((item) => item.mapped)).toBe(true);
    expectRefusal(
      () =>
        resolveMembershipPlan(
          normalizeMembershipRows([
            raw({ adminNote: 'changed' }),
            raw({
              legacyId: '32',
              legacyUserId: '22',
              userId: MEMBER_USER_ID,
              email: 'member@example.test',
              displayName: 'Member',
              role: 3,
              nonPresenter: true,
              muted: true
            })
          ]),
          mappings,
          () => MEMBER_ID
        ),
      'source-changed-since-target-commit'
    );
    expectRefusal(() => normalizeMembershipRows([raw({ muted: true })]), 'legacy-role-state-disagreement');
    expectRefusal(() => normalizeMembershipRows([raw({ role: 2 })]), 'room-owner-cardinality');
    expectRefusal(
      () =>
        resolveMembershipPlan(
          normalized.map((row, index) => (index === 0 ? { ...row, targetId: OWNER_MEMBER_ID } : row)),
          [],
          () => MEMBER_ID
        ),
      'unproven-source-mapping'
    );
  });
});
