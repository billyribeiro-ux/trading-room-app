import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { Readable } from 'node:stream';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { recordings } from '#lib/server/db/schema.js';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { requireRecordingAccess } from '#lib/server/recording-access.js';
import { recordingFile, recordingReadStream } from '#lib/server/recording-storage.js';
import type { RequestHandler } from './$types';

function rangeOf(
  header: string | null,
  size: number
): { start: number; end: number } | null | false {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return false;
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  ) {
    return false;
  }
  return { start, end: Math.min(end, size - 1) };
}

const serve: RequestHandler = async ({ params, request, locals }) => {
  const user = requireUser(locals);
  const roomShortCode = requireRoomShortCode(locals);
  await requireRecordingAccess({ request, roomShortCode, user }, 'read');
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) error(404, 'No such recording.');
  ensureDatabase();
  const row = db
    .select()
    .from(recordings)
    .where(and(eq(recordings.id, id), eq(recordings.roomShortCode, roomShortCode)))
    .get();
  if (!row) error(404, 'No such recording.');
  const file = await recordingFile(row.storedName);
  if (!file || file.size !== row.size) error(410, 'This recording file is unavailable.');

  const range = rangeOf(request.headers.get('range'), file.size);
  if (range === false) {
    return new Response(null, {
      status: 416,
      headers: { 'content-range': `bytes */${file.size}`, 'accept-ranges': 'bytes' }
    });
  }
  const start = range?.start;
  const end = range?.end;
  const length = range ? end! - start! + 1 : file.size;
  const headers = new Headers({
    'content-type': row.contentType,
    'content-length': String(length),
    'accept-ranges': 'bytes',
    'cache-control': 'private, max-age=3600',
    'x-content-type-options': 'nosniff',
    'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.title)}`
  });
  if (range) headers.set('content-range', `bytes ${range.start}-${range.end}/${file.size}`);
  if (request.method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers });

  const stream = recordingReadStream(file.path, start, end);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: range ? 206 : 200,
    headers
  });
};

export const GET = serve;
export const HEAD = serve;
