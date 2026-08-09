/** Compact, complete structural outline of a served-DOM capture. */
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '');
const body = src.slice(src.indexOf('<body'));

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
    if (text) out.push('  '.repeat(depth) + '· ' + JSON.stringify(text.slice(0, 160)));
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
