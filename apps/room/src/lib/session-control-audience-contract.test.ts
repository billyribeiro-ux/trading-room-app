import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * SC-17 and SC-14 — who the session-control modal is for, and what each of them gets.
 *
 * ## Two bodies upstream, one here
 *
 * ```js
 * O(8, isPresenter ? 8 : -1)                                        // MDe, the presenter body
 * O(9, !isPresenter && user.hasMic ? 9 : -1)                        // LDe, the device form
 *                                                                   // byte 2,184,295
 * ```
 *
 * This component had ONE body — the presenter's — with no role condition anywhere in it, and a
 * non-presenter never saw it only because both entry points sat inside `RoomNavbar`'s
 * `{#if isPresenter}`. That is the shape this repository refuses: authority read off a navigation
 * gate rather than stated where the thing is drawn. Every button in that body is server-authorised,
 * so nothing was exploitable — and the navbar edit that would have exposed it is the one SC-14
 * makes, which is the whole argument for doing them together.
 *
 * ## The gate is `hasMic`, and it is NOT `isLimitedPresenter`
 *
 * ```js
 * O(29, !isPresenter && !user.hasMic || isLimitedPresenter ? -1 : 29)   // byte 2,489,576
 * function f4e(t,n){ … v(4,"Session Control") … }
 * ```
 *
 * The navbar's Session Control item is the ONE entry in the presenter block whose gate is wider
 * than `isPresenter`, and it excludes a limited presenter outright. The reference is explicit about
 * why the two are different things: `giveMicScreen` assigns
 * `globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`, so
 * somebody handed mic and screen at runtime IS a presenter — and upstream still withholds this from
 * them. A temporary grant is not room administration. `hasMic` is the durable membership
 * permission, one of the five `permissions_json` keys.
 */

const read = (path: string) => readFileSync(path, 'utf8');

const MODAL_PATH = 'src/lib/components/ModalHost.svelte';
const NAVBAR_PATH = 'src/lib/components/RoomNavbar.svelte';

/** Source with comments stripped: prose quoting a gate must never satisfy an assertion about it. */
const modalCode = () => codeOf(MODAL_PATH, read(MODAL_PATH));
const navbarCode = () => codeOf(NAVBAR_PATH, read(NAVBAR_PATH));

/** The text from `opening` to `closing`, with both positions asserted — never a bare `indexOf`. */
const between = (source: string, opening: string, closing: string) => {
  const from = source.indexOf(opening);
  expect(from, `\`${opening}\` is not in the source`).toBeGreaterThan(-1);
  const to = source.indexOf(closing, from + opening.length);
  expect(to, `\`${opening}\` is never followed by \`${closing}\``).toBeGreaterThan(from);
  return source.slice(from, to);
};

/**
 * The Svelte block opened at `opening`, up to its MATCHING `{/…}`.
 *
 * ## Two negative controls stayed green without this, and they were the two that mattered
 *
 * The first draft asserted containment by POSITION — `body.indexOf('lock-session') > gateIndex` —
 * and that is true of every marker after the gate's opening whatever the gate encloses. Moving the
 * `{/if}` up so it closed straight after the tab strip left every assertion passing while Hard
 * Reset and Lock Session sat outside the gate: the precise defect the row exists to close.
 *
 * The second measured the broadcast block by slicing forward to the next gate, which cannot see
 * the broadcast gate itself being widened — the other way this change could go wrong.
 *
 * **This is the third time in this repository a control has found the test rather than the code,
 * and all three were the same mistake**: an assertion about NESTING written as an assertion about
 * ORDER. `card-class-lists-contract` (RM-22) and `av-device-pane-contract` (SC-09) both ended up
 * counting depth for the same reason. Depth is what differs, so depth is what is measured.
 */
const blockAt = (source: string, opening: string) => {
  const from = source.indexOf(opening);
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

describe('SC-17 — the modal body states its own audience', () => {
  it('gates the presenter body on isPresenter, inside the component', () => {
    const body = between(
      modalCode(),
      '<app-session-control-modal>',
      '</app-session-control-modal>'
    );
    expect(body).toContain('{#if isPresenter}');
  });

  it('puts the tab strip and every tab INSIDE that gate', () => {
    /*
      The assertion that matters, and the one a "does it contain isPresenter" check would miss: Hard
      Reset, Lock Session and Close Session are the controls at stake, so the gate has to open before
      the tab strip and close after the last panel rather than wrapping one tab.
    */
    const body = between(
      modalCode(),
      '<app-session-control-modal>',
      '</app-session-control-modal>'
    );
    const gated = blockAt(body, '{#if isPresenter}');
    /*
      PANEL markers, not tab names — and that distinction is the second thing a control found here.
      Every tab id also appears in the `{#each}` array that draws the tab STRIP, so a gate closing
      straight after `</ul>` still contained all of them and the depth walk passed. What only the
      panels carry is their own `id="…"` attribute and their content.
    */
    for (const marker of [
      'id="reset-session"',
      'id="lock-session"',
      'id="webinar-tools"',
      '<SessionHistoryPane',
      'id="streaming-selection"',
      '<CloseSessionPane',
      '<AvDevicePane'
    ]) {
      expect(gated, `${marker} must sit inside the gate`).toContain(marker);
    }
  });

  it('leaves Done outside both arms, because a body that draws nothing must still close', () => {
    const body = between(
      modalCode(),
      '<app-session-control-modal>',
      '</app-session-control-modal>'
    );
    const closed = body.indexOf('{/if}');
    expect(closed, 'the gate is never closed').toBeGreaterThan(-1);
    expect(body.indexOf('{#snippet footer()}')).toBeGreaterThan(closed);
  });
});

describe('SC-14 — the member with a microphone gets the device picker', () => {
  it('renders the device pane on the else arm', () => {
    const body = between(
      modalCode(),
      '<app-session-control-modal>',
      '</app-session-control-modal>'
    );
    const arm = between(body, '{:else if hasMic}', '{/if}');
    expect(arm).toContain('<AvDevicePane {capture} {onPreferenceChange} />');
  });

  it('reads the DURABLE permission and not the runtime elevation', () => {
    /*
      `hasMic` is one of the five `permissions_json` keys. Passing `media.limitedPresenter` here
      instead would answer the modal for somebody the reference deliberately excludes, and would
      make the arm unreachable for the member it is for.
    */
    expect(read('src/lib/components/RoomOverlays.svelte')).toContain(
      'hasMic={data.user.hasMic === true}'
    );
    expect(read('src/routes/+page.svelte')).toContain('hasMic={data.user.hasMic === true}');
  });
});

describe('SC-14 — the navbar entry that makes the arm reachable', () => {
  it('gives Session Control its own gate, wider than the presenter block', () => {
    expect(navbarCode()).toContain('{#if (isPresenter || hasMic) && !media.limitedPresenter}');
  });

  it('excludes a LIMITED presenter, which plain isPresenter would not', () => {
    /*
      The term that is easiest to drop and hardest to notice: a limited presenter satisfies
      `isPresenter`, so without `!media.limitedPresenter` this reads as "everyone who could already
      see it, plus mic-holders" and quietly includes a group the reference withholds it from.
    */
    const gated = blockAt(navbarCode(), '{#if (isPresenter || hasMic)');
    expect(gated).toContain('!media.limitedPresenter');
    /* …and it is the Session Control item this gate encloses, not something else. */
    expect(gated).toContain('#session-control-modal');
  });

  it('leaves the three broadcast controls on plain isPresenter', () => {
    /*
      A negative control on the widening: recording, microphone and screenshare drive what the room
      SENDS to everybody and must not travel with this. If the Session Control item had simply been
      left in the presenter block with the block's own gate widened, this would fail.
    */
    const broadcast = blockAt(navbarCode(), '{#if isPresenter}');
    for (const control of ['ontogglemicrophone', 'onpromptforscreenname', 'ScreenShareMenu']) {
      expect(broadcast, `${control} must be in the presenter block`).toContain(control);
    }
    /* And Session Control is NOT in it — it is the one item that moved out. */
    expect(broadcast).not.toContain('#session-control-modal');
    expect(broadcast).not.toContain('hasMic');
  });
});
