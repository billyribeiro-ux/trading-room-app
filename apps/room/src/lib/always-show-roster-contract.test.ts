import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * "Always show roster?" — the sidebar opens on arrival, and it is a SEED rather than a lock.
 *
 * ## The transcription
 *
 * Bytes 1,499,261 and 2,566,991 — the room component and its popout, the same three statements in
 * both:
 *
 * ```js
 * sessData.alwaysShowRoster && (
 *   this.showSidebar = !0,
 *   this.alwaysShowRoster = !0,
 *   setTimeout(() => this.appService.loadRoster(), 500))
 * ```
 *
 * The second statement is a component field the templates read; the third is a deferred roster
 * fetch. This room needs neither: `sidebarOpen` IS the field, and the roster arrives with the page
 * load rather than through a 500 ms timer.
 *
 * ## Why a source assertion and not a render
 *
 * The thing that can regress is the INITIALISER — `$state(false)` instead of `$state(<the
 * setting>)` — and that is invisible to a render, which would need a page mount and a full room to
 * show it. The one thing worth pinning is that the initial value comes off `sessData` and compares
 * with `=== true` like every other room setting in this room.
 *
 * ## A SEED, and the word matters
 *
 * `toggleSideBarUsersCount` upstream still closes the sidebar afterwards (byte 2,515,475), so the
 * setting decides what a member ARRIVES to and not what they are held to. Writing it as a `$derived`
 * would have been the lock, and would also have re-opened the sidebar on every page invalidation —
 * which this room does every five seconds.
 */
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

describe('the sidebar seed', () => {
  it('takes its initial value from the room setting', () => {
    expect(page).toContain('let sidebarOpen = $state(data.sessData?.alwaysShowRoster === true);');
  });

  /*
    `$state`, never `$derived` — the difference between a seed and a lock, and between a sidebar a
    member can close and one that springs back open on the next five-second invalidate.
  */
  it('is state a member can close, not a derivation that re-opens it', () => {
    expect(page).not.toContain('const sidebarOpen = $derived');
    /*
      The toggle is the NAVBAR's — `bind:sidebarOpen` carries the write back up — so the proof that
      this is a seed and not a lock lives there. A `$derived` on the page would make that write
      impossible and would also re-open the sidebar on every five-second invalidate.
    */
    const navbar = readFileSync(new URL('./components/RoomNavbar.svelte', import.meta.url), 'utf8');
    expect(navbar).toContain('sidebarOpen = !sidebarOpen');
    expect(page).toContain('bind:sidebarOpen');
  });

  /*
    THE REFERENCE'S SECOND USE OF THE SAME FLAG IS REFUSED, and the refusal is recorded where the
    gate it would have widened lives rather than only in a changelog nobody greps.

    Byte 2,487,668 adds `alwaysShowRoster` as a third OR-term to the mobile-app ICON's slot while
    `getMyPinAndDoInfo` keeps the two-term gate (2,529,070) — so upstream the icon renders and the
    command behind it refuses. Reproducing that here would put a button in the navbar that opens a
    modal reading `N/A` forever.
  */
  it('keeps the mobile-app gate at TWO terms, with the refusal written down', () => {
    const gates = readFileSync(new URL('./room/gates.ts', import.meta.url), 'utf8');
    /*
      Every bound is asserted FOUND before it is used, which `slice-anchor-contract.test.ts` requires
      and which this test needed: `indexOf` returns -1 for a marker that has moved, and
      `slice(-1, …)` reads the last character rather than failing. The whole assertion would then be
      "the last character of the file does not contain alwaysShowRoster", which is true and useless.
    */
    const from = gates.indexOf('get mobileAppAvailable');
    expect(from, 'mobileAppAvailable has been renamed or removed').toBeGreaterThan(-1);
    const returnAt = gates.indexOf('return', from);
    expect(returnAt, 'mobileAppAvailable has no return').toBeGreaterThan(-1);
    const closeAt = gates.indexOf('}', returnAt);
    expect(closeAt, 'mobileAppAvailable is unterminated').toBeGreaterThan(-1);
    expect(gates.slice(from, closeAt)).not.toContain('alwaysShowRoster');

    // …and the reason is at the code, in the docblock immediately above it.
    const docblockAt = gates.lastIndexOf('/**', from);
    expect(docblockAt, 'mobileAppAvailable lost its docblock').toBeGreaterThan(-1);
    expect(
      gates.slice(docblockAt, from),
      'the refusal must stay explained where it applies'
    ).toContain('alwaysShowRoster');
  });
});
