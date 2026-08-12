/**
 * A real HTTP origin for the render harnesses, and the reason they need one.
 *
 * All three harnesses used to build their page with Playwright's `page.setContent()`. That gives
 * the document an OPAQUE origin, and Chromium refuses `file://` subresource fetches from one — so
 * every `@font-face` in the stylesheets failed, every Font Awesome glyph painted as the fallback
 * box, and the screenshots proved nothing about which icon rendered. Two harnesses carried a
 * comment disclaiming that as a limit of the harness. It was, and a disclaimer is not a fix: served
 * over `http://127.0.0.1`, the same fonts load and the glyph identity becomes provable.
 *
 * It is shared rather than copied because the defect was in all three scripts at once, and a
 * fourth copy of the fix is a fourth place to forget it.
 *
 * ## What it serves
 *
 * `/index.html` — whatever HTML the harness last set. Nothing is written to disk.
 * Everything else — the `mounts` map, longest prefix first, resolved and confined to its root so a
 * `..` in a stylesheet cannot read outside it.
 *
 * ## What it records
 *
 * Every request, with its status. That is what turns "the font did not load" from an assumption
 * into a network fact a harness can assert on and a failure can name — see {@link fontFailures}.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize, resolve, sep } from 'node:path';

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.eot': 'application/vnd.ms-fontobject',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const FONT_EXTENSIONS = new Set(['.woff2', '.woff', '.ttf', '.eot']);

/**
 * @param {{ mounts?: Record<string, string> }} options
 *   `mounts` maps a URL prefix onto a directory, e.g. `{ '/webfonts': '…/fontawesome-free/webfonts' }`.
 *   A stylesheet's `url(../webfonts/x.woff2)` seen from `/index.html` resolves to `/webfonts/x.woff2`,
 *   which is why that mount exists rather than a `<base>` tag rewriting every relative URL on the page.
 */
export async function startHarnessServer({ mounts = {} } = {}) {
  let html = '<!doctype html><title>harness</title>';
  /** @type {{ path: string; status: number }[]} */
  const requests = [];

  // Longest prefix first, so `/webfonts` cannot be shadowed by `/`.
  const table = Object.entries(mounts)
    .map(([prefix, root]) => [prefix.replace(/\/$/, ''), resolve(root)])
    .sort((a, b) => b[0].length - a[0].length);

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const path = decodeURIComponent(url.pathname);

    const finish = (status, body, type) => {
      requests.push({ path, status });
      response.writeHead(status, { 'content-type': type ?? 'text/plain; charset=utf-8' });
      response.end(body);
    };

    if (path === '/' || path === '/index.html') {
      finish(200, html, CONTENT_TYPES['.html']);
      return;
    }

    const mount = table.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
    if (!mount) {
      finish(404, 'no mount');
      return;
    }

    const [prefix, root] = mount;
    // Confined to the mount root: `normalize` collapses `..`, and the prefix check rejects anything
    // that climbed out of it.
    const target = resolve(root, `.${normalize(path.slice(prefix.length)) || '/'}`);
    if (target !== root && !target.startsWith(root + sep)) {
      finish(403, 'outside the mount');
      return;
    }

    readFile(target).then(
      (bytes) => finish(200, bytes, CONTENT_TYPES[extname(target)] ?? 'application/octet-stream'),
      () => finish(404, 'not found')
    );
  });

  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  const { port } = /** @type {{ port: number }} */ (server.address());

  return {
    origin: `http://127.0.0.1:${port}`,
    /** Replaces what `/index.html` serves. */
    setHtml(next) {
      html = next;
      requests.length = 0;
    },
    /** Every request this page made, with its status. */
    get requests() {
      return [...requests];
    },
    /** Font requests that did NOT return 200 — a real finding rather than a disclaimer. */
    get fontFailures() {
      return requests.filter(
        (entry) => FONT_EXTENSIONS.has(extname(entry.path)) && entry.status !== 200
      );
    },
    /** Font requests that DID return 200, so a harness can assert the faces actually arrived. */
    get fontsServed() {
      return requests.filter(
        (entry) => FONT_EXTENSIONS.has(extname(entry.path)) && entry.status === 200
      );
    },
    async close() {
      await new Promise((closed) => server.close(closed));
    }
  };
}

/**
 * SHA-256 of a file, for the image assertions.
 *
 * The harnesses wrote one PNG four times and did not notice, which made the picture half of them a
 * check that could not fail: four volume states whose whole purpose is three different glyphs
 * produced one byte-identical file. Hashing every capture and failing when two states that must
 * differ collide is what closes that.
 */
export async function fileDigest(path) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}
