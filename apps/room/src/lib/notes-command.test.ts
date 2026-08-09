import { describe, expect, test } from 'vitest';
import {
  deleteSessionNoteTabSchema,
  renameSessionNoteTabSchema,
  setWelcomeMatNoteTabSchema
} from './notes-command';

describe('note command schemas', () => {
  test('accepts the captured rename, delete, and welcome-mat command shapes', () => {
    expect(
      renameSessionNoteTabSchema.safeParse({
        cmd: 'renameSessionNoteTab',
        data: { noteId: 7, newName: 'Bible Verses' }
      }).success
    ).toBe(true);
    expect(
      deleteSessionNoteTabSchema.safeParse({
        cmd: 'deleteSessionNoteTab',
        data: { noteId: 7 }
      }).success
    ).toBe(true);
    expect(
      setWelcomeMatNoteTabSchema.safeParse({
        cmd: 'setWelcomeMatNoteTab',
        data: { noteId: 7, allRooms: true }
      }).success
    ).toBe(true);
  });

  test('rejects empty names, unknown keys, and non-boolean allRooms values', () => {
    expect(
      renameSessionNoteTabSchema.safeParse({
        cmd: 'renameSessionNoteTab',
        data: { noteId: 7, newName: '   ' }
      }).success
    ).toBe(false);
    expect(
      deleteSessionNoteTabSchema.safeParse({
        cmd: 'deleteSessionNoteTab',
        data: { noteId: 7, extra: true }
      }).success
    ).toBe(false);
    expect(
      setWelcomeMatNoteTabSchema.safeParse({
        cmd: 'setWelcomeMatNoteTab',
        data: { noteId: 7, allRooms: 'true' }
      }).success
    ).toBe(false);
  });
});
