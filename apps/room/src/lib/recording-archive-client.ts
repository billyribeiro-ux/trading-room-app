export interface RecordingUploadMetadata {
  name: string;
  startedAt: number;
  durationMs: number;
}

/** Streams the browser-created recording as the request body; no base64 or multipart copy. */
export async function uploadRecordingArchive(
  blob: Blob,
  metadata: RecordingUploadMetadata
): Promise<number> {
  const response = await fetch('/recordings/upload', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': blob.type.split(';')[0] || 'video/webm',
      'x-recording-name': encodeURIComponent(metadata.name),
      'x-recording-started-at': String(metadata.startedAt),
      'x-recording-duration-ms': String(metadata.durationMs)
    },
    body: blob
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Recording archive upload failed (${response.status}).`);
  }
  const result = (await response.json()) as { id?: unknown };
  if (typeof result.id !== 'number' || !Number.isSafeInteger(result.id) || result.id <= 0) {
    throw new Error('Recording archive upload returned no recording id.');
  }
  return result.id;
}

/** Owns the name/timing pair so the recorder can hand one completed blob to durable storage. */
export class RecordingArchiveLifecycle {
  #name: string | null = null;
  #startedAt: number | null = null;

  constructor(
    private readonly upload: typeof uploadRecordingArchive,
    private readonly onFailure: (cause: unknown) => void
  ) {}

  begin(): string {
    this.#startedAt = Date.now();
    this.#name = `room-recording-${new Date(this.#startedAt).toISOString()}`;
    return this.#name;
  }

  finish(blob: Blob): void {
    const startedAt = this.#startedAt ?? Date.now();
    const name = this.#name ?? `room-recording-${new Date(startedAt).toISOString()}`;
    this.#startedAt = null;
    this.#name = null;
    void this.upload(blob, {
      name,
      startedAt,
      durationMs: Math.max(1, Date.now() - startedAt)
    }).catch(this.onFailure);
  }
}
