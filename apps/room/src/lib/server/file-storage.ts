import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

/**
 * Where uploaded room files live.
 *
 * NOT `static/`. Vite serves that directory from disk in dev, so a file written there would appear
 * to work and then vanish from a production build, which copies `static/` once at build time. This
 * directory sits next to the SQLite database instead, and `/uploads/[name]` serves out of it, so
 * dev and production behave the same.
 *
 * The eventual home is R2 - the capture uploads to `/sessions/v2/upload/...` and gets back a URL.
 * This keeps that shape: store bytes somewhere, put the URL in the row.
 */
const UPLOAD_ROOT = resolve(process.env.UPLOAD_DIR ?? '.data/uploads');

/** 25 MB. The capture sets no limit we can read, so this is ours, and it is enforced, not advisory. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type StoredFile = {
  storedName: string;
  url: string;
  size: number;
  kind: 'file' | 'image' | 'sound';
  contentType: string;
  sha256: string;
};

/**
 * The three buckets the Files pane sorts into.
 *
 * The capture branches on `contentType` at every point that matters - the row filter
 * (`e.contentType.indexOf('image/') >= 0`), the Play button, the tab counts in `calculateFiles()`.
 * Our schema stores that decision once, as `kind`, so the branch lives in one place.
 */
export function kindForContentType(contentType: string): StoredFile['kind'] {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('audio/')) return 'sound';
  return 'file';
}

/**
 * A safe on-disk name.
 *
 * The original name is kept in the database and shown in the UI; it is never used as a path. A
 * caller-controlled filename reaching the filesystem is how `../../` gets you, and browsers will
 * happily send one. The extension is carried over only after being stripped to word characters, so
 * `/uploads/x` cannot be talked into serving something else.
 */
function safeStoredName(originalName: string) {
  const extension = extname(originalName).toLowerCase();
  const safeExtension = /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '';
  return `${randomUUID()}${safeExtension}`;
}

export async function storeUpload(file: File): Promise<StoredFile> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`"${file.name}" is ${Math.round(file.size / 1024)}Kb; the limit is 25Mb.`);
  }
  if (file.size === 0) throw new Error(`"${file.name}" is empty.`);

  if (!existsSync(UPLOAD_ROOT)) mkdirSync(UPLOAD_ROOT, { recursive: true });

  const storedName = safeStoredName(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOAD_ROOT, storedName), bytes);

  const contentType = file.type || 'application/octet-stream';
  return {
    storedName,
    url: `/uploads/${storedName}`,
    size: bytes.byteLength,
    kind: kindForContentType(contentType),
    contentType,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
}

/**
 * Read a stored file back, or null if the name is not one we wrote.
 *
 * The name must match the shape `safeStoredName` produces. Anything else is refused before it
 * touches the filesystem, so a traversal attempt never becomes a read.
 */
export async function readStoredFile(storedName: string) {
  if (!/^[0-9a-f-]{36}(\.[a-z0-9]{1,8})?$/.test(storedName)) return null;
  const path = join(UPLOAD_ROOT, storedName);
  if (!resolve(path).startsWith(UPLOAD_ROOT)) return null;
  if (!existsSync(path)) return null;
  return readFile(path);
}

/**
 * Remove the bytes behind a stored URL.
 *
 * Missing is success: a row whose blob has already gone still needs its row deleted, and throwing
 * here would leave the database pointing at a file that does not exist. Anything that is not one of
 * our own `/uploads/<uuid>` URLs is ignored rather than resolved - fixture rows point elsewhere.
 */
export async function deleteStoredFile(url: string) {
  const storedName = url.startsWith('/uploads/') ? url.slice('/uploads/'.length) : null;
  if (!storedName || !/^[0-9a-f-]{36}(\.[a-z0-9]{1,8})?$/.test(storedName)) return false;
  const path = join(UPLOAD_ROOT, storedName);
  if (!resolve(path).startsWith(UPLOAD_ROOT)) return false;
  try {
    await rm(path, { force: true });
    return true;
  } catch {
    return false;
  }
}
