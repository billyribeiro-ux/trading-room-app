import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  ── THE DOCUMENT HAS EXACTLY ONE TITLE, AND IT IS THE PAGE'S ──────────────────────────────────────

  ## What was found, in the first minute a browser was ever pointed at this room

  `src/app.html` carried `<title>PTRChat</title>` immediately before `%sveltekit.head%`. Every route
  here also sets a title through `<svelte:head>`, so every page was served with TWO title elements.

  Per the HTML specification, `document.title` is **the first** `<title>` element in tree order. So
  the browser tab read "PTRChat" on every page of this application, always — and:

  * `name` is a WIRED room setting whose entire purpose is that tab. Its own CHANGELOG entry reads
    *"the room's own title finally reaches the browser tab"*. It never reached it.
  * the login page's `"<room> — sign in"` was rendered, was present in the HTML, and was never the
    document's title either.

  Nothing in this repository could see it. The markup is valid. Both titles type-check.
  `svelte-check` is silent. A source-reading assertion looking for the room name inside
  `<svelte:head>` finds it and passes — which is exactly what the existing coverage did.

  ## Why the fallback cannot come back

  There is no such thing as a fallback title in HTML: a `<title>` in the shell wins over every page's,
  because it comes first. The only way to let pages own their titles is for the shell to have none —
  which makes "every page sets one" a requirement rather than a courtesy, and that is what this file
  enforces.
*/

const ROUTES = new URL('../routes/', import.meta.url);

/** Every `+page.svelte`, found rather than listed — a hand-kept list is how the next route is missed. */
const pages = (dir: URL, prefix = ''): string[] => {
  const found: string[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory()) {
      found.push(...pages(new URL(`${item.name}/`, dir), `${prefix}${item.name}/`));
      continue;
    }
    if (item.name === '+page.svelte') found.push(`${prefix}${item.name}`);
  }
  return found;
};

const allPages = pages(ROUTES);
const sourceOf = (route: string) => readFileSync(new URL(route, ROUTES), 'utf8');

describe('the shell owns no title', () => {
  it('has no <title> element in app.html', () => {
    /*
      Matched at the start of a line, so the paragraph in that file EXPLAINING why there is no title
      — which necessarily contains the word — does not satisfy its own gate. The comment-stripping
      lesson from `gate/evidence-bound-tests.mjs`, applied before it could bite again.
    */
    const shell = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
    expect(
      /^\s*<title>/m.test(shell),
      'a <title> in app.html comes before %sveltekit.head% and silently wins over every page'
    ).toBe(false);
  });
});

describe('every page sets its own title', () => {
  it('found the pages it is meant to police', () => {
    // At zero the assertion below is vacuous, which is how a source-reading test dies quietly.
    expect(allPages.length).toBeGreaterThan(2);
  });

  it('has a <title> inside <svelte:head> in every +page.svelte', () => {
    const missing = allPages.filter((route) => {
      const source = sourceOf(route);
      return !(source.includes('<svelte:head>') && source.includes('<title>'));
    });
    expect(
      missing,
      `${missing.join(', ')} — app.html deliberately carries no <title>, so a page without one leaves the document untitled. See app.html's own comment for what the fallback used to cost.`
    ).toEqual([]);
  });

  it('and never more than one, which would reintroduce the same bug within a page', () => {
    const doubled = allPages.filter((route) => sourceOf(route).split('<title>').length - 1 > 1);
    expect(doubled, doubled.join(', ')).toEqual([]);
  });
});
