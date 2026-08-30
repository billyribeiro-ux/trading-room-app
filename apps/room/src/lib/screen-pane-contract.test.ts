import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `SV-SP-02` through `SV-SP-14` — the screenshare pane, its tab bar and the transport behind them.
 *
 * Every offset below is read out of the pinned v4 bundle at assert time rather than quoted, because
 * three of these rows turn on a const table and one on a NEGATED gate — `O(4, a || b || c ? -1 : 4)`
 * shows the connecting line when NONE of the three holds, and reading it the other way round builds
 * the opposite feature.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const pane = codeOf('components/ScreenPane.svelte', read('./components/ScreenPane.svelte'));
const tabs = codeOf('components/ScreenTabs.svelte', read('./components/ScreenTabs.svelte'));
const area = codeOf(
  'components/PresentationArea.svelte',
  read('./components/PresentationArea.svelte')
);
const screens = read('./room/screens.svelte.ts');
const transport = read('./room/media-transport.svelte.ts');
const capture = read('./room/local-capture.svelte.ts');
const BUNDLE = read('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js');

describe('the bundle these rows were read from', () => {
  it('is the pinned one — the vacuity floor for every offset below', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });
});

describe('SV-SP-02 — the pane a screen was detached FROM blanks and offers the way back', () => {
  it('is the reference behaviour, read at the offset', () => {
    /*
      The audit cites 1,492,849, which is INSIDE the sub-template rather than at the literal — the
      string itself starts at 1,492,830 and occurs exactly once in the bundle. Both facts are
      asserted, because "the text is somewhere in this file" would pass against a rename.
    */
    expect(BUNDLE.indexOf(' Screen Detached.. Click here to re-attach ')).toBe(1_492_830);
    expect(BUNDLE.split(' Screen Detached.. Click here to re-attach ').length - 1).toBe(1);
    expect(BUNDLE.slice(1_501_523, 1_501_523 + 120)).toContain('O(1,o.isDetached?1:-1)');
  });

  it('draws the captured heading with the captured text', () => {
    expect(pane).toContain('{#if detachedHere}');
    expect(pane).toContain('<h3 class="mt-4 text-center">');
    expect(pane).toContain('Screen Detached.. Click here to re-attach');
  });

  it('makes the control a real control, which upstream does not', () => {
    /*
      Upstream hangs the click on the `<h3>`: not focusable, not keyboard operable, announced as a
      heading. `role="button"` plus a tabindex on the heading was tried first and is exactly what
      `a11y_no_noninteractive_element_to_interactive_role` refuses — it would have SAID button and
      still been a heading.
    */
    expect(pane).toContain('<button type="button" class="reattach"');
    expect(pane).not.toContain('role="button"');
  });

  it('tracks which screens THIS window has detached, separately from being a popout', () => {
    /*
      The two are opposite ends of one gesture and their upstream names differ by four characters —
      `isDetached` (the source pane) and `isDetachedCtrl` (the popout recognising itself).
    */
    expect(screens).toContain('isDetachedHere(screenId: string): boolean {');
    expect(screens).toContain('reattach(screenId: string): void {');
    expect(screens).toContain('get detachedScreenId() {');
    expect(area).toContain('detachedHere={screens.isDetachedHere(screen.id)}');
    expect(area).toContain('onreattach={() => screens.reattach(screen.id)}');
  });

  it('un-detaches in ONE place, so the two exits cannot drift', () => {
    /*
      Closing the popout is what re-attaches, and its `beforeunload` already clears the flag and
      re-selects the tab. `reattach` closes the window and clears the list rather than restating the
      handler, because a viewer can close the popout by hand and that path must not be a second
      implementation.
    */
    const from = screens.indexOf('reattach(screenId: string): void {');
    expect(from, 'reattach is gone').toBeGreaterThan(-1);
    const to = screens.indexOf('\n  }', from);
    expect(to, 'reattach never closes').toBeGreaterThan(from);
    const body = screens.slice(from, to);
    expect(body).toContain('popout.close()');
    expect(body).toContain('this.#selectTabOfId(screenId)');
  });
});

describe('SV-SP-03 — an un-arrived screen says so', () => {
  it('is the reference behaviour, read at the offset', () => {
    // The literal starts one byte before the cited offset, and appears twice — the create block
    // and the update block of the same sub-template.
    expect(BUNDLE.indexOf(' Connecting To Screen of ')).toBe(1_493_277);
  });

  it('reads the gate as the NEGATION it is', () => {
    /*
      `O(4, o.isConnected || o.isPresentingThisScreen || o.isDetached ? -1 : 4)` at byte 1,501,699 —
      the line shows only while NONE of the three holds. Read the other way round it builds the
      opposite feature: a spinner over every screen that IS connected.
    */
    expect(BUNDLE.slice(1_501_699, 1_501_699 + 200)).toContain(
      'O(4,o.isConnected||o.isPresentingThisScreen||o.isDetached?-1:4)'
    );
    expect(pane).toContain('const connecting = $derived(!connected && !detachedHere);');
  });

  it('counts a screen this browser shares as connected, or a presenter waits forever', () => {
    /*
      `isPresentingThisScreen`. Our own screens render from the local capture rather than from a
      consumer, so they are connected the moment they exist and no producer is coming.
    */
    expect(pane).toContain('const connected = $derived(stream !== null || ownScreen);');
    expect(area).toContain('ownScreen={screen.ownerId === null}');
  });

  it('draws the captured classes, the spinner and the hyphenated label', () => {
    expect(pane).toContain('class="text-center mt-4 animated fadeIn"');
    expect(pane).toContain('<i class="fas fa-spinner fa-pulse"></i>');
    expect(pane).toContain('Connecting To Screen of {presenterName}-{screenName}');
  });
});

describe('SV-SP-04 — a consumer that came up with no picture is asked for again', () => {
  it('is the reference behaviour, read at the offset', () => {
    expect(BUNDLE.slice(1_499_022 - 60, 1_499_022 + 200)).toContain('i.tooSmallRetries<3');
  });

  it('takes the three constants from the reference rather than from taste', () => {
    expect(transport).toContain('const SCREEN_TOO_SMALL_RETRIES = 3;');
    expect(transport).toContain('export const SCREEN_TOO_SMALL_DELAY_MS = 3_000;');
    expect(transport).toContain('export const SCREEN_TOO_SMALL_PIXELS = 10;');
  });

  it('splits the measurement from the decision', () => {
    /*
      The pane owns the element and can see `videoWidth`; only the transport can ask for the producer
      again. That is the same decision-versus-effect split every other feature here draws.
    */
    expect(pane).toContain('ontoosmall?.()');
    expect(pane).toContain('onsettled?.()');
    expect(area).toContain('ontoosmall={() => void mediaTransport.retryScreen(screen.id)}');
    expect(area).toContain('onsettled={() => mediaTransport.screenSettled(screen.id)}');
  });

  it('spends a budget per producer, and gives it back on a good picture', () => {
    /*
      `i.tooSmallRetries = 0` on the success path. Without it a long session exhausts the budget on
      unrelated blips; per producer, because one bad consumer must not spend another's.
    */
    expect(transport).toContain('#tooSmallRetries = new Map<string, number>();');
    expect(transport).toContain('if (attempts >= SCREEN_TOO_SMALL_RETRIES) return;');
    expect(transport).toContain('screenSettled(producerId: string): void {');
    expect(transport).toContain('this.#tooSmallRetries.delete(producerId);');
  });

  it('retains what it would take to ask again', () => {
    expect(transport).toContain('this.#consumedScreens.set(info.producerId, info);');
  });

  it('clears its timer, so a closed pane cannot re-consume', () => {
    expect(pane).toContain('globalThis.clearTimeout(sizeCheck);');
    expect(pane).toContain("node.removeEventListener('playing', onPlaying);");
  });
});

describe('SV-SP-06 — a locked screen says it is locked, and can be unlocked in one click', () => {
  it('is the reference behaviour, read at the offset', () => {
    expect(BUNDLE.slice(1_918_843, 1_918_843 + 200)).toContain('toggleLockScreen');
    expect(BUNDLE.slice(1_920_343, 1_920_343 + 160)).toContain(
      'O(3,i.appService.globals.lockedScreenID===e._id?3:-1)'
    );
  });

  it('draws the badge on the bar that actually locks screens', () => {
    /*
      The asymmetry was the tell: `StreamTabs` has rendered this badge from the same const all along,
      on the bar where upstream it can never appear, while `lockedScreenId` reached THIS component
      and was read for one thing — flipping a dropdown item's label.
    */
    expect(tabs).toContain('{#if screen.id === lockedScreenId}');
    expect(tabs).toContain("tooltip: 'Unlock this screen?'");
    expect(tabs).toContain('<i aria-hidden="true" class="fas fa-lock"></i>');
    expect(tabs).toContain('ontogglelock?.(screen.id);');
  });

  it('does not also select the tab, because the badge lives inside its anchor', () => {
    const at = tabs.indexOf('{#if screen.id === lockedScreenId}');
    expect(at, 'the badge is gone').toBeGreaterThan(-1);
    const to = tabs.indexOf('{/if}', at);
    expect(to, 'the badge block never closes').toBeGreaterThan(at);
    expect(tabs.slice(at, to)).toContain('event.stopPropagation();');
  });

  it('comes AFTER the forced-screen eye badge, which is the reference order', () => {
    expect(tabs.indexOf('fa-eye')).toBeLessThan(tabs.indexOf('fa-lock'));
  });
});

describe('SV-SP-08 — unmuting while sharing pulls the room to the selected screen', () => {
  it('is the reference behaviour, read at the offset', () => {
    expect(BUNDLE.slice(1_141_836 - 120, 1_141_836 + 160)).toContain(
      'this.globals.isScreenSharing&&this.sendServerAdminCommand("focusOnScreen"'
    );
  });

  it('adds the READER, which is what was missing — the write was always there', () => {
    expect(screens).toContain('focusRoomOnSelectedScreen(): void {');
    expect(capture).toContain(
      'if (this.#media.screenSharing) this.#screens.focusRoomOnSelectedScreen();'
    );
  });

  it('goes through bringEveryoneTo rather than a parallel focus call', () => {
    /*
      The two are the same act: it re-checks the presenter role and moves this browser first. A
      second path would be a second place for that rule to drift.
    */
    const from = screens.indexOf('focusRoomOnSelectedScreen(): void {');
    const to = screens.indexOf('\n  }', from);
    expect(to).toBeGreaterThan(from);
    const body = screens.slice(from, to);
    expect(body).toContain('this.bringEveryoneTo(screenId);');
    expect(body).toContain('if (!screenId) return;');
  });
});

describe('SV-SP-10 — the screenshare element is silent, three ways as upstream is', () => {
  it('is the reference behaviour, read at the offset', () => {
    /* `muted` sits BEFORE the `3` marker — a static attribute — and `volume` is not in the list. */
    const const8 = BUNDLE.slice(1_500_691, 1_500_691 + 200);
    expect(const8).toContain('"muted","true"');
    expect(const8).not.toContain('"volume"');
  });

  it('makes it a static attribute and passes no volume at all', () => {
    expect(pane).toContain('muted\n          {@attach attachStream}');
    expect(pane).not.toContain('node.volume =');
    expect(pane).not.toContain('node.muted =');
    expect(area).not.toContain('muted={volume === 0}');
  });
});

describe('SV-SP-14 — the detached zoom cluster hides with the picture', () => {
  it('is the reference behaviour, read at the offset', () => {
    /*
      1,493,686 is where `Y0e` — the cluster's sub-template — begins; the CLASS lives in the const
      table at 1,500,490. Both are asserted, because the row is about the binding on the container
      and the container is named in one place and rendered in the other.
    */
    expect(BUNDLE.slice(1_493_686, 1_493_686 + 60)).toContain('function Y0e');
    expect(BUNDLE.indexOf('zoom-controls-container-detached')).toBe(1_500_490);
  });

  it('collapses under exactly the conditions that hide the video', () => {
    /*
      `$0e = t => ({hidden: t})` over `!e.isDetached && (!e.isConnected || … || saveData)`. ONE
      derived feeds both, so a popout whose stream has not arrived cannot float a magnifier over an
      empty box — and the two cannot drift apart into different conditions.
    */
    expect(pane).toContain(
      'const pictureHidden = $derived(!detachedHere && (!connected || saveData));'
    );
    expect(pane).toContain(
      "class={['zoom-controls-container-detached', { hidden: pictureHidden }]}"
    );
    expect(pane).toContain("{ hidden: pictureHidden, 'viewer-only-screen-video': viewerOnlyMode }");
  });
});
