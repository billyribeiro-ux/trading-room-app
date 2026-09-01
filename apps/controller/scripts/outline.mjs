/** Compact, complete structural outline of a served-DOM capture. */
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '');
/*
  THE MARKER IS ASSERTED, because `slice(indexOf(...))` without one cannot fail.

  `indexOf` returns -1 when the capture has no `<body`, and `slice(-1)` is the LAST CHARACTER of the
  file rather than an error. Everything below then walks one character, matches nothing, and this
  script writes an EMPTY outline and exits 0 — measured: a fragment with no `<body` produced
  `lines 0` and a zero-byte file, reported as success.

  It has a downstream floor and it is not the one to rely on. `extract-manage-schema.mjs` invokes
  this decoder and then refuses on `expected <N> editable settings; found 0`, so the schema
  pipeline does fail — but the failure names the SCHEMA, not the decode that produced nothing, and
  the other caller is a person decoding a capture by hand (`docs/PROCESS.md`), who gets an empty
  file and no complaint at all.

  So the marker is checked here, where the assumption is made.
*/
const bodyAt = src.indexOf('<body');
if (bodyAt === -1) {
  console.error(`no <body in ${process.argv[2]} — refusing to emit an outline of one character`);
  process.exit(1);
}
const body = src.slice(bodyAt);

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);
// `onaftersave` is kept for the same reason `onbeforesave` is, and its absence
// cost a real setting: the reference's xeditable rows carry BOTH an
// `editable-*` model binding and an `onaftersave="saveSessField('<field>')"`,
// and those two disagree on the Logout Webhook row — it edits
// `sess.login_webhook_url` while saving to `logout_webhook_url`. Keying a schema
// off the binding alone therefore loses whichever field the markup mis-binds.
const KEEP_ATTR =
  /^(ng-|editable|e-|onbeforesave|onaftersave|buttons|blur|type|placeholder|href|colspan|rowspan|id|for|name|value|checked|disabled|title|alt|src|style|role|aria-)/;

const out = [];
let depth = 0;
const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+)/g;
let m;
while ((m = re.exec(body))) {
  if (m[4] !== undefined) {
    const text = m[4].replace(/\s+/g, ' ').trim();
    /*
      1000, not 160.

      The old cap truncated any text node past 160 characters, and the schema generator reads its
      helper copy out of this file — so four settings shipped a helper cut off mid-sentence, and
      `room-settings-help.ts` carried a hand-written `CORRECTED` table restoring three of them by
      hand. The fourth, `chatTabsWithBadges`, was 203 characters and nobody had noticed.

      A cap is still wanted: this decoder is read by people, and one pathological node should not
      produce a megabyte line. 1000 clears the longest helper in the capture by five times over.
    */
    if (text) out.push('  '.repeat(depth) + '· ' + JSON.stringify(text.slice(0, 1000)));
    continue;
  }
  const [, close, tag, rawAttrs] = m;
  const t = tag.toLowerCase();
  if (close) {
    depth = Math.max(0, depth - 1);
    continue;
  }

  const attrs = {};
  const ar = /([:@\w-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
  let a;
  while ((a = ar.exec(rawAttrs))) {
    let v = a[2] ?? '';
    if (v.startsWith('"') || v.startsWith("'")) v = v.slice(1, -1);
    attrs[a[1]] = v;
  }
  const cls = (attrs.class || '')
    .split(/\s+/)
    .filter(
      (c) =>
        c &&
        !/^ng-(scope|binding|isolate|pristine|valid|invalid|dirty|untouched|touched|empty|not-empty|hide|animate)/.test(
          c
        )
    )
    .join('.');
  const extra = Object.entries(attrs)
    .filter(([k]) => k !== 'class' && KEEP_ATTR.test(k))
    .map(([k, v]) => `${k}=${JSON.stringify(v.length > 90 ? v.slice(0, 90) + '…' : v)}`)
    .join(' ');
  out.push('  '.repeat(depth) + `<${t}${cls ? '.' + cls : ''}${extra ? ' ' + extra : ''}>`);
  if (!VOID.has(t) && !rawAttrs.trimEnd().endsWith('/')) depth++;
}
writeFileSync(process.argv[3], out.join('\n'));
console.log('lines', out.length, '->', process.argv[3]);
