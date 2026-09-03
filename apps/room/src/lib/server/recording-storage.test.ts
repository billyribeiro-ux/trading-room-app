import { describe, expect, it } from 'vitest';
import { deleteRecordingFile, recordingFile, storeRecordingStream } from './recording-storage.js';

describe('recording storage', () => {
  it('streams, hashes, publishes atomically, and removes a WebM recording', async () => {
    const bytes = new TextEncoder().encode('recording-bytes');
    const stored = await storeRecordingStream({
      body: new Blob([bytes]).stream(),
      contentType: 'video/webm',
      contentLength: bytes.byteLength
    });
    try {
      expect(stored.storedName).toMatch(/^[0-9a-f-]{36}\.webm$/);
      expect(stored.size).toBe(bytes.byteLength);
      expect(stored.sha256).toBe(
        '1a656a301805a7df373828a001d069b7da8442a1428e756de4f8226a821f81ae'
      );
      expect(await recordingFile(stored.storedName)).toMatchObject({ size: bytes.byteLength });
    } finally {
      await deleteRecordingFile(stored.storedName);
    }
    expect(await recordingFile(stored.storedName)).toBeNull();
  });

  it('refuses a body shorter than its declared length and leaves no published file', async () => {
    await expect(
      storeRecordingStream({
        body: new Blob(['short']).stream(),
        contentType: 'video/mp4',
        contentLength: 99
      })
    ).rejects.toThrow('ended before its declared Content-Length');
  });

  it('never resolves a caller-controlled path', async () => {
    expect(await recordingFile('../../etc/passwd')).toBeNull();
  });
});
