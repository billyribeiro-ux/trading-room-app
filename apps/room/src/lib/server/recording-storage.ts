import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { open, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { RECORDING_DIR, RECORDING_MAX_BYTES } from '$app/env/private';

const ROOT = resolve(RECORDING_DIR?.trim() || '.data/recordings');
const configuredMax = Number(RECORDING_MAX_BYTES);
export const MAX_RECORDING_BYTES =
  Number.isSafeInteger(configuredMax) && configuredMax > 0 ? configuredMax : 2 * 1024 ** 3;

export type RecordingContentType = 'video/webm' | 'video/mp4';

function pathFor(storedName: string): string | null {
  if (!/^[0-9a-f-]{36}\.(webm|mp4)$/.test(storedName)) return null;
  const path = resolve(join(ROOT, storedName));
  return dirname(path) === ROOT ? path : null;
}

/**
 * Streams a request body into a temporary file, hashing and enforcing the limit as bytes arrive.
 * The atomic rename is the publication point: a crash leaves, at worst, an unreferenced `.part`
 * file and never a catalog row pointing at a partial video.
 */
export async function storeRecordingStream(input: {
  body: ReadableStream<Uint8Array>;
  contentType: RecordingContentType;
  contentLength: number | null;
}): Promise<{ storedName: string; size: number; sha256: string }> {
  if (input.contentLength !== null) {
    if (!Number.isSafeInteger(input.contentLength) || input.contentLength <= 0) {
      throw new Error('The recording Content-Length is invalid.');
    }
    if (input.contentLength > MAX_RECORDING_BYTES) {
      throw new Error(`The recording exceeds the ${MAX_RECORDING_BYTES}-byte limit.`);
    }
  }
  if (!existsSync(ROOT)) mkdirSync(ROOT, { recursive: true, mode: 0o700 });
  const extension = input.contentType === 'video/mp4' ? 'mp4' : 'webm';
  const storedName = `${randomUUID()}.${extension}`;
  const finalPath = pathFor(storedName)!;
  const temporaryPath = `${finalPath}.${randomUUID()}.part`;
  const handle = await open(temporaryPath, 'wx', 0o600);
  const digest = createHash('sha256');
  let size = 0;
  try {
    const source = Readable.fromWeb(input.body as never);
    for await (const chunk of source) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      size += bytes.byteLength;
      if (size > MAX_RECORDING_BYTES) {
        throw new Error(`The recording exceeds the ${MAX_RECORDING_BYTES}-byte limit.`);
      }
      digest.update(bytes);
      await handle.write(bytes);
    }
    if (size === 0) throw new Error('The recording is empty.');
    if (input.contentLength !== null && size !== input.contentLength) {
      throw new Error('The recording ended before its declared Content-Length.');
    }
    await handle.sync();
    await handle.close();
    await rename(temporaryPath, finalPath);
    return { storedName, size, sha256: digest.digest('hex') };
  } catch (cause) {
    await handle.close().catch(() => undefined);
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw cause;
  }
}

export async function recordingFile(storedName: string) {
  const path = pathFor(storedName);
  if (!path) return null;
  try {
    const metadata = await stat(path);
    if (!metadata.isFile()) return null;
    return { path, size: metadata.size };
  } catch {
    return null;
  }
}

export function recordingReadStream(path: string, start?: number, end?: number) {
  return createReadStream(path, start === undefined ? undefined : { start, end });
}

export async function deleteRecordingFile(storedName: string): Promise<void> {
  const path = pathFor(storedName);
  if (path) await rm(path, { force: true });
}
