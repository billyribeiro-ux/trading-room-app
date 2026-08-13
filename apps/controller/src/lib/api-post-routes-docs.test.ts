import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { API_POST_ROUTES_HTML } from './content/api-post-routes';
import { API_DOCS_HTML } from './content/api-docs';

/**
 * The manage tab's "API POST Routes Docs" button, and the document behind it.
 *
 * ## The defect
 *
 * The reference serves TWO documentation pages through one viewer:
 *
 *     account page   api-docs.html?src=/public/html/API_Documentation.md          "API Docs"
 *     manage tab     api-docs.html?src=/public/html/POST_ROUTE_API_DOCUMENTATION.md
 *                                                                    "API POST Routes Docs"
 *
 * Ours pointed BOTH at the same route, so a button labelled "API POST Routes Docs" opened the
 * Sessions API reference. It rendered fine and read as complete — the only thing wrong was that the
 * document was the other one.
 *
 * ## Generated, not transcribed
 *
 * `content/api-post-routes.ts` is produced from the captured markdown by
 * `scripts/extract-api-post-routes.mjs`. 729 source lines retyped by hand is how an endpoint name
 * drifts out of step with the API it documents. This test regenerates and compares, so a stale
 * checked-in copy fails rather than quietly diverging from the evidence.
 */

const cwd = process.cwd();
const TEMPLATE = readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/views/page.manageSession.html`, 'utf8');
const MANAGE = readFileSync(`${cwd}/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte`, 'utf8');
const ACCOUNT = readFileSync(`${cwd}/src/routes/(app)/account/+page.svelte`, 'utf8');
const SOURCE_MD = `${cwd}/evidence-dumps/TIER1-fetched/api-post-routes.md`;

describe('the reference really does serve two documents', () => {
  it('the manage tab links to POST_ROUTE_API_DOCUMENTATION.md', () => {
    /* Checked, not remembered — if a re-fetch changes this the citation fails here first. */
    expect(TEMPLATE).toContain('api-docs.html?src=/public/html/POST_ROUTE_API_DOCUMENTATION.md');
  });

  it('and the account page links to a DIFFERENT file', () => {
    const welcome = readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/views/page.welcome.html`, 'utf8');
    expect(welcome).toContain('api-docs.html?src=/public/html/API_Documentation.md');
    expect(welcome).not.toContain('POST_ROUTE_API_DOCUMENTATION');
  });
});

describe('our two buttons open two different routes', () => {
  it('the manage button goes to /account/api-post-routes', () => {
    expect(MANAGE).toContain("href={resolve('/(app)/account/api-post-routes')}");
    expect(MANAGE).toContain('API POST Routes Docs');
  });

  it('the account button still goes to /account/api-docs', () => {
    expect(ACCOUNT).toContain("href={resolve('/(app)/account/api-docs')}");
  });

  it('the manage button no longer points at the Sessions reference', () => {
    /* The exact regression: one route serving both labels. */
    const at = MANAGE.indexOf('API POST Routes Docs');
    expect(at).toBeGreaterThan(-1);
    expect(MANAGE.slice(at - 400, at)).not.toContain("resolve('/(app)/account/api-docs')");
  });
});

describe('the generated document', () => {
  it('is genuinely a different document from the Sessions reference', () => {
    expect(API_POST_ROUTES_HTML).not.toBe(API_DOCS_HTML);
    expect(API_POST_ROUTES_HTML).toContain('POST Route API Documentation');
    expect(API_DOCS_HTML).toContain('Sessions API Documentation');
  });

  it('carries the structure the source markdown has', () => {
    /* Counted off the source before the converter was written, so the converter is measured against
       the survey rather than against itself. */
    const count = (re: RegExp) => (API_POST_ROUTES_HTML.match(re) ?? []).length;
    expect(count(/<h1\b/g)).toBe(1);
    expect(count(/<h2\b/g)).toBe(12);
    expect(count(/<h3\b/g)).toBe(51);
    expect(count(/<h4\b/g)).toBe(11);
    expect(count(/<pre\b/g)).toBe(37);
    expect(count(/<table\b/g)).toBe(2);
  });

  it('escapes the one ampersand the source contains, and emits no stray markup', () => {
    /*
      MEASURED, not assumed. The first version of this asserted the output contains `&lt;` — the
      source has ZERO `<` and `>` characters, so that could never pass. It contains exactly ONE `&`,
      in "Logging & Analytics", which must arrive as `&amp;`.

      Asserting a construct the document does not contain is a test that can only fail or be deleted;
      neither tells you anything about escaping. This asserts what is actually there.
    */
    const source = readFileSync(SOURCE_MD, 'utf8');
    expect(source.split('&').length - 1).toBe(1);
    expect(source.includes('<')).toBe(false);

    expect(API_POST_ROUTES_HTML).toContain('Logging &amp; Analytics');
    expect(API_POST_ROUTES_HTML).not.toMatch(/<script/i);
    /* And the escaper is real rather than a no-op that happens to look right on this input. */
    expect(API_POST_ROUTES_HTML).not.toContain('Logging & Analytics');
  });

  it('is NOT stale — regenerating reproduces it exactly', () => {
    /*
      THE assertion. The checked-in constant and the captured markdown must not be able to drift:
      the .md is the evidence and this file is only a transform of it.
    */
    const tmp = `${cwd}/.svelte-kit/api-post-routes.check.ts`;
    execFileSync(process.execPath, ['scripts/extract-api-post-routes.mjs', '--out', tmp], { cwd, stdio: 'pipe' });
    expect(readFileSync(tmp, 'utf8')).toBe(readFileSync(`${cwd}/src/lib/content/api-post-routes.ts`, 'utf8'));
  });

  it('the source markdown is the size the evidence README pins', () => {
    expect(readFileSync(SOURCE_MD).byteLength).toBe(20699);
  });
});
