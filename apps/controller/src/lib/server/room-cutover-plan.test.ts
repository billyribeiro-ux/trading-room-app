import { describe, expect, it } from 'vitest';
import { RoomCutoverRefusal, normalizeRoomRows, resolveRoomPlan } from '../../../scripts/cutover-room-authority.mjs';

const ENTERPRISE_ID = '10000000-0000-8000-8000-000000000001';
const USER_ID = '20000000-0000-8000-8000-000000000001';
const ROOM_ID = '30000000-0000-8000-8000-000000000001';

function rawRoom(overrides: Record<string, unknown> = {}) {
  return {
    legacyId: '11',
    legacyAccountId: '7',
    targetId: null,
    enterpriseId: ENTERPRISE_ID,
    ownerUserId: USER_ID,
    shortCode: '3627',
    name: 'Main Room',
    state: 'open',
    maxCapacity: 100,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

function expectRefusal(operation: () => unknown, code: string) {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(RoomCutoverRefusal);
    expect((error as RoomCutoverRefusal).code).toBe(code);
    return;
  }
  throw new Error(`expected room cutover refusal ${code}`);
}

describe('Gate 3 room cutover planner', () => {
  it('normalizes lifecycle data and allocates a stable canonical id', () => {
    const rooms = normalizeRoomRows([rawRoom()]);
    const plan = resolveRoomPlan(rooms, [], () => ROOM_ID);
    expect(plan[0].mapping.targetId).toBe(ROOM_ID);
    expect(plan[0].mapping.sourceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(plan[0].mapping).not.toHaveProperty('name');
  });

  it('resumes a target-committed mapping and refuses source/ledger disagreement', () => {
    const rooms = normalizeRoomRows([rawRoom()]);
    const sourceDigest = resolveRoomPlan(rooms, [], () => ROOM_ID)[0].mapping.sourceDigest;
    const mapping = [{ legacyId: '11', targetId: ROOM_ID, sourceDigest }];
    expect(resolveRoomPlan(rooms, mapping)[0].mapping.ledgerWasMapped).toBe(true);

    const changed = normalizeRoomRows([rawRoom({ targetId: '40000000-0000-8000-8000-000000000001' })]);
    expectRefusal(() => resolveRoomPlan(changed, mapping), 'mapping-disagreement');
  });

  it('refuses stale, duplicate, and source-orphaned ownership ledger entries', () => {
    const rooms = normalizeRoomRows([rawRoom()]);
    const sourceDigest = resolveRoomPlan(rooms, [], () => ROOM_ID)[0].mapping.sourceDigest;
    const mapping = [{ legacyId: '11', targetId: ROOM_ID, sourceDigest }];

    expectRefusal(
      () => resolveRoomPlan(normalizeRoomRows([rawRoom({ name: 'Changed' })]), mapping),
      'source-changed-since-target-commit'
    );
    expectRefusal(() => resolveRoomPlan(rooms, [...mapping, ...mapping]), 'duplicate-ledger-mapping');
    expectRefusal(() => resolveRoomPlan(rooms, [{ ...mapping[0], legacyId: '12' }]), 'extra-target-mapping');
  });

  it('refuses invalid authority ids, unsupported state, unbounded capacity, and duplicate codes', () => {
    expectRefusal(() => normalizeRoomRows([rawRoom({ enterpriseId: null })]), 'missing-profile-enterprise-mapping');
    expectRefusal(() => normalizeRoomRows([rawRoom({ state: 'deleted' })]), 'invalid-room-state');
    expectRefusal(() => normalizeRoomRows([rawRoom({ maxCapacity: -1 })]), 'invalid-room-capacity');
    expectRefusal(() => normalizeRoomRows([rawRoom(), rawRoom({ legacyId: '12' })]), 'duplicate-short-code');
  });
});
