import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
  `src/routes/+error.svelte` — the page every refusal in this application lands on.

  ## Why it needed building, and why it needs guarding

  There was none until 2026-09-01. SvelteKit renders its own unstyled fallback when a route tree has
  no `+error.svelte` and no `src/error.html`, so a member turned away from a CLOSED ROOM read the
  presenter's own sentence on a page that looked like the site had broken. That door is
  `session/+page.server.ts:257`, `error(403, closedRoomMessage(shortCode))`, and the sentence it
  carries is written per room in `CloseSessionPane`'s editor.

  What this file guards is not the styling. It is the one decision on that page that is a security
  boundary, plus the two facts the page's own reasoning is built on — because a page whose premise
  has silently changed is worse than no page.
*/

const ERROR_PAGE = readFileSync(new URL('../routes/+error.svelte', import.meta.url), 'utf8');
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const code = strip(ERROR_PAGE);

describe('the message is TEXT, and that is the whole security argument', () => {
  /*
    ── THE ONE ASSERTION HERE THAT IS A BOUNDARY RATHER THAN A PREFERENCE ────────────────────────

    Upstream renders the closed message as MARKUP. The const is

    ```js
    [1,"m-2","w-100","closed-container",3,"innerHTML"]        // bundle byte 2,573,542
    ```

    and the value bound into it is Summernote rich text a PRESENTER wrote. Reproducing that here
    would be a stored cross-site-scripting primitive with an unusually good reach: the payload is
    stored per room by whoever runs it, and it fires on every member who arrives at that room after
    it closes — including members who never got in.

    `CloseSessionPane.svelte` already records the divergence at the WRITE end (a textarea, not a
    rich-text editor). This is the READ end, and both are needed: a textarea still accepts
    `<img onerror=…>` as literal text, so plain-text STORAGE is not what makes it safe — plain-text
    RENDERING is.

    Asserted on the whole file rather than on the interpolation, because there is no version of this
    page where `{@html}` is right, and a narrower assertion would let it appear somewhere else on it.
  */
  it('never renders anything on this page as HTML', () => {
    expect(code).not.toContain('{@html');
  });

  it('interpolates the message as text', () => {
    expect(code).toContain('<h2>{message}</h2>');
  });

  it('takes the message from the error, with a literal fallback rather than a blank page', () => {
    expect(code).toContain("const message = page.error?.message ?? 'Something went wrong.';");
  });
});

describe('the premise: this is still the only error boundary in the app', () => {
  /*
    The page's docblock argues from "there was none". If somebody adds a second `+error.svelte`
    deeper in the tree, the closed-room door may stop reaching THIS one and every word of that
    reasoning — including the `{@html}` argument above — would still read as true while being about
    a file that is no longer rendered.

    So the count is read, not assumed. A second one is not forbidden; it has to be noticed.
  */
  const routes = new URL('../routes', import.meta.url).pathname;
  const errorPages: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === '+error.svelte') errorPages.push(full.slice(routes.length));
    }
  };
  walk(routes);

  it('is the root one and there is exactly one', () => {
    expect(errorPages).toEqual(['/+error.svelte']);
  });
});

describe('the premise: the doors that reach it', () => {
  /*
    The docblock states a count. A count in prose is the shape that goes stale first in this
    repository, so it is re-derived here instead of trusted — and derived with COMMENTS STRIPPED,
    which is the correction the first draft needed: a raw grep answered 162 because this repository
    quotes its own `error(...)` calls inside the docblocks that explain them.
  */
  const sources: string[] = [];
  const collect = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) collect(full);
      else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) sources.push(full);
    }
  };
  collect(new URL('../routes', import.meta.url).pathname);
  collect(new URL('.', import.meta.url).pathname);

  const calls = sources
    .map((file) => strip(readFileSync(file, 'utf8')).replace(/\/\/[^\n]*/g, ''))
    .flatMap((source) => [...source.matchAll(/\berror\((\d{3})\b/g)].map((match) => match[1]));

  it('states its own total, and the total is what the sources say', () => {
    expect(ERROR_PAGE).toContain(`**${calls.length}** \`error(<status>, …)\``);
  });

  it('the closed room is one of them, and it is the reason this page exists', () => {
    const guest = readFileSync(
      new URL('../routes/session/+page.server.ts', import.meta.url),
      'utf8'
    );
    expect(strip(guest)).toContain('error(403, closedRoomMessage(shortCode));');
  });
});

describe('the status number, and the threshold that decides it', () => {
  /*
    Shown at 500 and above only. Below it the message was written for this exact refusal and is
    complete on its own; at 500 and above SvelteKit's default `handleError` has already replaced the
    message with a generic one, so the number is the only actionable thing on the page.

    The threshold is asserted because it is the kind of line a later edit "simplifies" to always-on,
    and always-on puts a `403` beside "This room is closed." on the door a paying member hits.
  */
  it('is gated at 500, not always rendered', () => {
    expect(code).toContain('const showStatus = status >= 500;');
    expect(code).toContain('{#if showStatus}');
  });

  it('is in the title either way, so a screenshot of the tab carries it', () => {
    expect(code).toContain('<title>{status} — {message}</title>');
  });
});

describe('the layout is the reference’s own, not an invention', () => {
  /*
    `app-kicked-page`'s three consts, byte 2,561,780 — `[1,"container","h-100"]`,
    `[1,"d-flex","d-flex-column","h-100","w-100"]`, `[1,"align-self-center","w-100"]` — which
    `KickedPage.svelte` already transcribes verbatim. This page and that one are the same thing to a
    member: the room, replaced by a sentence saying why.

    Read from `KickedPage.svelte` rather than restated, so the two cannot drift into two designs.
  */
  const kicked = readFileSync(new URL('./components/KickedPage.svelte', import.meta.url), 'utf8');

  it('uses the same three captured classes the kicked page does', () => {
    for (const captured of [
      'class="container h-100"',
      'class="d-flex d-flex-column h-100 w-100"',
      'class="align-self-center w-100"'
    ]) {
      expect(kicked, `${captured} must still be what the kicked page renders`).toContain(captured);
      expect(code, `${captured} is the shared captured shape`).toContain(captured);
    }
  });

  it('carries the same verbatim h2 rule, `vertical-align` included', () => {
    for (const rule of ['color: #000;', 'vertical-align: middle;', 'text-align: center;']) {
      expect(kicked).toContain(rule);
      expect(code).toContain(rule);
    }
  });
});
