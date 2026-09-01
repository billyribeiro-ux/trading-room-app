import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * CONN-02, CONN-03 and CONN-04 — who the connectivity troubleshooter is for.
 *
 * ```js
 * this.activeTab = this.appService.globals.isPresenter ? "network" : "mobile"   // byte 2,444,097
 *
 * O(5, o.appService.globals.isPresenter ? 5 : 6)          // the TITLE, two template fns
 * z("ngIf", o.appService.globals.isPresenter)   // the Network Test li
 * Tt("active", "mobile" === o.activeTab)        // the Mobile App li, UNCONDITIONAL
 * z("ngIf", o.appService.globals.isPresenter)   // the Mic Test li          // byte 2,456,395
 *
 * function dAe(t,n){1&t&&v(0," Connectivity/Mic Troubleshooter ")}
 * function uAe(t,n){1&t&&v(0," Connectivity Troubleshooter ")}              // byte 2,433,777
 * ```
 *
 * ## This room had the gates the other way round
 *
 * The reference gates BOTH the Network Test and the Mic Test tabs on `isPresenter` and leaves only
 * Mobile App unconditional. Ours gated the Mic Test and left Network Test open, so a member could
 * run the WebRTC connectivity test. Diagnostic rather than privileged — so this is defence in depth
 * rather than a hole being closed — and the title promised them a mic troubleshooter they could
 * (correctly) not see.
 *
 * ## CONN-01 was found ALREADY BUILT
 *
 * The row says the Mobile App tab, its body and `restoreMobileAppTokens` are absent entirely. All
 * three exist — `MobileRestorePane.svelte` is the pane, whole, with the reference's own missing full
 * stop preserved. The audit was produced against an earlier tree.
 */

const read = (path: string) => readFileSync(path, 'utf8');
/*
  THE MODAL LEFT `ModalHost.svelte` ON 2026-09-01, whole, for `ConnectivityModal.svelte`.

  `source-size-contract` had NAMED that extraction twice and deferred it twice; the third time the
  host went past its ceiling there was nothing smaller left to extract, so the 809 lines went. This
  file reads the component that holds the markup now — repointed rather than widened to "either
  file", because which component owns the troubleshooter is itself a fact worth failing on.
*/
const MODAL_PATH = 'src/lib/components/ConnectivityModal.svelte';

/** Comments stripped: this file's prose quotes every gate it asserts. */
const modal = () => codeOf(MODAL_PATH, read(MODAL_PATH));

/** The Svelte block opened at `opening`, to its MATCHING close, measured from `from`. */
const blockAt = (source: string, opening: string, from = source.indexOf(opening)) => {
  expect(from, `\`${opening}\` is not in the source`).toBeGreaterThan(-1);
  let depth = 0;
  let cursor = from;
  while (cursor < source.length) {
    const open = source.indexOf('{#', cursor);
    const close = source.indexOf('{/', cursor);
    expect(close, `\`${opening}\` is never closed`).toBeGreaterThan(-1);
    if (open > -1 && open < close) {
      depth += 1;
      cursor = open + 2;
      continue;
    }
    depth -= 1;
    if (depth === 0) return source.slice(from, source.indexOf('}', close) + 1);
    cursor = close + 2;
  }
  throw new Error(`\`${opening}\` is never closed`);
};

/** Every `{#if …}` that ENCLOSES `marker`, innermost last. Position passed explicitly. */
const gatesAround = (source: string, marker: string) => {
  const at = source.indexOf(marker);
  expect(at, `${marker} must be rendered`).toBeGreaterThan(-1);
  const enclosing: string[] = [];
  for (const found of source.matchAll(/\{#if ([^}]+)\}/g)) {
    const block = blockAt(source, found[0], found.index);
    if (found.index < at && found.index + block.length > at) enclosing.push(found[1]);
  }
  return enclosing;
};

describe('CONN-02 — the two tabs the reference withholds from a member', () => {
  it('gates the Network Test TAB', () => {
    expect(gatesAround(modal(), 'Network Test')).toContain('isPresenter');
  });

  it('gates the Mic Test tab, which it already did', () => {
    expect(gatesAround(modal(), 'Mic Test')).toContain('isPresenter');
  });

  it('leaves the Mobile App tab out of that gate, which is the reference s whole shape', () => {
    /*
      The negative control on the row above: gating all three would pass "is Network Test gated?"
      and leave a member with no tab at all. Upstream draws this one unconditionally; ours adds
      `mobileAppAvailable`, which is a different question and is recorded at the prop.
    */
    /*
      `not.toContain('isPresenter')` on an ARRAY tests for an exact ELEMENT, so it was satisfied by
      a gate reading `isPresenter && mobileAppAvailable` — which is precisely the mutation this row
      is here to refuse. Its control stayed green. Every enclosing gate is checked for the term now,
      not the list for the string.
    */
    const gates = gatesAround(modal(), 'Mobile App');
    expect(gates.filter((gate) => gate.includes('isPresenter'))).toEqual([]);
    /* …and the tab IS gated, on the entitlement, so this is not an empty list passing. */
    expect(gates).toContain('mobileAppAvailable');
  });

  it('carries the same term on the BODY and the footer, not only on the tab', () => {
    /*
      SC-17's lesson: a gate on the way in is not a statement about what the thing is for. Both the
      panel and the Start Test button in the footer test it themselves.
    */
    expect(
      modal().match(/\{#if isPresenter && activeConnectivityTab === 'network'\}/g)
    ).toHaveLength(2);
  });
});

describe('CONN-03 — the tab it opens on', () => {
  it('is the reference s ternary rather than a literal', () => {
    expect(modal()).toContain("untrack(() => (isPresenter ? 'network' : 'mobile'))");
  });

  it('seeds ONCE, so a click is not undone by a refetch', () => {
    const at = modal().indexOf('let activeConnectivityTab');
    expect(at, 'the declaration is missing').toBeGreaterThan(-1);
    const to = modal().indexOf(');', at);
    expect(to, 'the declaration is never closed').toBeGreaterThan(at);
    expect(modal().slice(at, to)).toContain('untrack');
  });
});

describe('CONN-04 — the title', () => {
  it('drops the "/Mic" for somebody with no Mic tab', () => {
    expect(modal()).toContain(
      "title={isPresenter ? 'Connectivity/Mic Troubleshooter' : 'Connectivity Troubleshooter'}"
    );
  });
});

describe('the empty modal our own gate could have produced', () => {
  it('says why it is empty rather than opening onto nothing', () => {
    /*
      Upstream's Mobile App tab is unconditional, so a non-presenter always has one. Ours is behind
      `mobileAppAvailable`, correctly — and together with CONN-02's gate that leaves a member in a
      room with no mobile app opening this modal onto NOTHING. A control whose only effect is that
      it opened is the shape `CLAUDE.md` refuses hardest.
    */
    const source = modal();
    expect(source).toContain('{:else if !isPresenter && !mobileAppAvailable}');
    expect(source).toContain('There is nothing to troubleshoot from here.');
    /* …and the mobile pane still requires the entitlement, which is what creates the case. */
    expect(source).toContain("{:else if activeConnectivityTab === 'mobile' && mobileAppAvailable}");
  });
});

describe('CONN-01 — found already built, and pinned so it stays that way', () => {
  it('renders the pane, the tab and the restore command', () => {
    const source = modal();
    expect(source).toContain('<MobileRestorePane onrestore={onrestoremobiletokens} />');
    expect(source).toContain('fa-mobile-alt me-1');
  });

  it('keeps the reference s own missing full stop in the blurb', () => {
    /* `v(2," …Only do this if you are not getting notifications ")` — no period. The kind of thing
       a well-meaning edit repairs, so it is asserted rather than trusted. */
    expect(read('src/lib/components/MobileRestorePane.svelte')).toContain(
      'Only do this if you are not getting notifications'
    );
    expect(read('src/lib/components/MobileRestorePane.svelte')).not.toContain(
      'not getting notifications.'
    );
  });
});
