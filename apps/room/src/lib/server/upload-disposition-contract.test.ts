import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { sharedFiles, users } from '#lib/server/db/schema.js';
import { GET } from '../../routes/uploads/[name]/+server';

/*
  AN UPLOAD MAY NOT BECOME A DOCUMENT IN THIS ROOM'S ORIGIN.

  ## The hole, and why it was reachable

  `shared_files.content_type` is whatever the uploader's browser put on the multipart part —
  `file.type`, straight from the client — and `uploadFile` writes it unvalidated.
  `uploadComposerImage` narrows it to `image/`, which still admits `image/svg+xml`, and it is
  reachable by an ORDINARY PARTICIPANT whenever the room's `userUploads` setting is on.

  Served back as `Content-Disposition: inline`, that let a member upload
  `<svg><script>…</script></svg>`, post the link in chat, and have every reader who followed it
  execute the uploader's script AS A DOCUMENT in the room's own origin, carrying the room session
  cookie. `X-Content-Type-Options: nosniff` does not help: nothing is being sniffed. The type is
  being ASSERTED by the attacker, and `image/svg+xml` and `text/html` are honoured exactly as sent.

  The controller already refuses SVG on badge upload for this precise reason, in as many words:
  *"an SVG is a document, it can carry script, and these are rendered back into the page."*

  ## Why this file exists at all

  The fix landed with a scratch probe named `zz-tmp-…`, which was deleted. **A stored-XSS control
  with no test is one refactor from being gone**, and this repository's unit of work is the reason
  AND the test that enforces it. This is that test, written the way the rest of the suite writes a
  database one (`stream-names.test.ts`'s harness) rather than as a throwaway.

  It drives the REAL handler against REAL rows. A source assertion would keep passing if the
  allow-list stayed and the branch that reads it were removed.
*/

const ROOM = 'updisp';
const OTHER_ROOM = 'updisp2';
const EMAIL = `upload-disposition-${randomUUID()}@tradingroom.invalid`;

let uploaderId = 0;
/** label -> the stored (UUID) filename, which is what the route is asked for. */
const stored: Record<string, string> = {};

/**
 * Every type this test uploads, and what the route must do with it.
 *
 * The dangerous four are the ones a browser will build a DOCUMENT from. `text/xsl` is in the list
 * deliberately: it is the one most people forget, and it is the reason the route allow-LISTS rather
 * than deny-lists — a deny-list is only ever as good as the last browser feature somebody read about.
 */
const CASES = [
  { label: 'svg', type: 'image/svg+xml', inline: false },
  { label: 'html', type: 'text/html', inline: false },
  { label: 'xhtml', type: 'application/xhtml+xml', inline: false },
  { label: 'xsl', type: 'text/xsl', inline: false },
  { label: 'unknown', type: 'application/octet-stream', inline: false },
  { label: 'png', type: 'image/png', inline: true },
  { label: 'pdf', type: 'application/pdf', inline: true },
  { label: 'mp4', type: 'video/mp4', inline: true },
  /* Case and parameters are not part of the type — RFC 9110. A legitimate upload must not be sent
     to the downloads folder because its browser wrote `IMAGE/PNG` or added a charset. */
  { label: 'uppercase', type: 'IMAGE/PNG', inline: true },
  { label: 'parameterised', type: 'text/plain; charset=utf-8', inline: true }
] as const;

function cleanup(): void {
  db.delete(sharedFiles)
    .where(inArray(sharedFiles.roomShortCode, [ROOM, OTHER_ROOM]))
    .run();
}

beforeAll(() => {
  ensureDatabase();
  cleanup();
  const root = join(process.cwd(), '.data/uploads');
  mkdirSync(root, { recursive: true });

  const uploader = db
    .insert(users)
    .values({ displayName: 'Uploader', email: EMAIL, createdAt: new Date() })
    .returning()
    .get();
  uploaderId = uploader.id;

  for (const { label, type } of CASES) {
    const name = `${randomUUID()}.bin`;
    writeFileSync(join(root, name), Buffer.from('x'));
    stored[label] = name;
    db.insert(sharedFiles)
      .values({
        roomShortCode: ROOM,
        name: `${label}.file`,
        kind: 'file',
        url: `/uploads/${name}`,
        contentType: type,
        size: 1,
        uploadedBy: uploaderId,
        createdAt: new Date()
      })
      .run();
  }
});

afterAll(cleanup);

const fetchAs = (name: string, room = ROOM) =>
  GET({
    params: { name },
    locals: { user: { id: uploaderId }, sessionId: 's', roomShortCode: room }
  } as never) as Promise<Response>;

describe('what a browser is allowed to do with an upload', () => {
  it('drives the real handler over real rows', () => {
    /* The floor. Every assertion below would pass vacuously against an empty fixture. */
    expect(Object.keys(stored)).toHaveLength(CASES.length);
    expect(uploaderId).toBeGreaterThan(0);
  });

  for (const { label, type, inline } of CASES) {
    it(`${inline ? 'renders' : 'downloads'} ${type}`, async () => {
      const res = await fetchAs(stored[label]);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition'), `${type} disposition`).toMatch(
        inline ? /^inline;/ : /^attachment;/
      );
    });
  }

  it('sandboxes every downloaded response, because disposition alone is not enough', async () => {
    /*
      `Content-Disposition: attachment` stops a NAVIGATION becoming a document — the reachable
      vector, a link in chat. It is NOT honoured by `<object>`/`<embed>`. An opaque-origin sandbox
      with no sources closes that too: whatever builds a document out of these bytes has no origin
      to be same-origin with and no script to run.
    */
    for (const { label, type } of CASES.filter((c) => !c.inline)) {
      const res = await fetchAs(stored[label]);
      expect(res.headers.get('content-security-policy'), type).toBe("default-src 'none'; sandbox");
    }
  });

  it('and does NOT put a CSP on the inline branch', async () => {
    /* Deliberate: a CSP on a PDF or media response is a live question about viewers, and the inline
       branch only ever serves types that cannot execute. Asserted so the choice stays a choice. */
    for (const { label, type } of CASES.filter((c) => c.inline)) {
      const res = await fetchAs(stored[label]);
      expect(res.headers.get('content-security-policy'), type).toBeNull();
    }
  });

  it('always sends nosniff, on both branches', async () => {
    for (const label of ['svg', 'png']) {
      const res = await fetchAs(stored[label]);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    }
  });

  it('refuses a file belonging to ANOTHER room, with 404 rather than 403', async () => {
    /*
      The stored name is a UUID but it is not a secret — it is handed to every member of the owning
      room and appears in chat. Without the room predicate any authenticated user of any room could
      replay one. 404 so a stranger learns nothing about whether the file exists.
    */
    await expect(fetchAs(stored.png, OTHER_ROOM)).rejects.toMatchObject({ status: 404 });
  });
});
