import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import StreamTabs from './components/StreamTabs.svelte';
import type { MtxStream } from './mtx-streams';

/*
  ── `STB-04` — READ THIS BEFORE TRUSTING ANY ASSERTION BELOW ──────────────────────────────────────

  **This file does not run in a checkout that lacks `docs/source/`, and it is silently EXCLUDED
  rather than failing.** `gate/evidence-bound-tests.mjs` drops it into the count the vitest banner
  prints on every run ("42 evidence-bound test file(s) excluded"), so twelve `it` blocks whose names
  read as live guarantees — including the four standing refusals and the two-lock-fields test that
  the comment below calls the one that earns this file — assert nothing there.

  `stream-tabs-v4-contract.test.ts` is the file that RUNS. It re-derives every fact here from the
  pinned v4 bundle and adds eleven more, most of them const-number corrections this file's numbers
  predate. If you are looking for the current guarantee about this component, it is there.

  **Re-pointing this file is not one line, and the obvious second candidate does not work either.**
  Measured 2026-08-31, three bundle generations:

  | bundle | in this checkout | carries this file's literals |
  | --- | --- | --- |
  | `docs/source/main.d6d3c112b59b7d0d.js` | no | — (the file this reads) |
  | `docs/source-v3-2026-08-15/main.99a5781d1d7a7775.js` | yes | **no** — `ut(9,Go,` and `Go=t=>({active:t})` are both absent |
  | `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` | yes | **no** — five literals are the older minifier's |

  So v3 is a THIRD generation rather than the one this was written against, and a v4 re-point needs
  five literal rewrites plus two node numbers re-quoted from byte 1,926,570.

  What to do with this file is deliberately NOT decided here: `docs/source` is a real evidence root
  that 74 test files in this app read, gitignored by design and absent only from containers like the
  one this note was written in. It may well run where that root exists. Retiring or re-pointing a
  test whose evidence is present for its author and absent for everyone else is an owner's call, and
  taking it from inside a container that cannot see the evidence would be exactly the shape this
  repository refuses.

  `StreamTabs.svelte` is a transcription of `RSe`, and a transcription whose source is not asserted
  is a guess with a citation stapled to it.

  This file does two jobs. The first is the ordinary one: pin the reference's markup so the
  component cannot drift from it. The second matters more. FOUR of the controls in this tab bar do
  nothing in the shipped reference, and every one of them reads as working if you only look at the
  template. Each is pinned below against the bundle, because the failure mode is not that somebody
  deletes them — it is that somebody "finishes" one by inventing a protocol, and ships a lock button
  that locks nothing on a multi-tenant fintech room.
*/

/*
  THE BUNDLE READ THAT SAT HERE, AND THE SEVEN CASES THAT USED IT, ARE IN
  `stream-tabs-capture.test.ts`.

  It was a MODULE-SCOPE read of the gitignored `docs/source`, and `gate/evidence-bound-tests.mjs`
  excludes by FILE, so those seven took all FIFTEEN cases here out of every checkout without the
  dumps — this container, and CI. The eight that stayed RENDER `StreamTabs` and read its output,
  including the three that keep the two id fields apart: `lockedStreamId` drives the badge and not
  the menu label, `lockedScreenId` drives the menu label and not the badge, and the forced badge is
  its own third field. Those are exactly the confusions the capture block refuses to let anybody
  "finish" by inventing a protocol.
*/
const stream = (id: string, name: string): MtxStream => ({
  _id: id,
  sessionID: '652882112ad80b3e7c5132d5',
  producerID: `producer-${id}`,
  mediaValue: { name, serverName: 'media.example.com' }
});

const STREAMS = [stream('aaa111', 'Dana Vero'), stream('bbb222', 'Kit Marlow')];

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
