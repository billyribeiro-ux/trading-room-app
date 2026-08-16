import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { sharedFiles } from '#lib/server/db/schema.js';
import { readStoredFile } from '#lib/server/file-storage.js';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import type { RequestHandler } from './$types';

/**
 * Serves an uploaded room file.
 *
 * Behind `requireUser`, because room files are not public. The capture serves them from an
 * authenticated API path (`/sessions/v2/...`), so an unauthenticated URL here would be strictly
 * more permissive than the app being reproduced.
 *
 * The content type is read from the row rather than sniffed from the bytes, and the file is served
 * with `X-Content-Type-Options: nosniff` so a browser cannot be talked into executing an upload as
 * something else.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  requireUser(locals);
  ensureDatabase();

  /*
    Scoped to the caller's own room, not merely to "signed in".

    The stored name is a UUID, but the URL is handed to every member of the room that owns the file
    and appears in chat, so it is not a secret. Without the room predicate any authenticated user
    of ANY room could fetch any other room's uploads by replaying one — and a file pane is exactly
    where a room's private material ends up. 404, not 403: a stranger learns nothing about whether
    the file exists.
  */
  const url = `/uploads/${params.name}`;
  const row = db
    .select()
    .from(sharedFiles)
    .where(
      and(eq(sharedFiles.roomShortCode, requireRoomShortCode(locals)), eq(sharedFiles.url, url))
    )
    .get();
  if (!row) throw error(404, 'No such file.');

  const bytes = await readStoredFile(params.name);
  if (!bytes) throw error(404, 'No such file.');

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': row.contentType || 'application/octet-stream',
      'Content-Length': String(bytes.byteLength),
      'X-Content-Type-Options': 'nosniff',
      // Immutable: the stored name is a UUID, so the bytes behind a URL never change.
      'Cache-Control': 'private, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${encodeURIComponent(row.name)}"`
    }
  });
};
