import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import StreamTabs from './components/StreamTabs.svelte';
import type { MtxStream } from './mtx-streams';

/*
  `StreamTabs.svelte` is a transcription of `RSe`, and a transcription whose source is not asserted
  is a guess with a citation stapled to it.

  This file does two jobs. The first is the ordinary one: pin the reference's markup so the
  component cannot drift from it. The second matters more. FOUR of the controls in this tab bar do
  nothing in the shipped reference, and every one of them reads as working if you only look at the
  template. Each is pinned below against the bundle, because the failure mode is not that somebody
  deletes them — it is that somebody "finishes" one by inventing a protocol, and ships a lock button
  that locks nothing on a multi-tenant fintech room.
*/

const bundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const stream = (id: string, name: string): MtxStream => ({
  _id: id,
  sessionID: '652882112ad80b3e7c5132d5',
  producerID: `producer-${id}`,
  mediaValue: { name, serverName: 'media.example.com' }
});

const STREAMS = [stream('aaa111', 'Dana Vero'), stream('bbb222', 'Kit Marlow')];

describe('the reference markup is decoded, not inferred', () => {
  it('pins the whole update block in one string', () => {
    /*
      This single assertion carries most of the transcription. Reading left to right it fixes: the
      anchor id (`${_id}-tab`), the `active` class map, `aria-controls`, BOTH dead badges, the label
      being `mediaValue.name` and nothing else, the `isP` gate on the first menu item, and the
      lockedScreenID/lockedScreenIDMTX asymmetry that the last two clauses disagree about.
    */
    expect(bundle).toContain(
      'm(),ei("id","",e._id,"-tab"),z("ngClass",ut(9,Go,i.selectedMTXStreamTab==e._id)),' +
        'Dt("aria-controls",e._id),m(),O(2,i.forcedScreenMTXID==e._id?2:-1),m(),' +
        'O(3,i.appService.globals.lockedScreenIDMTX===e._id?3:-1),m(2),Ze(e.mediaValue.name),' +
        'm(5),O(10,i.isP?10:-1),m(3),O(13,i.appService.globals.lockedScreenID!==e._id?13:14)'
    );
  });

  it('pins the const entries for the bar and its pane', () => {
    // The bar is `id="streamsTabs"` but wears the SCREENSHARE bar's `screens-tabs` class.
    expect(bundle).toContain(
      '"id","streamsTabs","role","tablist",1,"nav","nav-tabs","screens-tabs"'
    );
    expect(bundle).toContain('"id","streamsTabsContent",1,"tab-content"');
    // There is no `streams-tabs` class anywhere. Inventing one would look right and style nothing.
    expect(bundle).not.toContain('"streams-tabs"');
  });

  it('pins the two menu items and the class map', () => {
    expect(bundle).toContain('["href","#",1,"dropdown-item"]');
    expect(bundle).toContain('["aria-labelledby","dropdownMenuButton",1,"dropdown-menu"]');
    // `Go` is what `ut(9,Go,…)` above resolves to — the `active` class, not `show active`.
    expect(bundle).toContain('Go=t=>({active:t})');
  });
});

describe('the four controls that are INERT upstream', () => {
  /*
    Each `it` below is a standing refusal. If one starts failing because the reference changed, the
    feature became real and can be built from the new evidence. Until then, none of them may be
    "implemented" from imagination.
  */

  it('"Lock Screen" calls a console.error stub', () => {
    expect(bundle).toContain('toggleLockScreenMTX(e){console.error("TODO: toggleLockScreenMTX")');
    // And it sits directly beside a REAL implementation for screenshares, so it is not that the
    // feature is unimplementable — it is that this half of it was never written.
    expect(bundle).toContain('toggleLockScreen(e){this.appService.globals.lockedScreenID=');
  });

  it('the forced (eye) badge has no writer in the entire bundle', () => {
    const hits = bundle.split('forcedScreenMTXID').length - 1;
    expect(hits, 'exactly one read in the template, one init in the constructor').toBe(2);
    expect(bundle).toContain('forcedScreenMTXID=""');
  });

  it('the lock badge has no writer either', () => {
    /*
      FOUR, not three. The `selectStreamTabOfId` guard names the field TWICE in one expression, and
      the first attempt at this count said three because it came from a `grep -o` whose match window
      swallowed the second occurrence. The count is done here by splitting the whole file precisely
      so that a miscount fails the build instead of becoming a comment nobody rechecks.
    */
    const hits = bundle.split('lockedScreenIDMTX').length - 1;
    expect(hits, 'one globals init, one template read, two in the selectStreamTabOfId guard').toBe(
      4
    );
    expect(bundle).toContain('lockedScreenIDMTX=""');
    // The only READ outside the template is the guard, which is why the field looks load-bearing.
    expect(bundle).toContain(
      '!this.appService.globals.lockedScreenIDMTX||this.appService.globals.lockedScreenIDMTX===e._id'
    );
  });

  it('"Bring everyone here" broadcasts an id no recipient can resolve', () => {
    // It sends the same command the screenshare menu sends...
    expect(bundle).toContain(
      'bringFocusToScreen(e){e&&this.appService.sendServerAdminCommand("focusOnScreen",{id:e})}'
    );
    // ...but every receiver scans the SCREENSHARE list only, never mtxHandlerService.mtxStreams.
    expect(bundle).toContain(
      'guiEventBus.subscribe("focusOnScreen",e=>{const i=this.mediaService.screenSharingUsers'
    );
    expect(bundle).not.toContain('focusOnScreen",e=>{const i=this.mtxHandlerService.mtxStreams');
  });
});

describe('what the tab renders', () => {
  const body = (props: Record<string, unknown>) =>
    render(StreamTabs, { props: { streams: STREAMS, ...props } }).body;

  it('is the streams bar, wearing the screenshare bar’s class', () => {
    const html = body({});
    expect(html).toContain('id="streamsTabs"');
    expect(html).toContain('nav nav-tabs screens-tabs');
  });

  it('labels a tab with mediaValue.name ALONE', () => {
    const html = body({});
    expect(html).toContain('<span class="mx-1">Dana Vero</span>');
    expect(html).toContain('<span class="mx-1">Kit Marlow</span>');
  });

  it('is not ScreenTabs — no avatar, no screenName join', () => {
    /*
      The one mistake this component exists to prevent. `ScreenTabs` renders `img.presenter-img` and
      `{name}-{screenName}` unconditionally, so reusing it here would put an avatar and a dangling
      hyphen on every stream tab. `RSe` has neither: its label interpolation is `Ze(e.mediaValue.name)`,
      pinned above, and the const table gives its `<a>` no `img` child at all.
    */
    const html = body({});
    expect(html).not.toContain('presenter-img');
    expect(html).not.toContain('<img');
    // The label span holds the name and closes — no hyphen, no second half.
    expect(html).toMatch(/<span class="mx-1">Dana Vero<\/span>/);
    expect(html).not.toContain('Dana Vero-');
  });

  it('marks only the selected tab active', () => {
    const html = body({ selectedStreamId: 'bbb222' });
    expect(html).toContain('id="aaa111-tab"');
    expect(html).toContain('id="bbb222-tab"');
    // `aria-selected` is a real boolean here; upstream hardcodes "true" on every tab (const 74).
    expect(html).toMatch(/id="bbb222-tab"[^>]*aria-selected="true"/);
    expect(html).toMatch(/id="aaa111-tab"[^>]*aria-selected="false"/);
  });

  it('gates only "Bring everyone here" on the presenter', () => {
    expect(body({ isPresenter: false })).not.toContain('Bring everyone here');
    expect(body({ isPresenter: true })).toContain('Bring everyone here');
    // The lock item is NOT gated — `O(13, …)` has no `isP` term.
    expect(body({ isPresenter: false })).toContain('Lock Screen');
  });
});

describe('the two lock fields stay separate', () => {
  /*
    THE test that earns this file.

    The badge at the top of the tab is gated on `lockedScreenIDMTX`; the menu item's label is gated
    on `lockedScreenID`. Same feature, same update block, eight lines apart, two different fields.
    Anyone tidying this component will be tempted to collapse them into one prop, and the collapse
    is untestable by eye because upstream never sets either one.

    So both directions are asserted: each field drives its own half and NOT the other's.
  */
  const body = (props: Record<string, unknown>) =>
    render(StreamTabs, { props: { streams: STREAMS, ...props } }).body;

  it('lockedStreamId drives the badge and not the menu label', () => {
    /*
      Identified by the badge's own tooltip, NOT by `fa-lock`. The first version of this assertion
      looked for `fa-lock` and stayed green through the negative control below, because the menu
      item's icon is `fa-lock` too — it was asserting something that is true either way.
    */
    const html = body({ lockedStreamId: 'aaa111' });
    expect(html).toContain('tooltip="Unlock this screen?"');
    // The menu still offers "Lock Screen" — `lockedScreenID` was not set.
    expect(html).toContain('Lock Screen');
    expect(html).not.toContain('Unlock Screen');
  });

  it('lockedScreenId drives the menu label and not the badge', () => {
    const html = body({ lockedScreenId: 'aaa111' });
    expect(html).toContain('Unlock Screen');
    // ...and no badge, because the badge reads the OTHER field.
    expect(html).not.toContain('tooltip="Unlock this screen?"');
  });

  it('the forced badge is its own third field', () => {
    expect(body({ forcedStreamId: 'aaa111' })).toContain('fa-eye');
    expect(body({})).not.toContain('fa-eye');
  });
});
