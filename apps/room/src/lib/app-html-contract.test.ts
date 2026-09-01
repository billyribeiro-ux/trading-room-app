import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `src/app.html` — the shell every page in this application is served inside, and the one file here
  that no other gate reads.

  ## The defect this file was written for, found 2026-09-01

  The shell's third comment explained where a `<title>` element used to sit, and to say where, it
  wrote SvelteKit's head placeholder out in full. **SvelteKit substitutes the first occurrence of a
  placeholder in the template**, and the first occurrence was the one inside that comment. So:

  1. the whole head — three font preloads, the page `<title>`, every `<style>` — was injected INSIDE
     the comment, and the real placeholder at the bottom of the block was served as literal text;
  2. the injected head opens with Svelte's own style-hash marker, which is an HTML comment, and HTML
     comments do not nest — its closing sequence ended the outer comment early;
  3. so the remainder of that docblock escaped into the document as body text and was PAINTED ACROSS
     THE TOP OF EVERY PAGE IN THE ROOM.

  It shipped from 2026-08-13. Nothing here could see it: `svelte-check` does not read `app.html`,
  eslint does not lint HTML, the markup is valid either way, `document.title` stayed correct because
  the injected `<title>` still landed in `<head>`, and the browser suite's marker list looked for
  `undefined` / `NaN` / `[object Object]` / `{{` and not for an unsubstituted placeholder. It was
  found by screenshotting a new error page and reading the picture.

  Both halves are guarded below, and the second one had to be learned twice: the first repair quoted
  the offending marker verbatim as evidence, which put a comment terminator back inside a comment and
  reproduced the defect with different prose. There is no escaping sequence for one — the parser
  stops at the first closer it sees.
*/

const APP_HTML = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

/** Comments removed the way a browser removes them: from an opener to the FIRST closer after it. */
const withoutComments = (html: string): string => {
  let out = '';
  let index = 0;
  for (;;) {
    const open = html.indexOf('<!--', index);
    if (open === -1) return out + html.slice(index);
    out += html.slice(index, open);
    const close = html.indexOf('-->', open + 4);
    if (close === -1) return out;
    index = close + 3;
  }
};

const markup = withoutComments(APP_HTML);

describe('the two NON-GLOBAL placeholders appear exactly once, outside every comment', () => {
  /*
    THE MECHANISM, READ FROM SVELTEKIT'S OWN SOURCE RATHER THAN INFERRED FROM THE SYMPTOM.

    `@sveltejs/kit/src/core/sync/write_server.js` compiles `app.html` into a function, and the two
    replacements that matter are NOT global:

    ```js
    app: ({ head, body, assets, nonce, env }) => ${s(template)
      .replace('%sveltekit.head%', '" + head + "')      // first occurrence only
      .replace('%sveltekit.body%', '" + body + "')      // first occurrence only
      .replace(/%sveltekit\.assets%/g, …)               // every occurrence
      .replace(/%sveltekit\.nonce%/g, …)
      .replace(/%sveltekit\.version%/g, …)
    ```

    So `head` and `body` are the two with a misplacement hazard, and the hazard is exactly what
    happened: name either one anywhere earlier in the file — a comment is early — and THAT is the
    occurrence SvelteKit fills, while the real site is served as literal text.

    The globally-replaced ones carry no such hazard and are deliberately not counted here. A gate
    that refused a second `%sveltekit.assets%` would be inventing a rule the framework does not have.
  */
  const NON_GLOBAL = ['%sveltekit.head%', '%sveltekit.body%'];

  it.each(NON_GLOBAL)('%s appears exactly once in the whole file', (placeholder) => {
    /*
      The WHOLE file, comments included, and that is the assertion. Counting only the markup would
      pass the broken version, whose markup held exactly one — the trouble was the second copy in a
      comment being FIRST.
    */
    expect(
      APP_HTML.split(placeholder).length - 1,
      `${placeholder} must occur exactly once in app.html. SvelteKit replaces only the FIRST occurrence (write_server.js), so a second one — in a comment, in an attribute, anywhere earlier — is the one that gets substituted and the real site is served as literal text.`
    ).toBe(1);
  });

  it.each(NON_GLOBAL)('%s is in the markup, not in a comment', (placeholder) => {
    expect(
      markup.split(placeholder).length - 1,
      `${placeholder} is not present outside comments — the only copy is inside one, which is where the head would be injected.`
    ).toBe(1);
  });
});

describe('the error SHELL, which covers the errors this page cannot', () => {
  /*
    `src/error.html` is a SEPARATE file for a reason that decides which of the app's refusals each one
    covers. `+error.svelte` renders for an error raised inside a route; an error thrown in
    `hooks.server.ts`'s `handle` is raised before a route is resolved, so SvelteKit falls back to this
    shell. `hooks.server.ts:89` — the authentication choke point, *"every route except PUBLIC_PATHS is
    behind it"* — throws from `handle`, so the app's single most common refusal lands HERE.

    Verified in a browser on 2026-09-01, both ways: `GET /no-such-route` rendered SvelteKit's built-in
    fallback with only the route page in place, and rendered this shell once it existed.

    ## The trap this block exists for

    The shell's placeholder is `%sveltekit.error.message%`. `%sveltekit.message%` — the name anyone
    would guess, and the name the first draft of this file used — is replaced by NOTHING, because the
    compiler only knows the two:

    ```js
    error: ({ status, message }) => ${s(load_error_page(config))
      .replace(/%sveltekit\.status%/g, '" + status + "')
      .replace(/%sveltekit\.error\.message%/g, '" + message + "')};
    ```

    It fails silently and legibly-wrongly: the page renders, centred and styled, saying
    `%sveltekit.message%` to the person being turned away. Caught here by NAME rather than by count.
  */
  const ERROR_HTML = readFileSync(new URL('../error.html', import.meta.url), 'utf8');

  it('uses the two names the compiler actually substitutes', () => {
    expect(ERROR_HTML).toContain('%sveltekit.error.message%');
    expect(ERROR_HTML).toContain('%sveltekit.status%');
  });

  it('and never the plausible name that silently does nothing', () => {
    /*
      Matched with the `.error.` prefix removed from consideration: `%sveltekit.message%` must not
      appear as a placeholder of its own. Written as a scan rather than a `not.toContain`, because
      `%sveltekit.error.message%` CONTAINS the string `message%` and a naive refusal would fail on
      the correct spelling.
    */
    const bare = [...ERROR_HTML.matchAll(/%sveltekit\.([a-z.]+)%/g)].map((match) => match[1]);
    expect(
      bare.filter((name) => name === 'message'),
      '`%sveltekit.message%` is not a placeholder SvelteKit knows; it is served verbatim to the person being refused. The name is `%sveltekit.error.message%`.'
    ).toEqual([]);
    expect(new Set(bare)).toEqual(new Set(['status', 'error.message']));
  });

  it('carries its style inline, because it renders when the app could not', () => {
    /*
      No `app.css`, no font file, no build artifact. This document is served when the application
      itself failed, so anything it has to fetch is something it may not get.
    */
    expect(ERROR_HTML).toContain('<style>');
    /*
      Read with comments stripped — HTML and CSS both. The shell's own style block explains that it
      cannot import `app.css`, so a raw search finds the explanation and calls it the defect. Sixth
      time this session that a check's subject matched the prose recording it; the fix is always at
      the assertion's target rather than at the string.
    */
    const shellMarkup = withoutComments(ERROR_HTML).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(shellMarkup).not.toContain('app.css');
    expect(shellMarkup).not.toContain('<script');
    expect(shellMarkup).not.toContain('rel="stylesheet"');
  });

  it('and shows the same captured h2 the route page does', () => {
    // `app-kicked-page`'s own rule, byte 2,561,780. Two refusal pages, one product.
    for (const rule of ['color: #000;', 'vertical-align: middle;', 'text-align: center;']) {
      expect(ERROR_HTML).toContain(rule);
    }
  });
});

describe('no comment in the shell contains a comment delimiter', () => {
  /*
    HTML comments do not nest, so a `<!--` or a closing `-->` written inside one is not quoted — it
    is parsed. Rather than trying to define "inside", this walks every delimiter in document order
    and requires them to ALTERNATE, opener then closer. A nested opener produces two openers in a
    row; a nested closer produces two closers in a row. Both are what went wrong here, on the same
    day, in that order.
  */
  it('the delimiters alternate, opener then closer, all the way down', () => {
    const delimiters: { at: number; kind: 'open' | 'close' }[] = [];
    for (let at = APP_HTML.indexOf('<!--'); at !== -1; at = APP_HTML.indexOf('<!--', at + 4)) {
      delimiters.push({ at, kind: 'open' });
    }
    for (let at = APP_HTML.indexOf('-->'); at !== -1; at = APP_HTML.indexOf('-->', at + 3)) {
      delimiters.push({ at, kind: 'close' });
    }
    delimiters.sort((left, right) => left.at - right.at);

    expect(
      delimiters.length,
      'the file must contain comments for this to test anything'
    ).toBeGreaterThan(0);

    let expected: 'open' | 'close' = 'open';
    for (const delimiter of delimiters) {
      const line = APP_HTML.slice(0, delimiter.at).split('\n').length;
      expect(
        delimiter.kind,
        `app.html line ${line}: expected a comment ${expected === 'open' ? 'OPENER' : 'CLOSER'} here. A delimiter written inside a comment is not quoted — it is parsed, and everything after it escapes into the document as body text.`
      ).toBe(expected);
      expected = expected === 'open' ? 'close' : 'open';
    }
    expect(expected, 'the last comment in app.html is never closed').toBe('open');
  });
});

describe('the original finding still holds', () => {
  /*
    No `<title>` in the shell. Every route sets its own through `<svelte:head>`, and HTML has no
    notion of a fallback title — the FIRST title element in the document wins, so a static one here
    would silently beat every page's, which is what it did until 2026-08-28.

    Read from the comment-stripped markup for the reason the placeholder cases give: the docblock
    explaining this quotes the very element it forbids, and a raw search would find the explanation
    and call it the defect.
  */
  it('the shell declares no title of its own', () => {
    expect(markup).not.toContain('<title');
  });

  it('and the two things it does declare are still there', () => {
    expect(markup).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
    );
    expect(markup).toContain('<link rel="icon" type="image/x-icon"');
  });
});
