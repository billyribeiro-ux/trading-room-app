import { and, asc, desc, eq, isNull, max } from 'drizzle-orm';
import type { NoteVersion, RoomNote } from '#lib/types.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import {
  notes,
  noteVersions,
  type Note,
  type NoteVersion as StoredNoteVersion
} from '#lib/server/db/schema.js';
import { sanitizeNoteHtml } from '#lib/server/notes.js';

const COALESCE_WINDOW_MS = 30_000;

function noteDto(row: Note): RoomNote {
  return {
    id: row.id,
    name: row.name,
    contentHtml: row.contentHtml === null ? null : sanitizeNoteHtml(row.contentHtml),
    isWelcomeMat: row.isWelcomeMat,
    position: row.position,
    updatedById: row.updatedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function noteVersionDto(row: StoredNoteVersion): NoteVersion {
  return {
    id: row.id,
    noteId: row.noteId,
    contentHtml: row.contentHtml === null ? null : sanitizeNoteHtml(row.contentHtml),
    updatedById: row.updatedById,
    version: row.version,
    createdAt: row.createdAt.toISOString()
  };
}

/*
  Every note query is scoped to one room.

  The original serves notes under the session like everything else, and the controller's own
  `allRoomsWelcomeMatPW` help text — "Presenters will need to enter the password to replace all the
  rooms welcome mats" — says plainly that a welcome mat belongs to a room, plural rooms each having
  their own.

  `noteVersions` deliberately carries no room column: a version reaches its note through `note_id`,
  and every path here validates that note against the room first. A second copy of the same fact is
  a second thing to keep in step.
*/
export function getNotes(room: string): readonly RoomNote[] {
  ensureDatabase();
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.roomShortCode, room), isNull(notes.deletedAt)))
    .orderBy(asc(notes.position), asc(notes.createdAt), asc(notes.id))
    .all()
    .map(noteDto);
}

export function createNote(input: {
  room: string;
  name: string;
  now: Date;
  userId: number;
}): RoomNote {
  ensureDatabase();
  return db.transaction((transaction) => {
    // The next position within THIS room, so two rooms do not fight over one ordering.
    const position = transaction
      .select({ position: max(notes.position) })
      .from(notes)
      .where(and(eq(notes.roomShortCode, input.room), isNull(notes.deletedAt)))
      .get()?.position;
    const row = transaction
      .insert(notes)
      .values({
        roomShortCode: input.room,
        name: input.name,
        position: (position ?? -1) + 1,
        updatedById: input.userId,
        createdAt: input.now,
        updatedAt: input.now
      })
      .returning()
      .get();
    return noteDto(row);
  });
}

export function saveNote(input: {
  room: string;
  contentHtml: string;
  noteId: number;
  now: Date;
  userId: number;
}): RoomNote | null {
  ensureDatabase();
  return db.transaction((transaction) => {
    const current = transaction
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.roomShortCode, input.room),
          eq(notes.id, input.noteId),
          isNull(notes.deletedAt)
        )
      )
      .get();
    // Refuses a note id from another room, which is what makes the version writes below safe.
    if (current === undefined) return null;

    const latest = transaction
      .select()
      .from(noteVersions)
      .where(eq(noteVersions.noteId, input.noteId))
      .orderBy(desc(noteVersions.version))
      .get();
    const sanitizedHtml = sanitizeNoteHtml(input.contentHtml);
    const cutoff = input.now.getTime() - COALESCE_WINDOW_MS;

    if (
      latest !== undefined &&
      latest.updatedById === input.userId &&
      latest.updatedAt.getTime() >= cutoff
    ) {
      transaction
        .update(noteVersions)
        .set({ contentHtml: sanitizedHtml, updatedAt: input.now })
        .where(eq(noteVersions.id, latest.id))
        .run();
    } else {
      transaction
        .insert(noteVersions)
        .values({
          noteId: input.noteId,
          contentHtml: sanitizedHtml,
          updatedById: input.userId,
          version: (latest?.version ?? 0) + 1,
          createdAt: input.now,
          updatedAt: input.now
        })
        .run();
    }

    const updated = transaction
      .update(notes)
      .set({
        contentHtml: sanitizedHtml,
        updatedAt: input.now,
        updatedById: input.userId
      })
      .where(
        and(
          eq(notes.roomShortCode, input.room),
          eq(notes.id, input.noteId),
          isNull(notes.deletedAt)
        )
      )
      .returning()
      .get();
    return updated === undefined ? null : noteDto(updated);
  });
}

export function renameNote(input: {
  room: string;
  name: string;
  noteId: number;
  now: Date;
  userId: number;
}): RoomNote | null {
  ensureDatabase();
  const updated = db
    .update(notes)
    .set({
      name: input.name,
      updatedAt: input.now,
      updatedById: input.userId
    })
    .where(
      and(eq(notes.roomShortCode, input.room), eq(notes.id, input.noteId), isNull(notes.deletedAt))
    )
    .returning()
    .get();
  return updated === undefined ? null : noteDto(updated);
}

export function deleteNote(input: {
  room: string;
  noteId: number;
  now: Date;
  userId: number;
}): RoomNote | null {
  ensureDatabase();
  const deleted = db
    .update(notes)
    .set({
      deletedAt: input.now,
      deletedById: input.userId,
      isWelcomeMat: false,
      updatedAt: input.now,
      updatedById: input.userId
    })
    .where(
      and(eq(notes.roomShortCode, input.room), eq(notes.id, input.noteId), isNull(notes.deletedAt))
    )
    .returning()
    .get();
  return deleted === undefined ? null : noteDto(deleted);
}

export function setWelcomeMatNote(input: {
  room: string;
  noteId: number;
  now: Date;
  userId: number;
}): RoomNote | null {
  ensureDatabase();
  return db.transaction((transaction) => {
    const target = transaction
      .select({ id: notes.id })
      .from(notes)
      .where(
        and(
          eq(notes.roomShortCode, input.room),
          eq(notes.id, input.noteId),
          isNull(notes.deletedAt)
        )
      )
      .get();
    if (target === undefined) return null;

    /*
      Demote the room's PREVIOUS welcome mat — this room's, and only this room's.

      Without the room predicate this cleared the flag on every undeleted note in the database, so
      one presenter choosing a welcome mat silently removed everybody else's. It was invisible while
      there was only ever one room.
    */
    transaction
      .update(notes)
      .set({ isWelcomeMat: false })
      .where(and(eq(notes.roomShortCode, input.room), isNull(notes.deletedAt)))
      .run();

    const updated = transaction
      .update(notes)
      .set({
        isWelcomeMat: true,
        updatedAt: input.now,
        updatedById: input.userId
      })
      .where(
        and(
          eq(notes.roomShortCode, input.room),
          eq(notes.id, input.noteId),
          isNull(notes.deletedAt)
        )
      )
      .returning()
      .get();
    return updated === undefined ? null : noteDto(updated);
  });
}

export function getNoteVersions(room: string, noteId: number): readonly NoteVersion[] | null {
  ensureDatabase();
  /*
    The note is resolved within the room FIRST, and the version list is read only if that
    succeeded. That ordering is what lets `note_versions` carry no room column of its own: a
    version is reachable only through a note this room owns.
  */
  const note = db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.roomShortCode, room), eq(notes.id, noteId), isNull(notes.deletedAt)))
    .get();
  if (note === undefined) return null;

  return db
    .select()
    .from(noteVersions)
    .where(eq(noteVersions.noteId, noteId))
    .orderBy(desc(noteVersions.version))
    .all()
    .map(noteVersionDto);
}

export function restoreNoteVersion(input: {
  room: string;
  noteId: number;
  now: Date;
  userId: number;
  versionId: number;
}): RoomNote | null {
  ensureDatabase();
  return db.transaction((transaction) => {
    const current = transaction
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.roomShortCode, input.room),
          eq(notes.id, input.noteId),
          isNull(notes.deletedAt)
        )
      )
      .get();
    // Room-checked before any version is read or written, as in `getNoteVersions`.
    if (current === undefined) return null;

    const source = transaction
      .select({ contentHtml: noteVersions.contentHtml })
      .from(noteVersions)
      .where(and(eq(noteVersions.noteId, input.noteId), eq(noteVersions.id, input.versionId)))
      .get();
    if (source === undefined) return null;

    const latestVersion = transaction
      .select({ version: noteVersions.version })
      .from(noteVersions)
      .where(eq(noteVersions.noteId, input.noteId))
      .orderBy(desc(noteVersions.version))
      .get()?.version;
    const restoredHtml = source.contentHtml === null ? null : sanitizeNoteHtml(source.contentHtml);

    transaction
      .insert(noteVersions)
      .values({
        noteId: input.noteId,
        contentHtml: restoredHtml,
        updatedById: input.userId,
        version: (latestVersion ?? 0) + 1,
        createdAt: input.now,
        updatedAt: input.now
      })
      .run();

    const updated = transaction
      .update(notes)
      .set({
        contentHtml: restoredHtml,
        updatedAt: input.now,
        updatedById: input.userId
      })
      .where(
        and(
          eq(notes.roomShortCode, input.room),
          eq(notes.id, input.noteId),
          isNull(notes.deletedAt)
        )
      )
      .returning()
      .get();
    return updated === undefined ? null : noteDto(updated);
  });
}
