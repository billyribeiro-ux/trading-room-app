import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { and, asc, desc, eq, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { recordingLogEntries, recordings, users } from '#lib/server/db/schema.js';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { requireRecordingAccess } from '#lib/server/recording-access.js';
import { deleteRecordingFile } from '#lib/server/recording-storage.js';

const listInput = z.strictObject({
  beforeId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(100).default(50)
});

export const listRecordings = query(listInput, async ({ beforeId, limit }) => {
  ensureDatabase();
  const { locals, request } = getRequestEvent();
  const user = requireUser(locals);
  const roomShortCode = requireRoomShortCode(locals);
  await requireRecordingAccess({ request, roomShortCode, user }, 'read');

  const rows = db
    .select({
      id: recordings.id,
      title: recordings.title,
      contentType: recordings.contentType,
      size: recordings.size,
      sha256: recordings.sha256,
      durationMs: recordings.durationMs,
      startedAt: recordings.startedAt,
      endedAt: recordings.endedAt,
      createdAt: recordings.createdAt,
      logEntryCount: sql<number>`(
        SELECT count(*) FROM recording_log_entries entry
        WHERE entry.recording_id = ${recordings.id}
      )`,
      recordedBy: users.displayName
    })
    .from(recordings)
    .innerJoin(users, eq(users.id, recordings.recordedByUserId))
    .where(
      beforeId
        ? and(eq(recordings.roomShortCode, roomShortCode), lt(recordings.id, beforeId))
        : eq(recordings.roomShortCode, roomShortCode)
    )
    .orderBy(desc(recordings.id))
    .limit(limit + 1)
    .all();
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    rows: page.map((row) => ({
      ...row,
      startedAt: row.startedAt.getTime(),
      endedAt: row.endedAt.getTime(),
      createdAt: row.createdAt.getTime(),
      mediaUrl: `/recordings/${row.id}/media`
    })),
    nextBeforeId: hasMore ? (page.at(-1)?.id ?? null) : null
  };
});

export const recordingTranscript = query(
  z.strictObject({ id: z.number().int().positive() }),
  async ({ id }) => {
    ensureDatabase();
    const { locals, request } = getRequestEvent();
    const user = requireUser(locals);
    const roomShortCode = requireRoomShortCode(locals);
    await requireRecordingAccess({ request, roomShortCode, user }, 'read');
    const recording = db
      .select({ id: recordings.id })
      .from(recordings)
      .where(and(eq(recordings.id, id), eq(recordings.roomShortCode, roomShortCode)))
      .get();
    if (!recording) error(404, 'No such recording.');
    return db
      .select({
        id: recordingLogEntries.id,
        sourceKind: recordingLogEntries.sourceKind,
        channel: recordingLogEntries.channel,
        senderName: recordingLogEntries.senderName,
        body: recordingLogEntries.body,
        occurredAt: recordingLogEntries.occurredAt
      })
      .from(recordingLogEntries)
      .where(eq(recordingLogEntries.recordingId, id))
      .orderBy(asc(recordingLogEntries.occurredAt), asc(recordingLogEntries.id))
      .all()
      .map((entry) => ({ ...entry, occurredAt: entry.occurredAt.getTime() }));
  }
);

export const deleteRecording = command(
  z.strictObject({ id: z.number().int().positive() }),
  async ({ id }) => {
    ensureDatabase();
    const { locals, request } = getRequestEvent();
    const user = requireUser(locals);
    const roomShortCode = requireRoomShortCode(locals);
    await requireRecordingAccess({ request, roomShortCode, user }, 'write');
    const removed = db
      .delete(recordings)
      .where(and(eq(recordings.id, id), eq(recordings.roomShortCode, roomShortCode)))
      .returning({ storedName: recordings.storedName })
      .get();
    if (!removed) error(404, 'No such recording.');
    await deleteRecordingFile(removed.storedName).catch((cause) => {
      console.error('[recordings] orphaned media file after metadata deletion', {
        id,
        cause: cause instanceof Error ? cause.message : String(cause)
      });
    });
  }
);
