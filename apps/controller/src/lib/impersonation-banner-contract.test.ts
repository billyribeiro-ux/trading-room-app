import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
  ── THE IMPERSONATION BANNER, AND THE ONE CROSS-PAGE FORM ACTION IN EITHER APP ──────────────────

  `+layout.svelte` renders a banner on EVERY page an impersonated session can reach, carrying the
  only way out: a form posting to `/admin?/stopImpersonating`. Nothing covered any of it until now,
  which is why this file exists at all — the banner's own comment states two requirements
  ("outside the `{#if chrome}` branches on purpose", "there is no dismiss control, and that is the
  requirement, not an omission") and a requirement stated only in prose is one a later refactor
  removes without noticing.

  ## The September 2026 blog item this settles

  SvelteKit next.17 added `use:enhance` support for form actions on a DIFFERENT page. This form is
  the only cross-page action in either app, so it is the only place that feature could land, and it
  is deliberately NOT taking it.

  The reason is what `use:enhance` does on a redirect, in the official `kit/form-actions` doc's own
  words: it "will call `goto`". A client-side navigation keeps the document, and with it every
  module-level and component-level value the impersonated identity has already been written into —
  a component's `$state`, a cached roster row, anything held above the page. The operator would be
  navigated to `/admin` as themselves while parts of the screen still hold the person they were
  viewing as.

  A full document load throws all of it away. That is the correct behaviour for an IDENTITY change
  specifically, and it costs one navigation on a control an operator uses once per impersonation.
  So the absence of `use:enhance` here is a decision, and it is asserted rather than trusted,
  because "the blog says enhance now works cross-page" is exactly the argument that would add it.

  ## What is NOT claimed

  Nothing here was opened in a browser. These are source and server-side facts: the form's method
  and target, the action's existence and its redirect, and the absence of a dismiss control.
*/

const CONTROLLER = fileURLToPath(new URL('../..', import.meta.url));
const LAYOUT = readFileSync(`${CONTROLLER}src/routes/+layout.svelte`, 'utf8');
const ADMIN_SERVER = readFileSync(`${CONTROLLER}src/routes/(app)/admin/+page.server.ts`, 'utf8');

/** The banner block, from its `{#if}` to the matching close, comments removed. */
const bannerMarkup = (): string => {
  const start = LAYOUT.indexOf('{#if data.user?.impersonatedBy !== undefined}');
  expect(start, 'the impersonation banner is gone from the root layout').toBeGreaterThan(-1);
  const end = LAYOUT.indexOf('{/if}', start);
  expect(end, 'the banner block is unterminated').toBeGreaterThan(start);
  return LAYOUT.slice(start, end).replace(/<!--[\s\S]*?-->/g, '');
};

describe('the impersonation banner reaches every page an impersonated session can', () => {
  it('sits outside the chrome branches, above them', () => {
    /*
      Positional, because that IS the requirement. The banner renders on the account page, a manage
      page and the room login alike only while it is above the `{#if chrome}` that picks a shell;
      moved inside one, it silently stops appearing on every page the other branches serve.
    */
    const banner = LAYOUT.indexOf('{#if data.user?.impersonatedBy !== undefined}');
    const chrome = LAYOUT.indexOf("{#if chrome === 'controller'}");
    expect(chrome, 'the chrome branch is gone — this test no longer measures anything').toBeGreaterThan(-1);
    expect(banner, 'the banner moved inside or below the chrome branches').toBeLessThan(chrome);
  });

  it('offers no way to dismiss it', () => {
    const markup = bannerMarkup();
    /* Positive control: an empty extraction satisfies every absence assertion below. */
    expect(markup, 'the banner extraction came back empty').toContain('Stop impersonating');
    for (const escape of ['dismiss', 'onclose', 'aria-label="Close"', 'btn-close', 'hidden={']) {
      expect(markup, `a dismiss affordance appeared: ${escape}`).not.toContain(escape);
    }
    /* Exactly one button, and it is the way out rather than a second control beside it. */
    expect(markup.split('<button').length - 1, 'the banner grew a second control').toBe(1);
  });
});

describe('the only cross-page form action in either app', () => {
  it('posts to the admin page action, which exists and redirects', () => {
    expect(bannerMarkup()).toContain('<form method="POST" action="/admin?/stopImpersonating">');

    /*
      Both halves. A form naming an action nobody declares is a 404 on the one control that ends an
      impersonation, and the redirect is what makes the unenhanced POST land somewhere — without it
      the operator is left on a bare action response.
    */
    expect(ADMIN_SERVER, 'the action the banner posts to is gone').toContain(
      'stopImpersonating: async ({ cookies }) => {'
    );
    const action = ADMIN_SERVER.slice(ADMIN_SERVER.indexOf('stopImpersonating: async'));
    expect(action.slice(0, action.indexOf('\n  }'))).toContain('redirect(303,');
  });

  it('is deliberately not progressively enhanced, which next.17 made possible', () => {
    /*
      The negative control for this one is the whole point: add `use:enhance` to the banner's form
      and this goes red with the reason attached. See the docblock — `use:enhance` calls `goto` on
      a redirect, and an identity change must not survive as a client-side navigation.
    */
    expect(
      bannerMarkup(),
      'the impersonation form was enhanced — a `goto` keeps the document, and with it whatever ' +
        'the impersonated identity was written into. An identity change needs the full load.'
    ).not.toContain('use:enhance');
  });
});
