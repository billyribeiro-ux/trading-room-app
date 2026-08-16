import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { notes, noteVersions, users } from '#lib/server/db/schema.js';
import {
  createNote,
  deleteNote,
  getNotes,
  getNoteVersions,
  renameNote,
  restoreNoteVersion,
  saveNote
} from './notes-repository';

/**
 * The room these fixtures belong to.
 *
 * Notes are per room now, so every call has to name one — a repository that answered "all the
 * notes" regardless of room is the bug these tests would otherwise keep passing over.
 */
const ROOM = '3625';

const TEST_NAMES = [
  'notes repository position test one',
  'notes repository position test two',
  'notes repository coalescing test',
  'notes repository historical read test',
  'notes repository restore test',
  'notes repository rename test',
  'notes repository delete test'
];

let primaryUserId = 0;
let secondUserId = 0;

function cleanupNotes(): void {
  const rows = db.select({ id: notes.id }).from(notes).where(inArray(notes.name, TEST_NAMES)).all();
  const noteIds = rows.map(({ id }) => id);
  if (noteIds.length === 0) return;
  db.delete(noteVersions).where(inArray(noteVersions.noteId, noteIds)).run();
  db.delete(notes).where(inArray(notes.id, noteIds)).run();
}

beforeAll(() => {
  ensureDatabase();
  const now = new Date('2036-07-27T11:00:00.000Z');
  primaryUserId = db
    .insert(users)
    .values({
      displayName: 'Notes Test Owner',
      email: 'notes-test-owner@tradingroom.invalid',
      role: 'staff',
      status: 'offline',
      createdAt: now
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { displayName: 'Notes Test Owner' }
    })
    .returning({ id: users.id })
    .get().id;
  secondUserId = db
    .insert(users)
    .values({
      displayName: 'Notes Test Member',
      email: 'notes-test-member@tradingroom.invalid',
      role: 'staff',
      status: 'offline',
      createdAt: now
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { displayName: 'Notes Test Member' }
    })
    .returning({ id: users.id })
    .get().id;
});

beforeEach(cleanupNotes);
afterAll(() => {
  cleanupNotes();
  db.delete(users)
    .where(
      inArray(users.email, [
        'notes-test-owner@tradingroom.invalid',
        'notes-test-member@tradingroom.invalid'
      ])
    )
    .run();
});

describe('notes repository', () => {
  test('creates notes at the next visible position', () => {
    const first = createNote({
      room: ROOM,
      name: TEST_NAMES[0],
      now: new Date('2036-07-27T12:00:00.000Z'),
      userId: primaryUserId
    });
    const second = createNote({
      room: ROOM,
      name: TEST_NAMES[1],
      now: new Date('2036-07-27T12:00:01.000Z'),
      userId: primaryUserId
    });

    expect(second.position).toBe(first.position + 1);
    expect(
      getNotes(ROOM)
        .filter(({ id }) => id === first.id || id === second.id)
        .map(({ id }) => id)
    ).toEqual([first.id, second.id]);
  });

  test('coalesces same-author saves within 30 seconds and starts distinct versions', () => {
    const note = createNote({
      room: ROOM,
      name: TEST_NAMES[2],
      now: new Date('2036-07-27T12:30:00.000Z'),
      userId: primaryUserId
    });
    saveNote({
      room: ROOM,
      contentHtml: '<p>first</p>',
      noteId: note.id,
      now: new Date('2036-07-27T12:30:01.000Z'),
      userId: primaryUserId
    });
    saveNote({
      room: ROOM,
      contentHtml: '<p>coalesced</p>',
      noteId: note.id,
      now: new Date('2036-07-27T12:30:20.000Z'),
      userId: primaryUserId
    });

    expect(getNoteVersions(ROOM, note.id)).toEqual([
      expect.objectContaining({ contentHtml: '<p>coalesced</p>', version: 1 })
    ]);

    saveNote({
      room: ROOM,
      contentHtml: '<p>different author</p>',
      noteId: note.id,
      now: new Date('2036-07-27T12:30:25.000Z'),
      userId: secondUserId
    });
    saveNote({
      room: ROOM,
      contentHtml: '<p>third version</p>',
      noteId: note.id,
      now: new Date('2036-07-27T12:31:00.000Z'),
      userId: primaryUserId
    });

    expect(getNoteVersions(ROOM, note.id)?.map(({ version }) => version)).toEqual([3, 2, 1]);
  });

  test('sanitizes historical rows again whenever notes and versions are read', () => {
    const unsafeHtml =
      '<p>historic <strong>plan</strong><script>alert(1)</script></p>' +
      '<img src="javascript:alert(2)" onerror="alert(3)" alt="chart">';
    const safeHtml = '<p>historic <strong>plan</strong></p><img alt="chart" />';
    const note = createNote({
      room: ROOM,
      name: TEST_NAMES[3],
      now: new Date('2036-07-27T13:00:00.000Z'),
      userId: primaryUserId
    });
    const createdAt = new Date('2036-07-27T13:00:01.000Z');
    db.update(notes)
      .set({ contentHtml: unsafeHtml, updatedAt: createdAt })
      .where(eq(notes.id, note.id))
      .run();
    db.insert(noteVersions)
      .values({
        noteId: note.id,
        contentHtml: unsafeHtml,
        updatedById: primaryUserId,
        version: 1,
        createdAt,
        updatedAt: createdAt
      })
      .run();

    expect(getNotes(ROOM).find(({ id }) => id === note.id)?.contentHtml).toBe(safeHtml);
    expect(getNoteVersions(ROOM, note.id)?.[0]?.contentHtml).toBe(safeHtml);
  });

  test('restores a sanitized historical version into a new immutable head', () => {
    const unsafeHtml = '<p>restore me<script>alert(1)</script></p>';
    const safeHtml = '<p>restore me</p>';
    const note = createNote({
      room: ROOM,
      name: TEST_NAMES[4],
      now: new Date('2036-07-27T13:30:00.000Z'),
      userId: primaryUserId
    });
    const sourceDate = new Date('2036-07-27T13:30:01.000Z');
    const sourceVersion = db
      .insert(noteVersions)
      .values({
        noteId: note.id,
        contentHtml: unsafeHtml,
        updatedById: primaryUserId,
        version: 1,
        createdAt: sourceDate,
        updatedAt: sourceDate
      })
      .returning({ id: noteVersions.id })
      .get();

    const restored = restoreNoteVersion({
      room: ROOM,
      noteId: note.id,
      now: new Date('2036-07-27T13:30:02.000Z'),
      userId: secondUserId,
      versionId: sourceVersion.id
    });
    const rawVersions = db
      .select({ contentHtml: noteVersions.contentHtml, version: noteVersions.version })
      .from(noteVersions)
      .where(eq(noteVersions.noteId, note.id))
      .all()
      .toSorted((left, right) => left.version - right.version);

    expect(restored?.contentHtml).toBe(safeHtml);
    expect(rawVersions).toEqual([
      { contentHtml: unsafeHtml, version: 1 },
      { contentHtml: safeHtml, version: 2 }
    ]);
  });

  test('renames only a visible note and records the actor and timestamp', () => {
    const note = createNote({
      room: ROOM,
      name: TEST_NAMES[5],
      now: new Date('2036-07-27T14:00:00.000Z'),
      userId: primaryUserId
    });
    const renamed = renameNote({
      room: ROOM,
      name: 'Renamed evidence note',
      noteId: note.id,
      now: new Date('2036-07-27T14:00:01.000Z'),
      userId: secondUserId
    });

    expect(renamed).toEqual(
      expect.objectContaining({
        id: note.id,
        name: 'Renamed evidence note',
        updatedById: secondUserId
      })
    );
    expect(
      renameNote({
        room: ROOM,
        name: 'Missing',
        noteId: 2_147_483_647,
        now: new Date('2036-07-27T14:00:02.000Z'),
        userId: primaryUserId
      })
    ).toBeNull();

    db.update(notes).set({ name: TEST_NAMES[5] }).where(eq(notes.id, note.id)).run();
  });

  test('soft-deletes a note and excludes it from the visible note list', () => {
    const note = createNote({
      room: ROOM,
      name: TEST_NAMES[6],
      now: new Date('2036-07-27T14:30:00.000Z'),
      userId: primaryUserId
    });
    const deleted = deleteNote({
      room: ROOM,
      noteId: note.id,
      now: new Date('2036-07-27T14:30:01.000Z'),
      userId: secondUserId
    });
    const raw = db.select().from(notes).where(eq(notes.id, note.id)).get();

    expect(deleted?.id).toBe(note.id);
    expect(raw?.deletedAt?.toISOString()).toBe('2036-07-27T14:30:01.000Z');
    expect(raw?.deletedById).toBe(secondUserId);
    expect(getNotes(ROOM).some(({ id }) => id === note.id)).toBe(false);
    expect(
      deleteNote({
        room: ROOM,
        noteId: note.id,
        now: new Date('2036-07-27T14:30:02.000Z'),
        userId: primaryUserId
      })
    ).toBeNull();
  });
});
