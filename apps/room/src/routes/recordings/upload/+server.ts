import { error, json } from '@sveltejs/kit';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { alerts, messages, recordingLogEntries, recordings, users } from '#lib/server/db/schema.js';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { requireRecordingAccess } from '#lib/server/recording-access.js';
import {
  deleteRecordingFile,
  storeRecordingStream,
  type RecordingContentType
} from '#lib/server/recording-storage.js';
import type { RequestHandler } from './$types';

const ALLOWED_TYPES = new Set<RecordingContentType>(['video/webm', 'video/mp4']);

function decodedHeader(request: Request, name: string): string {
  const raw = request.headers.get(name) ?? '';
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    error(400, `The ${name} header is invalid.`);
  }
}

export const POST: RequestHandler = async ({ request, locals, url }) => {
  const user = requireUser(locals);
  const roomShortCode = requireRoomShortCode(locals);
  const origin = request.headers.get('origin');
  if (origin !== url.origin) error(403, 'Cross-origin recording uploads are not allowed.');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    error(403, 'Cross-site recording uploads are not allowed.');
  }
  const access = await requireRecordingAccess({ request, roomShortCode, user }, 'write');

  const body = request.body;
  if (!body) error(400, 'A recording body is required.');
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
  if (!ALLOWED_TYPES.has(contentType as RecordingContentType)) {
    error(415, 'Only WebM and MP4 recordings are accepted.');
  }
  const title = decodedHeader(request, 'x-recording-name').slice(0, 200);
  if (!title) error(400, 'A recording name is required.');
  const durationMs = Number(request.headers.get('x-recording-duration-ms'));
  const startedAtMs = Number(request.headers.get('x-recording-started-at'));
  const now = Date.now();
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0 || durationMs > 24 * 60 * 60_000) {
    error(400, 'The recording duration is invalid.');
  }
  if (
    !Number.isSafeInteger(startedAtMs) ||
    startedAtMs > now + 5 * 60_000 ||
    startedAtMs < now - 24 * 60 * 60_000
  ) {
    error(400, 'The recording start time is invalid.');
  }
  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);

  ensureDatabase();
  let stored: Awaited<ReturnType<typeof storeRecordingStream>>;
  try {
    stored = await storeRecordingStream({
      body,
      contentType: contentType as RecordingContentType,
      contentLength
    });
  } catch (cause) {
    error(413, cause instanceof Error ? cause.message : 'The recording could not be stored.');
  }

  try {
    const startedAt = new Date(startedAtMs);
    const endedAt = new Date(startedAtMs + durationMs);
    const chatRows =
      access.config.settings.recordChat === true
        ? db
            .select({
              sourceId: messages.id,
              channel: messages.room,
              senderName: users.displayName,
              body: messages.body,
              occurredAt: messages.createdAt
            })
            .from(messages)
            .innerJoin(users, eq(users.id, messages.senderId))
            .where(
              and(
                eq(messages.roomShortCode, roomShortCode),
                gte(messages.createdAt, startedAt),
                lte(messages.createdAt, endedAt)
              )
            )
            .orderBy(asc(messages.createdAt), asc(messages.id))
            .all()
        : [];
    const alertRows =
      access.config.settings.recordChat === true
        ? db
            .select({
              sourceId: alerts.id,
              senderName: users.displayName,
              body: alerts.body,
              occurredAt: alerts.createdAt
            })
            .from(alerts)
            .innerJoin(users, eq(users.id, alerts.senderId))
            .where(
              and(
                eq(alerts.roomShortCode, roomShortCode),
                gte(alerts.createdAt, startedAt),
                lte(alerts.createdAt, endedAt)
              )
            )
            .orderBy(asc(alerts.createdAt), asc(alerts.id))
            .all()
        : [];
    const row = db.transaction((transaction) => {
      const inserted = transaction
        .insert(recordings)
        .values({
          roomShortCode,
          recordedByUserId: user.id,
          title,
          storedName: stored.storedName,
          contentType: contentType as RecordingContentType,
          size: stored.size,
          sha256: stored.sha256,
          durationMs,
          startedAt,
          endedAt,
          createdAt: new Date()
        })
        .returning({ id: recordings.id })
        .get();
      if (!inserted) throw new Error('recording metadata was not stored');
      const entries = [
        ...chatRows.map((entry) => ({
          recordingId: inserted.id,
          sourceKind: 'chat' as const,
          sourceId: entry.sourceId,
          channel: entry.channel,
          senderName: entry.senderName,
          body: entry.body,
          occurredAt: entry.occurredAt
        })),
        ...alertRows.map((entry) => ({
          recordingId: inserted.id,
          sourceKind: 'alert' as const,
          sourceId: entry.sourceId,
          channel: null,
          senderName: entry.senderName,
          body: entry.body,
          occurredAt: entry.occurredAt
        }))
      ].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
      if (entries.length > 0) transaction.insert(recordingLogEntries).values(entries).run();
      return inserted;
    });
    if (!row) throw new Error('recording metadata was not stored');
    return json({ id: row.id }, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) {
    await deleteRecordingFile(stored.storedName);
    throw cause;
  }
};
