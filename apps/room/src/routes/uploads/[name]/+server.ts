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

/**
 * The content types this route will render IN THE BROWSER, as an allow-list.
 *
 * ## The hole this closes
 *
 * `shared_files.content_type` is whatever the uploader's browser put on the multipart part —
 * `file.type`, straight from the client — and it is written unvalidated by `uploadFile`
 * (`files-pane.remote.ts`). `uploadComposerImage` narrows it to `image/`, which still admits
 * `image/svg+xml`, and it is reachable by an ORDINARY PARTICIPANT whenever the room's
 * `userUploads` setting is on.
 *
 * Serving that back as `Content-Disposition: inline` meant a member could upload
 * `evil.svg` — an `<svg>` carrying a `<script>` child that fetches from this room's own API —
 * post the link in chat, and have
 * every reader who clicked it execute the uploader's script as a DOCUMENT in the room's own
 * origin, with the room session cookie. `nosniff` does not help: the type is not being sniffed,
 * it is being asserted by the attacker, and `image/svg+xml` and `text/html` are honoured exactly
 * as sent.
 *
 * The controller already refuses SVG on the badge upload for this precise reason, in as many
 * words: *"an SVG is a document, it can carry script, and these are rendered back into the page."*
 * That rule is applied here too.
 *
 * ## Why an allow-list and not a list of the dangerous ones
 *
 * Deny-by-default. `text/html`, `image/svg+xml`, `application/xhtml+xml` and XML-with-XSLT are
 * the ones anybody thinks of; `text/xsl` and whatever a browser learns to execute next are the
 * ones a deny-list misses. Anything not named below is handed over as a DOWNLOAD, which creates
 * no document and therefore runs nothing — and is what the browser would have done with it
 * anyway, since it cannot display it.
 *
 * Every entry here is a type a browser renders and CANNOT execute script from: raster images
 * (never `image/svg+xml`), audio, video, PDF, and plain text — which `nosniff` pins as text.
 *
 * ## What does NOT change
 *
 * `Content-Disposition` is ignored for subresource loads, so an `<img src="/uploads/…">` in a
 * note or a chat message still renders, an SVG among them — and an SVG loaded through `<img>`
 * cannot run script, which is the whole reason that distinction exists. Only following the link
 * to the file itself changes, and only for types that could otherwise become a document.
 */
const RENDERABLE_INLINE = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/flac',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'application/pdf',
  'text/plain'
]);
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

  /*
    The row's type is the uploader's assertion, so it decides how the bytes are FRAMED, never
    whether they may run. See `RENDERABLE_INLINE` above for the attack this refuses.

    `.toLowerCase()` before the lookup because a content type is case-insensitive per RFC 9110 and
    `IMAGE/PNG` is the same type as `image/png`; a case-sensitive allow-list would send a
    legitimate upload to the downloads folder. A parameter — `text/plain; charset=utf-8` — is
    likewise not part of the type, so only the part before the first `;` is matched.
  */
  const declaredType = row.contentType || 'application/octet-stream';
  const bareType = declaredType.split(';')[0].trim().toLowerCase();
  const inline = RENDERABLE_INLINE.has(bareType);

  const headers: Record<string, string> = {
    'Content-Type': declaredType,
    'Content-Length': String(bytes.byteLength),
    'X-Content-Type-Options': 'nosniff',
    // Immutable: the stored name is a UUID, so the bytes behind a URL never change.
    'Cache-Control': 'private, max-age=31536000, immutable',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(row.name)}"`
  };

  /*
    Belt AND braces on exactly the responses that need it.

    `Content-Disposition: attachment` stops a NAVIGATION from becoming a document, which is the
    reachable vector — a link in chat. It is not honoured by `<object>` and `<embed>`, which is a
    narrower vector (it needs markup injection into the room page first) but not a theoretical
    one. An opaque-origin sandbox with no sources closes that too: even if something does build a
    document out of these bytes, it has no origin to be same-origin with and no script to run.

    Deliberately NOT set on the inline branch. A CSP on a PDF or a media response is a live
    question — browsers hand those to viewers rather than to a plain document — and this route's
    job today is to stop untrusted markup executing, not to experiment with how Chrome's PDF
    viewer reacts to `sandbox`. The inline branch only ever serves types that cannot execute.
  */
  if (!inline) headers['Content-Security-Policy'] = "default-src 'none'; sandbox";

  return new Response(new Uint8Array(bytes), { headers });
};
