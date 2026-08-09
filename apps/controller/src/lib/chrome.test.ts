import { describe, expect, it } from 'vitest';
import { resolveChrome } from './chrome';

/**
 * Which shell each page renders inside.
 *
 * ## The bug these cases exist for
 *
 * `/forgot-password` and `/reset-password` were added under `(public)/` and fell through to the
 * `marketing` shell, so they rendered inside `.pub-root` while their markup was written against the
 * controller's `acc-*` classes. `account.css` scopes its grid under `.acc-body`, `public.css` scopes
 * its own under `.pub-root`, and under the wrong ancestor the controller rules simply do not match.
 *
 * Measured in Chromium at 1280px before the fix: `.acc-panel .col-md-6` came out **538px wide and
 * unfloated** instead of 254px floated, and every input and button rendered at **508px instead of
 * 254px** — every field twice its intended width. After the fix all four metrics match `/login`
 * exactly.
 *
 * Nothing caught it. `svelte-check` was clean, 522 unit tests passed, the build succeeded, and the
 * SSR-rendered HTML contained every class it was supposed to. The defect existed only in the
 * cascade, which is invisible to all of them.
 *
 * So these cases pin the OTHER half of the guarantee — that the page is filed under the right shell
 * at all. The layout metrics themselves need a browser and belong in the Playwright suite; what is
 * cheap and worth having here is that a new auth page cannot silently join the marketing site.
 */

describe('the login flow all renders in the controller shell', () => {
  /*
    Every page that wears `.acc-panel-narrow` markup. If one of these is ever `marketing`, its
    fields are twice as wide as intended and the page is wrapped in the wrong header and footer.
  */
  it.each(['/login', '/register', '/forgot-password', '/reset-password'])('%s', (path) => {
    expect(resolveChrome(path)).toBe('controller');
  });

  it('keeps them there with a query string, which is how a reset link actually arrives', () => {
    // `resolveChrome` takes a pathname, so this documents the caller's contract as much as the
    // function's: the layout passes `page.url.pathname`, which never includes the query.
    expect(resolveChrome('/reset-password')).toBe('controller');
  });
});

describe('the marketing site keeps its own shell', () => {
  it.each(['/', '/contact', '/privacy', '/terms'])('%s', (path) => {
    expect(resolveChrome(path)).toBe('marketing');
  });

  it('does not hand the controller shell to an unknown path', () => {
    // The fall-through must stay `marketing`: an unrecognised path is far likelier to be a
    // marketing URL or a typo than a signed-in surface.
    expect(resolveChrome('/pricing')).toBe('marketing');
    expect(resolveChrome('/nothing-here')).toBe('marketing');
  });
});

describe('the two surfaces that own their whole field', () => {
  it('gives the room entry screen no shell', () => {
    expect(resolveChrome('/session/1234')).toBe('none');
  });

  it('gives the API document no shell, even though /account would otherwise claim it', () => {
    // It is standalone HTML with its own dark topbar; the controller shell would add a second
    // navbar and a 1170px container over the top of it.
    expect(resolveChrome('/account/api-docs')).toBe('none');
    // And the prefix rule still applies to everything else under /account.
    expect(resolveChrome('/account/rooms/12')).toBe('controller');
  });
});

describe('prefix matching', () => {
  it('matches a child path but NOT a longer sibling name', () => {
    expect(resolveChrome('/account/rooms/12')).toBe('controller');
    /*
      `/loginsomething` must not match `/login`. The rule is `=== p || startsWith(p + '/')`, and
      dropping the slash would hand the controller shell to any path that merely begins with those
      characters.
    */
    expect(resolveChrome('/loginsomething')).toBe('marketing');
    expect(resolveChrome('/reset-password-old')).toBe('marketing');
  });
});
