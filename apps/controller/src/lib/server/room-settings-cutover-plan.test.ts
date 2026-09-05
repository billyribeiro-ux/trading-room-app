import { describe, expect, it } from 'vitest';
import {
  RoomSettingsCutoverRefusal,
  normalizeSettingsDocument,
  normalizeSourceRows
} from '../../../scripts/cutover-room-settings-authority.mjs';

const ROOM_ID = '20000000-0000-8000-8000-000000000001';
const ENTERPRISE_ID = '10000000-0000-8000-8000-000000000001';

function row(overrides: Record<string, unknown> = {}) {
  return {
    legacyId: '7',
    targetId: ROOM_ID,
    enterpriseId: ENTERPRISE_ID,
    authorityRevision: null,
    roomName: 'Settings Room',
    settingsJson: JSON.stringify({ name: 'Settings Room', isLocked: true, simUserCount: 7 }),
    ...overrides
  };
}

function expectRefusal(operation: () => unknown, code: string) {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(RoomSettingsCutoverRefusal);
    expect((error as RoomSettingsCutoverRefusal).code).toBe(code);
    return;
  }
  throw new Error(`expected settings cutover refusal ${code}`);
}

describe('room settings cutover normalization', () => {
  it('sorts the generated key set and treats null as deletion', () => {
    expect(normalizeSettingsDocument({ simUserCount: 7, isLocked: null, name: ' Settings Room ' })).toEqual({
      name: 'Settings Room',
      simUserCount: 7
    });
  });

  it('normalizes a one-to-one reconciled row without exposing source text in evidence', () => {
    expect(normalizeSourceRows([row()])).toEqual([
      {
        legacyId: '7',
        targetId: ROOM_ID,
        enterpriseId: ENTERPRISE_ID,
        authorityRevision: null,
        roomName: 'Settings Room',
        settings: { isLocked: true, name: 'Settings Room', simUserCount: 7 }
      }
    ]);
  });

  it('refuses unknown keys, wrong scalar types, title disagreement, and duplicate mappings', () => {
    expectRefusal(() => normalizeSettingsDocument({ invented: true }), 'unknown-setting');
    expectRefusal(() => normalizeSettingsDocument({ isLocked: 'yes' }), 'wrong-setting-type');
    expectRefusal(() => normalizeSourceRows([row({ roomName: 'Different' })]), 'room-name-disagreement');
    expectRefusal(() => normalizeSourceRows([row(), row({ legacyId: '8' })]), 'duplicate-room-mapping');
  });
});
