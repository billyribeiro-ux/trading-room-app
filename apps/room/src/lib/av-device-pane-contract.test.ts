// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import AvDevicePane from './components/AvDevicePane.svelte';
import type { CaptureSettings } from './capture-settings.js';

/**
 * SC-09, SC-10, SC-15 and SC-16 — the A/V pane's four states, three of which had no shape.
 *
 * **SC-09 is the one that mattered.** Every error this pane can raise is TRANSIENT: a denied
 * permission the member can grant, a device they can plug in, a page they can reload over HTTPS. The
 * only way out was the Refresh button at the TOP of the pane, above a red block that ends the
 * reading — so somebody who had just fixed the problem the message describes had nothing beside the
 * message to press.
 *
 * MOUNTED, because all four are states rather than markup: the pane opens in one of them and moves
 * between them, and an SSR first frame can only ever show the one it opens in.
 */

/*
  A CWD-relative path, not `import.meta.url`. This file runs under jsdom because it mounts a
  component, and jsdom gives `import.meta.url` an `http:` scheme that `readFileSync` refuses.
*/
const SOURCE = readFileSync('src/lib/components/AvDevicePane.svelte', 'utf8');
const readSource = () => SOURCE;

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

const capture: CaptureSettings = {
  audioDeviceId: '',
  videoDeviceId: '',
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false
};

const open = () => {
  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(AvDevicePane, {
    target,
    props: { capture, onPreferenceChange: () => {} }
  });
  flushSync();
  mounted.push(() => {
    unmount(component);
    target.remove();
  });
  return target;
};

describe('SC-10 — an empty select is not a message', () => {
  it('says "Please connect audio devices." instead of an empty dropdown', () => {
    /*
      `O(99, audioDevicesList?.length > 0 ? 99 : devicesLoading || devicesLoadError ? -1 : 100)` at
      byte 2,142,196. The gate replaces the WHOLE group — label, select and the "Selected:" line —
      and that matters here more than upstream: this pane deliberately opens with both lists empty,
      so an empty dropdown that opens onto nothing was the first thing a member ever saw.
    */
    const dom = open();
    expect(dom.textContent).toContain('Please connect audio devices.');
    expect(dom.textContent).toContain('Please connect video devices.');
    expect(
      dom.querySelector('#audio-deviceList'),
      'the select is replaced, not decorated'
    ).toBeNull();
    expect(dom.querySelector('#video-deviceList')).toBeNull();
  });

  it('uses the reference s two crossed-out icons, which are not the same one', () => {
    /* `101 [1,"fas","fa-microphone-slash"]` and `104 [1,"fas","fa-video-slash"]`. */
    const dom = open();
    expect(dom.querySelector('i.fa-microphone-slash')).not.toBeNull();
    expect(dom.querySelector('i.fa-video-slash')).not.toBeNull();
  });
});

describe('SC-15 and SC-16 — the button and the two blocks it produces', () => {
  it('gives the loading state the same `alert` shape its error twin already had', () => {
    /*
      Const 49 is `[1,"alert","alert-info"]` and this read `text-center my-3`. A loading state
      rendering as bare centred text next to an error rendering as a panel reads as two different
      KINDS of message, when they are the two outcomes of one button.
    */
    const source = readSource();
    expect(source).toContain('<div class="alert alert-info">');
    expect(source).toContain("{' Loading devices... '}");
  });

  it('disables Refresh while it is working, and swaps its icon', () => {
    /*
      `z("disabled", e.devicesLoading)` and
      `z("ngClass", e.devicesLoading ? "fa-spinner fa-spin" : "fa-sync-alt")` at byte 2,154,613.
      Pressing Refresh twice fired a second `getUserMedia` while the first was still resolving, and
      the pane looked identical throughout — which is why anybody would press it twice.
    */
    const source = readSource();
    expect(source).toContain('disabled={devicesLoading}');
    expect(source).toContain("devicesLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'");

    /* The button starts enabled, which is the state a member actually meets. */
    const button = open().querySelector<HTMLButtonElement>('button[title="Refresh device list"]');
    expect(button, 'the refresh button is missing').not.toBeNull();
    expect(button?.disabled).toBe(false);
  });
});

/**
 * The `<div …>` opened at `openTag`, up to its MATCHING close, by walking depth.
 *
 * ## Why this is here and not a fixed-length slice
 *
 * SC-09's first draft sliced 700 characters forward from `{#if devicesLoadError}` and asserted the
 * Retry button appeared in the window. Its negative control — moving Retry OUT of the alert, which
 * is the entire behaviour the row exists for — **stayed green**, because a button moved one line
 * past `</div>` is still inside 700 characters. The assertion read as a requirement about nesting
 * and measured proximity.
 *
 * That is the fifth assertion in this repository caught by its own control rather than by review,
 * and the fourth of them a slice bounded by something that does not mean what the prose above it
 * says. The rule the earlier four earned applies unchanged: **when nesting is what differs, nesting
 * is what gets measured.** A window that happens to contain the right text is not containment.
 */
const elementAt = (source: string, openTag: string) => {
  const at = source.indexOf(openTag);
  expect(at, `\`${openTag}\` is not in the source`).toBeGreaterThan(-1);
  let depth = 0;
  let cursor = at;
  while (cursor < source.length) {
    const open = source.indexOf('<div', cursor);
    const close = source.indexOf('</div>', cursor);
    expect(close, `\`${openTag}\` is never closed`).toBeGreaterThan(-1);
    if (open > -1 && open < close) {
      depth += 1;
      cursor = open + 4;
      continue;
    }
    depth -= 1;
    if (depth === 0) return source.slice(at, close + 6);
    cursor = close + 6;
  }
  throw new Error(`\`${openTag}\` is never closed`);
};

describe('SC-09 — the error has a way out, inside it', () => {
  const alert = () => elementAt(readSource(), '<div class="alert alert-danger">');

  it('renders the icon, the message and a Retry button in one alert', () => {
    /*
      ```js
      d(0,"div",50), T(1,"i",92), v(2), d(3,"button",93),
        x("click", () => loadDevices()), T(4,"i",94), v(5," Retry ")
      ```
      Asserted as source rather than by driving the error: every path to `devicesLoadError` goes
      through `navigator.mediaDevices`, which jsdom does not implement — stubbing it would test the
      stub. What can regress is the markup, and the markup is what this pins.
    */
    const block = alert();
    expect(block).toContain('<i class="fas fa-exclamation-triangle"></i>');
    expect(block).toContain('class="btn btn-sm btn-outline-secondary ml-2"');
    expect(block).toContain('<i class="fas fa-redo"></i>');
    expect(block).toContain("{' Retry '}");
  });

  it('and the alert is what the error branch renders', () => {
    /* Containment is only the row's point if the container is the thing the error puts on screen. */
    const source = readSource();
    const branch = source.indexOf('{#if devicesLoadError}');
    expect(branch, 'the error block is missing').toBeGreaterThan(-1);
    expect(source.indexOf('<div class="alert alert-danger">')).toBeGreaterThan(branch);
  });

  it('wires Retry to the SAME loader the Refresh button calls', () => {
    /*
      `x("click", () => g(2).loadDevices())` — not a reload, not a second code path. A retry that
      did something different from Refresh would be two ways to answer one question.
    */
    expect(alert()).toContain('onclick={() => void loadDevices()}');
  });

  it('keeps the reference s spaces around the message', () => {
    /* `Ne(" ", e.devicesLoadError, " ")` — and inside the alert, like everything else in this row. */
    expect(alert()).toContain('{` ${devicesLoadError} `}');
  });
});
