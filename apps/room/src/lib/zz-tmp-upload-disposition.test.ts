import { describe, expect, it, beforeAll } from 'vitest';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { sharedFiles, users } from '#lib/server/db/schema.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GET } from '../routes/uploads/[name]/+server';

const ROOM = 'zz01';
let uploader: { id: number };
const names: Record<string, string> = {};

beforeAll(() => {
  ensureDatabase();
  const root = join(process.cwd(), '.data/uploads');
  mkdirSync(root, { recursive: true });
  uploader = db
    .insert(users)
    .values({ displayName: 'U', email: `u-${randomUUID()}@x.test`, createdAt: new Date() })
    .returning()
    .get();
  for (const [label, type] of [
    ['svg', 'image/svg+xml'],
    ['html', 'text/html'],
    ['png', 'image/png'],
    ['pdfcase', 'application/PDF; charset=utf-8']
  ] as const) {
    const stored = `${randomUUID()}.bin`;
    writeFileSync(join(root, stored), Buffer.from('x'));
    names[label] = stored;
    db.insert(sharedFiles)
      .values({
        roomShortCode: ROOM,
        name: `${label}.file`,
        kind: 'file',
        url: `/uploads/${stored}`,
        contentType: type,
        size: 1,
        uploadedBy: uploader.id,
        createdAt: new Date()
      })
      .run();
  }
});

async function fetchIt(label: string) {
  return (await GET({
    params: { name: names[label] },
    locals: { user: uploader, sessionId: 's', roomShortCode: ROOM }
  } as never)) as Response;
}

describe('uploads disposition', () => {
  it('serves an SVG and an HTML upload as a sandboxed download', async () => {
    for (const label of ['svg', 'html']) {
      const res = await fetchIt(label);
      expect(res.headers.get('content-disposition'), label).toMatch(/^attachment;/);
      expect(res.headers.get('content-security-policy'), label).toBe("default-src 'none'; sandbox");
    }
  });
  it('still renders a PNG inline, with no CSP, and matches type case-insensitively', async () => {
    const png = await fetchIt('png');
    expect(png.headers.get('content-disposition')).toMatch(/^inline;/);
    expect(png.headers.get('content-security-policy')).toBeNull();
    const pdf = await fetchIt('pdfcase');
    expect(pdf.headers.get('content-disposition')).toMatch(/^inline;/);
    expect(pdf.headers.get('content-type')).toBe('application/PDF; charset=utf-8');
  });
});
