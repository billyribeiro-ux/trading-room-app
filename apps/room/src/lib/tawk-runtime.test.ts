// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTawkRuntime, type TawkApi } from './tawk-runtime';

/*
  THE TAWK WIDGET'S RUNTIME HALF, EXECUTED — which was impossible until 2026-08-17.

  `tawk-support.test.ts` beside this file has eleven assertions and they all test PURE functions:
  what script tag a property id produces, what attributes a viewer produces. Every imperative
  behaviour — the poll, the teardown, the once-only latch — lived inside `+page.svelte` and could
  only ever be asserted as source text, because nothing can mount that page.

  Moving it to a factory is what made these runnable. That is the point of the extraction, and it is
  worth more than the ninety lines it took off the page: three behaviours below are things a member
  EXPERIENCES, and none of them could fail loudly before.

  ## The one that is a real leak, not a style preference

  `load()` starts a `setTimeout` chain that re-arms every 100ms until `window.Tawk_API` appears. If
  the disposer does not cancel it, a viewer who leaves the room inside that window leaves the chain
  running against a detached document — forever, because the API never appears for a page that is
  gone. That is asserted by advancing fake timers PAST the disposer and watching the poll stop.

  ## What is faked, and what is not

  Timers are faked, because the alternative is a test that really waits. `window.Tawk_API` is a
  plain object with spies — it is a third-party global, so there is nothing to import and nothing
  this repository owns. `document` is real jsdom, so the script injection is asserted against actual
  DOM rather than a mock of it.
*/

const PROPERTY = 'test-property-id';

const viewer = () => ({
  savedNick: null,
  nick: 'Ada',
  name: 'Ada',
  savedEmail: null,
  email: 'ada@example.com'
});

/** Installs a fake `Tawk_API` and hands back its spies. */
const installApi = (over: Partial<TawkApi> = {}) => {
  const api: TawkApi = {
    hideWidget: vi.fn(),
    toggleVisibility: vi.fn(),
    setAttributes: vi.fn(),
    ...over
  };
  (globalThis as typeof globalThis & { Tawk_API?: TawkApi }).Tawk_API = api;
  return api;
};

afterEach(() => {
  delete (globalThis as typeof globalThis & { Tawk_API?: TawkApi }).Tawk_API;
  vi.useRealTimers();
  document.querySelectorAll('script').forEach((node) => node.remove());
});

describe('load()', () => {
  it('injects the script BEFORE the first existing one, as the capture does', () => {
    /*
      `i.parentNode.insertBefore(e, i)` where `i` is `getElementsByTagName('script')[0]`. Asserted on
      ORDER rather than mere presence: appending instead would still put a script in the document
      and would still "work", so presence alone cannot tell the two apart.
    */
    const existing = document.createElement('script');
    existing.src = 'https://example.invalid/first.js';
    document.body.append(existing);

    createTawkRuntime(PROPERTY, viewer).load();

    const scripts = [...document.querySelectorAll('script')];
    expect(scripts).toHaveLength(2);
    expect(scripts[0].src).toContain(PROPERTY);
    expect(scripts[1]).toBe(existing);
  });

  it('does nothing at all when no property id is configured', () => {
    // A room without support configured is a normal room. `tawkScript` returns null for an empty id
    // and this must not throw, must inject nothing, and must still hand back a usable disposer.
    const stop = createTawkRuntime(undefined, viewer).load();
    expect(document.querySelectorAll('script')).toHaveLength(0);
    expect(() => stop()).not.toThrow();
  });

  it('hides the widget once the API appears, which is what the poll is for', () => {
    vi.useFakeTimers();
    // The API does NOT exist yet — the script creates it, so the first pass must find nothing.
    createTawkRuntime(PROPERTY, viewer).load();

    const api = installApi();
    vi.advanceTimersByTime(100);
    expect(api.hideWidget).toHaveBeenCalledTimes(1);
  });

  it('the disposer CANCELS the poll, which is the leak it exists to prevent', () => {
    vi.useFakeTimers();
    const stop = createTawkRuntime(PROPERTY, viewer).load();

    // Leave the room before the API ever appears.
    stop();

    const api = installApi();
    vi.advanceTimersByTime(5_000);
    expect(
      api.hideWidget,
      'the poll survived the disposer and is running against a detached document'
    ).not.toHaveBeenCalled();
  });

  it('the disposer removes the injected script', () => {
    // An anchor script must exist for injection to happen at all — see the test below.
    document.body.append(document.createElement('script'));
    const stop = createTawkRuntime(PROPERTY, viewer).load();
    expect(document.querySelectorAll('script')).toHaveLength(2);
    stop();
    expect(document.querySelectorAll('script')).toHaveLength(1);
  });

  it('injects NOTHING when the document has no script to anchor against', () => {
    /*
      FOUND BY THIS TEST FILE, 2026-08-17, and it is faithful rather than a defect.

      Injection is `first?.parentNode?.insertBefore(element, first)` where `first` is
      `getElementsByTagName('script')[0]`. With no script in the document both optional chains
      short-circuit and the widget is never added — silently, with no throw.

      That is exactly what the capture does: `i.parentNode.insertBefore(e, i)` has the same
      dependency on `i` existing. And it is safe in this app, because a SvelteKit page always ships
      its own module script, so the anchor is always there.

      It is asserted anyway, because the failure mode of "improving" this to
      `document.head.append(element)` is invisible: the widget would load in a bare document, every
      other test here would still pass, and the room would have quietly stopped matching the
      reference's insertion point. This pins the behaviour AND records why it looks wrong.
    */
    const stop = createTawkRuntime(PROPERTY, viewer).load();
    expect(document.querySelectorAll('script')).toHaveLength(0);
    expect(() => stop()).not.toThrow();
  });
});

describe('toggle()', () => {
  it('flips visibility every time, but sends attributes only ONCE', () => {
    /*
      The captured rule, and the reason the latch exists: `toggleTAWKSupport()` calls
      `toggleVisibility()` unconditionally and `setAttributes` only on the first open. A latch that
      leaked would re-send a viewer's name and email on every open of the widget.
    */
    const api = installApi();
    const tawk = createTawkRuntime(PROPERTY, viewer);

    tawk.toggle();
    tawk.toggle();
    tawk.toggle();

    expect(api.toggleVisibility).toHaveBeenCalledTimes(3);
    expect(api.setAttributes).toHaveBeenCalledTimes(1);
  });

  it('reads the viewer at TOGGLE time, not when the runtime was built', () => {
    /*
      The thunk, asserted. Attributes are sent on the first open, which can be minutes after the
      factory ran; a captured object would send the display name as it was at page load. Changing
      the name between construction and toggle is the only way to tell the two apart.
    */
    const api = installApi();
    let nick = 'Before';
    const tawk = createTawkRuntime(PROPERTY, () => ({
      savedNick: null,
      nick,
      name: nick,
      savedEmail: null,
      email: 'ada@example.com'
    }));

    nick = 'After';
    tawk.toggle();

    const sent = vi.mocked(api.setAttributes!).mock.calls[0][0];
    expect(sent.name, 'the viewer was captured at construction instead of read at toggle').toBe(
      'After'
    );
  });

  it('does nothing when the API has not loaded, rather than throwing', () => {
    // No `Tawk_API` on the global at all — a viewer clicking support before the script lands.
    const tawk = createTawkRuntime(PROPERTY, viewer);
    expect(() => tawk.toggle()).not.toThrow();
  });

  it('survives an API that exposes toggleVisibility but not setAttributes', () => {
    /*
      Every member of `TawkApi` is optional because it is a third-party global this repository does
      not control and cannot version. The optional call must not become a hard dependency by
      accident — that is a `TypeError` in front of a member who only wanted to open support.
    */
    const api = installApi({ setAttributes: undefined });
    const tawk = createTawkRuntime(PROPERTY, viewer);
    expect(() => tawk.toggle()).not.toThrow();
    expect(api.toggleVisibility).toHaveBeenCalledTimes(1);
  });
});
