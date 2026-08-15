#!/usr/bin/env node
/**
 * Generates `src/lib/content/api-post-routes.ts` from the captured
 * `evidence-dumps/TIER1-fetched/api-post-routes.md`.
 *
 * ## Why this file exists
 *
 * The reference has TWO documentation pages, not one, and they are different documents:
 *
 *     account page   api-docs.html?src=/public/html/API_Documentation.md          "API Docs"
 *     manage tab     api-docs.html?src=/public/html/POST_ROUTE_API_DOCUMENTATION.md
 *                                                                    "API POST Routes Docs"
 *
 * Ours pointed BOTH buttons at the same page, so the one labelled "API POST Routes Docs" showed the
 * Sessions API reference instead — a button whose label describes a document it does not open.
 *
 * ## Why generated rather than hand-converted
 *
 * The source is 729 lines of captured markdown. Retyping it as HTML is how an endpoint name or a
 * parameter drifts out of step with the API it documents, which is the same reasoning already
 * written at the top of `api-docs.ts`. Generating keeps the `.md` as the single source of truth: it
 * is the evidence, it is SHA-pinned in `TIER1-fetched/README.md`, and this script is the only thing
 * that transforms it.
 *
 * ## It FAILS LOUD, and that is the point
 *
 * The document uses a bounded set of constructs — surveyed before this was written: h1-h4,
 * paragraphs, bullets, ordered lists, tables, fenced code, bold and inline code. No links, italics,
 * images or blockquotes. Anything outside that set THROWS rather than being dropped, because a
 * converter that silently skips what it does not understand produces a document that looks complete
 * and is not. If the capture is ever refreshed and gains a link, this stops and says so.
 *
 * Run: node apps/controller/scripts/extract-api-post-routes.mjs [--out <path>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SOURCE = resolve(ROOT, 'evidence-dumps/TIER1-fetched/api-post-routes.md');
const outIndex = process.argv.indexOf('--out');
const OUT = outIndex === -1 ? resolve(ROOT, 'src/lib/content/api-post-routes.ts') : resolve(process.argv[outIndex + 1]);

const fail = (line, why) => {
  throw new Error(`api-post-routes: line ${line}: ${why}`);
};

/** HTML-escape. Applied to every text node and every code block — the document contains `<`, `>`, `&`. */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Inline markup: bold and code only, which is all this document uses.
 *
 * Code FIRST, then bold, and bold is applied only outside code spans — otherwise `**` inside a
 * fenced example becomes markup. Escaping happens before either, so a `<` in the text survives.
 */
function inline(text, line) {
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) fail(line, 'a link appeared; this converter handles none');
  if (/!\[/.test(text)) fail(line, 'an image appeared; this converter handles none');
  const parts = esc(text).split(/(`[^`]+`)/g);
  return parts
    .map((p) =>
      p.startsWith('`') && p.endsWith('`') && p.length > 1
        ? `<code>${p.slice(1, -1)}</code>`
        : p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    )
    .join('');
}

const src = readFileSync(SOURCE, 'utf8').split('\n');
const html = [];
let i = 0;

while (i < src.length) {
  const raw = src[i];
  const line = i + 1;
  const s = raw.trim();

  if (!s) {
    i++;
    continue;
  }

  /* fenced code — copied verbatim, escaped, never interpreted */
  if (s.startsWith('```')) {
    const lang = s.slice(3).trim();
    const body = [];
    i++;
    while (i < src.length && !src[i].trim().startsWith('```')) {
      body.push(src[i]);
      i++;
    }
    if (i >= src.length) fail(line, 'unclosed code fence');
    i++;
    const cls = lang ? ` class="language-${lang.replace(/[^a-z0-9-]/gi, '')}"` : '';
    html.push(`<pre><code${cls}>${esc(body.join('\n'))}\n</code></pre>`);
    continue;
  }

  /* headings */
  const h = /^(#{1,6})\s+(.*)$/.exec(s);
  if (h) {
    const level = h[1].length;
    if (level > 4) fail(line, `h${level} is outside the surveyed set (h1-h4)`);
    html.push(`<h${level}>${inline(h[2], line)}</h${level}>`);
    i++;
    continue;
  }

  /* tables — a header row, a separator, then body rows */
  if (s.startsWith('|')) {
    const rows = [];
    while (i < src.length && src[i].trim().startsWith('|')) {
      rows.push(src[i].trim());
      i++;
    }
    if (rows.length < 2) fail(line, 'a table needs a header and a separator row');
    const cells = (r) =>
      r
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim());
    if (!/^[\s|:-]+$/.test(rows[1])) fail(line + 1, 'expected a table separator row');
    const head = cells(rows[0]).map((c) => `<th>${inline(c, line)}</th>`).join('');
    const body = rows
      .slice(2)
      .map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c, line)}</td>`).join('')}</tr>`)
      .join('');
    html.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
    continue;
  }

  /* lists — bullets and ordered, each run collapsed into one element */
  const bullet = /^[-*]\s+(.*)$/.exec(s);
  const ordered = /^\d+\.\s+(.*)$/.exec(s);
  if (bullet || ordered) {
    const tag = bullet ? 'ul' : 'ol';
    const re = bullet ? /^[-*]\s+(.*)$/ : /^\d+\.\s+(.*)$/;
    const items = [];
    while (i < src.length) {
      const m = re.exec(src[i].trim());
      if (!m) break;
      items.push(`<li>${inline(m[1], i + 1)}</li>`);
      i++;
    }
    html.push(`<${tag}>${items.join('')}</${tag}>`);
    continue;
  }

  if (s.startsWith('>')) fail(line, 'a blockquote appeared; this converter handles none');
  if (/^([-=]){3,}$/.test(s)) {
    html.push('<hr>');
    i++;
    continue;
  }

  /* anything else is a paragraph */
  html.push(`<p>${inline(s, line)}</p>`);
  i++;
}

const body = html.join('\n');
const file = `/*
 * GENERATED by scripts/extract-api-post-routes.mjs — DO NOT EDIT.
 *
 * Source: evidence-dumps/TIER1-fetched/api-post-routes.md, fetched from
 * \`/public/html/POST_ROUTE_API_DOCUMENTATION.md\` and SHA-pinned in that directory's README.
 *
 * This is the document behind the manage Settings tab's "API POST Routes Docs" button. It is a
 * DIFFERENT document from \`api-docs.ts\`, which is the Sessions API reference behind the account
 * page's "API Docs" button. Both buttons used to open the second one.
 *
 * Regenerate with: pnpm --filter controller api-post-routes:extract
 */
export const API_POST_ROUTES_HTML = ${JSON.stringify(body)};
`;

writeFileSync(OUT, file);
console.log(`api-post-routes: ${src.length} source lines -> ${html.length} elements -> ${OUT}`);
