// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import RoomBranding from './components/RoomBranding.svelte';
import { customFaviconHref, customStylesheetFor } from './room-branding.js';

/**
 * A room's own favicon and stylesheet — and the upstream check this fixes.
 *
 * Applied together on `globalsLoaded` (bundle byte 2,594,998) by `changeFavicon` (2,602,147) and
 * `addCustomCSS` (2,602,486). `app.html`'s icon link carries `type="image/x-icon"` because that is
 * the selector `changeFavicon` uses to find the tag it replaces — its own comment says so.
 *
 * ## `.svelte.test.ts`, and the name is load-bearing
 *
 * `$state` is only available in a file Svelte compiles as a rune module, which it decides from the
 * `.svelte.` in the filename. The last test here drives a PROP CHANGE, so it needs one. A plain
 * `.test.ts` throws `rune_outside_svelte` at runtime rather than failing to compile, which is the
 * kind of error that reads as a test bug rather than a naming rule.
 */
describe('customStylesheetFor decides link versus inline by PARSING', () => {
  /*
    `e.indexOf("https") >= 0` is a substring test against the whole value, and both of its failures
    are silent. Each is a real stylesheet an owner would plausibly write.
  */
  it('treats CSS that merely MENTIONS https as CSS', () => {
    const css = 'body { background: url(https://cdn.example/x.png); }';
    // Upstream: contains "https", so set as link.href — a broken request and no styling at all.
    expect(customStylesheetFor(css)).toEqual({ kind: 'inline', css });
  });

  it('treats a plain http URL as a stylesheet', () => {
    // Upstream: no "https" substring, so injected as CSS text — the stylesheet never loads.
    expect(customStylesheetFor('http://cdn.example/room.css')).toEqual({
      kind: 'link',
      href: 'http://cdn.example/room.css'
    });
  });

  it('links an https URL, which is the case upstream gets right', () => {
    expect(customStylesheetFor('https://cdn.example/room.css')).toEqual({
      kind: 'link',
      href: 'https://cdn.example/room.css'
    });
  });

  it.each(['', '   ', undefined, null])('draws nothing for %o', (value) => {
    expect(customStylesheetFor(value)).toBeNull();
  });

  /*
    A non-http scheme is CSS, not a link. `javascript:` as a stylesheet href does nothing in any
    browser, but routing it to `link.href` would be this room asserting it is a URL — and the
    inline branch treats it as the text it is.
  */
  it('does not link a non-http scheme', () => {
    expect(customStylesheetFor('javascript:alert(1)')).toEqual({
      kind: 'inline',
      css: 'javascript:alert(1)'
    });
  });
});

describe('customFaviconHref', () => {
  it('cache-busts with the reference’s own malformed query', () => {
    // `?=` — an empty parameter name. Kept verbatim: it is an opaque cache key, not a real param.
    expect(customFaviconHref('https://cdn.example/room.ico', 'abc')).toBe(
      'https://cdn.example/room.ico?=abc'
    );
  });

  it.each(['', '  ', undefined, null, 'javascript:alert(1)', 'not a url', '//cdn/x.ico'])(
    'refuses %o and leaves the shell’s icon alone',
    (value) => {
      expect(customFaviconHref(value, 'abc')).toBeNull();
    }
  );
});

/*
  THE DOCUMENT, and this is a mount because `<svelte:head>` and two attachments are the whole
  feature. Nothing below can be observed by reading the component's source.
*/
const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
  document.head.querySelectorAll('link,style').forEach((node) => node.remove());
});

const render = (props: { customFaviconURL?: string; customCSS?: string }) => {
  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(RoomBranding, { target, props }) as Record<string, unknown>;
  flushSync();
  mounted.push(() => {
    unmount(component);
    target.remove();
  });
};

/** The shell's own icon link, as `app.html` declares it. */
const addShellIcon = () => {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/x-icon';
  link.href = '/favicon.ico';
  document.head.appendChild(link);
};

describe('what reaches document.head', () => {
  it('replaces the shell’s icon rather than leaving two for the browser to choose between', () => {
    addShellIcon();
    expect(document.head.querySelectorAll('link[rel="icon"]'), 'positive control').toHaveLength(1);

    render({ customFaviconURL: 'https://cdn.example/room.ico' });

    const icons = document.head.querySelectorAll('link[rel="icon"]');
    expect(icons, 'exactly one icon link survives').toHaveLength(1);
    expect(icons[0]?.getAttribute('href')).toContain('https://cdn.example/room.ico?=');
    expect(icons[0]?.id).toBe('dynamic-favicon');
    // The shell's, gone — `app.html`'s comment names leaving it as the failure.
    expect(document.head.querySelector('link[type="image/x-icon"]')).toBeNull();
  });

  it('leaves the shell’s icon in place when the room configured none', () => {
    addShellIcon();
    render({});
    expect(document.head.querySelector('link[type="image/x-icon"]')).not.toBeNull();
    expect(document.head.querySelector('#dynamic-favicon')).toBeNull();
  });

  it('leaves it in place when the room configured something unusable', () => {
    addShellIcon();
    render({ customFaviconURL: 'javascript:alert(1)' });
    expect(document.head.querySelector('link[type="image/x-icon"]')).not.toBeNull();
    expect(document.head.querySelector('#dynamic-favicon')).toBeNull();
  });

  it('links a stylesheet URL', () => {
    render({ customCSS: 'https://cdn.example/room.css' });
    const sheet = document.head.querySelector('link[rel="stylesheet"]');
    expect(sheet?.getAttribute('href')).toBe('https://cdn.example/room.css');
    expect(document.head.querySelector('style')).toBeNull();
  });

  /*
    ── A REFUTED CLAIM, KEPT AS A TEST ────────────────────────────────────────────────────────────

    The first version of this block asserted that a text node stops `</style><script>` becoming
    executable script, and called that the reason for the design. **A negative control replacing the
    text node with `innerHTML` stayed GREEN**, which is what sent this to be measured: `<style>` is a
    RAWTEXT element, so its content is never parsed as HTML and neither form is a breakout.

    The assertions stay, because "a hostile value arrives verbatim and creates no script" is still
    worth pinning — it is just not evidence for the design. What it now says, accurately, is that the
    value reaches the CSS parser unchanged and as ONE text node.
  */
  it('carries a hostile value through verbatim, as a single text node', () => {
    const hostile = 'body{color:red}</style><script>window.__pwned = 1;</' + 'script>';
    render({ customCSS: hostile });

    const style = document.head.querySelector('style');
    expect(style, 'the style element is missing').not.toBeNull();
    expect(style?.textContent).toBe(hostile);
    expect([...(style?.childNodes ?? [])].map((node) => node.nodeName)).toEqual(['#text']);
    expect(document.querySelectorAll('script')).toHaveLength(0);
  });

  /*
    THE REAL REASON FOR THE TEXT NODE, and the one assertion here that a negative control can turn
    red: Svelte HTML-escapes ordinary text content, so `{css}` in the template would hand the CSS
    parser `a &gt; b`. Correct CSS in, broken CSS out, silently.
  */
  it('does not escape CSS on the way in', () => {
    const css = '.a > .b { content: "x & y"; }';
    render({ customCSS: css });
    const text = document.head.querySelector('style')?.textContent;
    expect(text).toBe(css);
    expect(text).not.toContain('&gt;');
    expect(text).not.toContain('&amp;');
  });

  it('draws neither when the room configured neither', () => {
    render({});
    expect(document.head.querySelector('style')).toBeNull();
    expect(document.head.querySelector('link[rel="stylesheet"]')).toBeNull();
  });

  /*
    AN OWNER CHANGING THE CSS REPLACES IT, and this test exists because a negative control that
    removed the attachment's `textContent = ''` stayed GREEN without it.

    It stayed green because a fresh `<style>` is empty, so clearing is a no-op on FIRST attach. The
    clear only earns its place on a re-run — and a re-run is reachable: this page re-reads
    `data.sessData` on a five-second `invalidate`, so an owner editing the setting changes the value
    under a live element. Without the clear the room would accumulate every version of the room's
    CSS, oldest first, with later rules losing to earlier ones on equal specificity.
  */
  it('replaces the inline CSS when the owner changes it, rather than appending', () => {
    const props = $state({ customCSS: '.a { color: red; }' });
    const target = document.createElement('div');
    document.body.append(target);
    const component = mount(RoomBranding, { target, props }) as Record<string, unknown>;
    flushSync();
    mounted.push(() => {
      unmount(component);
      target.remove();
    });

    expect(document.head.querySelector('style')?.textContent).toBe('.a { color: red; }');

    props.customCSS = '.b { color: blue; }';
    flushSync();

    const styles = document.head.querySelectorAll('style');
    expect(styles, 'one style element, not two').toHaveLength(1);
    expect(styles[0]?.textContent, 'the old CSS is still there').toBe('.b { color: blue; }');
    expect([...(styles[0]?.childNodes ?? [])]).toHaveLength(1);
  });
});
