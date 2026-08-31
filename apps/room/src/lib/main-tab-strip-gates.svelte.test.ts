// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import MainTabStrip from './components/MainTabStrip.svelte';
import { RoomMenus } from './room/menus.svelte.js';
import type { MainTab } from './types.js';

/**
 * `MTS-01`, `MTS-05`, `MTS-06` and `MTS-07` — the tab strip's COG and its KEYBOARD.
 *
 * `main-tab-strip-contract.test.ts` next door renders the strip on the SERVER and asks which tabs
 * exist and which carry `hidden`; that is the entitlement question and it is answered by markup.
 * These four are answered only by a MOUNT — a focus test and three click tests — so this file is a
 * `.svelte.test.ts` in jsdom, the same instrument `room-branding-contract.svelte.test.ts` uses and
 * for the same reason: the assertions drive state, so the file has to be compiled as a rune module.
 *
 * ## MTS-01 — the files cog is the presenter's, and every member could see it
 *
 * ```js
 * H(35, ZCe, 8, 0, "div"),  …  O(35, o.isP ? 35 : -1)          // byte 2,017,076
 * function ZCe(t,n){ const e=Y(); d(0,"div")(1,"span",66), T(2,"i",54), u(),
 *   d(3,"ul",67)(4,"li",56), x("click",function(){return D(e),E(g().newFile())}),
 *   d(5,"a",57), T(6,"i",58), v(7," Upload File"), u()()()() }  // byte 1,918,232
 * ```
 *
 * `-1` is `ɵɵconditional`'s "instantiate nothing", so upstream a member is handed no element at
 * all. This strip drew the cog for everybody, and the menu it opens is the room's file uploader.
 *
 * ## MTS-05 — the keyboard half of this strip was unreachable
 *
 * Every tab anchor has carried an `onkeydown` since the strip was written, and every one of them
 * was dead code. `tabindex` read `{mainTab === … ? undefined : -1}`: `undefined` omits the
 * attribute, and an `<a>` with no `href` and no non-negative `tabindex` is not focusable. So the
 * SELECTED tab could not take focus and the six others were explicitly removed from the tab order.
 *
 * The reference has no `tabindex` and no keyboard handling at all — the whole affordance is this
 * room's — so the failure was not a mismatch with the capture. It was shipping half a control.
 *
 * ## MTS-06 — `aria-selected` is DERIVED here, and the capture hardcodes it
 *
 * Eight anchors, eight static values, read out of `app-presentationarea`'s consts table (the `[`
 * after `consts:` is at byte 1,994,264):
 *
 * | const | tab | `aria-selected` |
 * | --- | --- | --- |
 * | 5 | `screens-tab` | `"true"` |
 * | 9 | `streams-tab` | `"true"` |
 * | 11 | `notes-tab` | `"false"` |
 * | 17 | files (no id) | `"false"` |
 * | 59 | `recordings-tab` | `"false"` |
 * | 61 | `videoplayer-tab` | `"true"` |
 * | 63 | `swingAlerts-tab` | `"true"` |
 * | 65 | `dayTradeAlerts-tab` | `"true"` |
 *
 * Nothing in the update block (2,016,417 onward) ever writes the attribute — the only per-tab
 * binding is `ngClass`, `ct(46, mo, …)` with `mo = t => ({active: t})` at byte 1,916,345. So a room
 * with both alert entitlements announces FIVE simultaneously selected tabs and never announces the
 * one actually showing. Recorded as a divergence rather than matched: reproducing it would
 * reproduce a defect, and this is one of the few places the strip departs from the bytes on
 * purpose.
 *
 * ## MTS-07 — one interaction, two implementations, and they disagreed
 *
 * Upstream neither cog has a click handler: `data-bs-toggle="dropdown"` hands the open/close to
 * Bootstrap, and both cogs sit inside an `<li>` whose own `x("click", …)` calls `onMainTabChange`.
 * One implementation, so the two behave identically by construction. This room has no Bootstrap
 * dropdown behaviour, so each cog was hand-wired — and the two hand-wirings had drifted: the notes
 * cog called `stopPropagation()` and never selected its tab, while the files cog re-set `mainTab`
 * by hand and also closed the notes menu. `TabGearMenu.svelte` is the one implementation now.
 *
 * ## What is NOT here, and what would unblock it
 *
 * **The notes cog's gate.** `O(23, o.isP || o.appService.globals.user.canEditNotes ? 23 : -1)`,
 * byte 2,016,713 — the same shape as the files cog's, with the viewer's own authoring capability
 * as the second term. `MainTabStrip` receives no prop carrying it, and inventing a default is worse
 * than leaving it: `false` would take the New Note cog away from a member who legitimately has it,
 * `true` would be no gate at all. The one-line repair is at the call site —
 * `apps/room/src/lib/components/PresentationArea.svelte:507`, adding `canEditNotes={data.canEditNotes === true}`
 * to the `<MainTabStrip …/>` props — and then a `{#if isPresenter || canEditNotes}` here, exactly
 * as the files cog now has.
 *
 * **The Recordings tab.** `H(24, YCe, 7, 3, "li", 16)` under
 * `O(24, o.archivesAvailableTo() && o.appService.globals.sessData.recsInRoom ? 24 : -1)` at byte
 * 2,016,775; the `<li>` itself is `YCe` at 1,916,945 — `id="recordings-tab"`,
 * `data-bs-target="#recordings"`, `fas fa-file-video` (const 60), label `Recordings`. It cannot be
 * built from this component: `MainTab` in `#lib/types.ts` has no `'recordings'` member and
 * `PresentationArea` has no `#recordings` pane (const 25 upstream), so a tab added here would
 * select a value nothing renders. `RoomGates.archivesAvailable` already carries the first half of
 * the gate.
 *
 * **The second half is `sessData.recsInRoom`, and this paragraph used to say it "appears nowhere in
 * this repository — grep returns zero hits across `src/`". Both halves of that were wrong, corrected
 * 2026-08-31.** It is a DECLARED controller setting — `room-settings-schema.ts:247`, typed at `:702`,
 * defaulting to `true` in `room-settings-profile.ts:78` — and even inside `apps/room/src` it has a
 * hit, in `setting-coverage-contract.test.ts`'s `REFERENCE_READS_AND_WE_DO_NOT`.
 *
 * The CONCLUSION is unchanged and is now stated from the right fact: `recsInRoom` is not in
 * `ROOM_VISIBLE_SETTINGS` (`apps/controller/src/lib/room-config.ts` carries `hideRecs` at :214 and
 * not this one), so it never crosses to the room and there is no value here to gate on. That is a
 * missing WIRE, not a missing setting, and the difference decides what building this costs.
 *
 * Recorded rather than quietly edited because it is the failure `CLAUDE.md`'s own checklist names:
 * a comment claiming something is absent, written from a grep, surviving long enough that the next
 * reader plans around it.
 *
 * ## `MTS-03`'s REAL blocker, found 2026-08-31 by decoding the pane rather than the tab
 *
 * Everything above is about the TAB, and the row it belongs to lists three structural steps to
 * unblock it: widen `MainTab`, thread `recsInRoom`, add a `#recordings` pane. All three are real
 * and **all three together would still produce a tab that cannot work**, because of what the pane
 * IS:
 *
 * ```js
 * function GSe(t,n){ if(1&t&&(d(0,"div",25), T(1,"iframe",140), …)),
 *   2&t){ … z("src", Ct(2,2, e.getRecordingsUrl(), "resourceUrl"), Oa) } }   // byte 1,930,394
 *
 * getRecordingsUrl(){ return `${apiROOT}/sessions/v2/archives/recordings/`
 *                            + `${sessionID}/${sesionToken}` }               // byte 1,959,845
 * ```
 *
 * **The pane is a single `<iframe>` onto the archive service** — and that URL is character for
 * character the one `G01`, `RS-06` and `presAreaTabs-recordings` are already BLOCKED on, all three
 * quoting `launchRecordings()`'s `${apiROOT}/sessions/v2/archives/recordings/${sessionID}/${token}`.
 *
 * So `MTS-03` is a FOURTH row on one blocker, not a structural gap. Doing the three steps first
 * would add a type member, a settings wire, a tab and a pane, none of which can function — and the
 * pane would iframe a 404 **with a session token in its URL**, which is the same objection `G01`
 * records for opening that page in a tab: *"worse than an inert item."*
 *
 * The assertion below pins the two offsets and the shared endpoint, so that if an archive service
 * ever lands, the four rows are found together rather than one at a time.
 */

type Stub = Record<string, unknown>;

const noteLinks = (): Stub => ({
  mountNewNoteLink: () => undefined,
  mountUploadFileLink: () => undefined
});

const tradeAlerts = (enabled: boolean): Stub => ({ enabled });

/**
 * The strip alone, mounted, with a REAL `RoomMenus` so the cogs' effect on it can be read.
 *
 * A real one and not a stub, deliberately: what MTS-07 asserts is which flags a cog moves, and a
 * stub that records calls would let the two cogs go on disagreeing about which calls to make while
 * the test recorded both faithfully.
 */
function mountStrip(over: { isPresenter?: boolean; mainTab?: MainTab } = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const menus = new RoomMenus();
  const state = $state({ mainTab: over.mainTab ?? 'screens' });
  const component = mount(MainTabStrip, {
    target: host,
    props: {
      get mainTab() {
        return state.mainTab;
      },
      set mainTab(next: MainTab) {
        state.mainTab = next;
      },
      viewerOnlyMode: false,
      isPresenter: over.isPresenter ?? false,
      hideStreams: false,
      hideNotes: false,
      menus,
      notes: noteLinks(),
      broadcasts: { hideVideoPlayer: false },
      files: { filesHidden: false },
      swingAlerts: tradeAlerts(true),
      dayTradeAlerts: tradeAlerts(true)
    } as never
  });
  flushSync();
  return { host, menus, component, state };
}

const mounted: { host: HTMLElement; component: Record<string, unknown> }[] = [];

const strip = (over: { isPresenter?: boolean; mainTab?: MainTab } = {}) => {
  const result = mountStrip(over);
  mounted.push({ host: result.host, component: result.component as Record<string, unknown> });
  return result;
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    void unmount(entry.component);
    entry.host.remove();
  }
});

describe('MTS-01 — the files cog is instantiated only for a presenter', () => {
  it('draws it for a presenter', () => {
    const { host } = strip({ isPresenter: true });
    expect(host.querySelector('#dropdownMenuFiles')).not.toBeNull();
  });

  it('draws NOTHING for a member — not a hidden element, no element', () => {
    const { host } = strip({ isPresenter: false });
    /*
      Both halves. `-1` instantiates nothing, so the assertion is absence of the ELEMENT rather than
      presence of `hidden` — the distinction `main-tab-strip-contract.test.ts` exists to defend, and
      the one a source-text grep cannot make.
    */
    expect(host.querySelector('#dropdownMenuFiles')).toBeNull();
    expect(host.innerHTML).not.toContain('dropdownMenuFiles');
    // And the tab it sits on is still there — this gates the cog, not the Files tab.
    expect(host.querySelector('[data-bs-target="#files"]')).not.toBeNull();
  });
});

describe('MTS-05 — the selected tab can hold focus, so its keyboard handler can fire', () => {
  it('gives the selected tab tabindex 0 and every other tab -1', () => {
    const { host } = strip({ isPresenter: true, mainTab: 'notes' });
    const selected = host.querySelector('#notes-tab');
    const other = host.querySelector('#screens-tab');
    expect(selected?.getAttribute('tabindex'), 'the roving 0').toBe('0');
    expect(other?.getAttribute('tabindex'), 'and -1 on the rest').toBe('-1');
  });

  it('actually takes focus, which `undefined` never did', () => {
    /*
      The assertion that would have caught the original bug, and the reason it is a mount: an `<a>`
      with no href and no tabindex is a perfectly ordinary element to every source-text instrument
      and is simply not focusable in a browser.
    */
    const { host } = strip({ isPresenter: true, mainTab: 'screens' });
    const selected = host.querySelector<HTMLElement>('#screens-tab');
    expect(selected, 'the selected tab must exist').not.toBeNull();
    selected!.focus();
    expect(document.activeElement, 'the selected tab must be focusable').toBe(selected);
  });

  it('and the key it listens for then selects the tab', () => {
    const { host, state } = strip({ isPresenter: true, mainTab: 'screens' });
    const streams = host.querySelector<HTMLElement>('#streams-tab');
    streams!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    flushSync();
    expect(state.mainTab).toBe('streams');
  });
});

describe('MTS-06 — aria-selected follows the selection instead of being hardcoded', () => {
  it('marks exactly one tab selected, and it is the one showing', () => {
    /*
      The capture would fail this: consts 5, 9, 61, 63 and 65 all carry a literal `"true"`, so a
      room with both alert entitlements would answer FIVE here. See the table above.
    */
    const { host } = strip({ isPresenter: true, mainTab: 'swingAlerts' });
    const selected = [...host.querySelectorAll('[role="tab"]')].filter(
      (tab) => tab.getAttribute('aria-selected') === 'true'
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]?.id).toBe('swingAlerts-tab');
  });
});

describe('MTS-07 — the two cogs do the same three things', () => {
  it('the notes cog opens its menu, selects the Notes tab and closes the files menu', () => {
    const { host, menus, state } = strip({ isPresenter: true, mainTab: 'screens' });
    menus.set('files', true);

    host.querySelector<HTMLElement>('#dropdownMenuNotes')!.click();
    flushSync();

    expect(menus.notes, 'its own menu opens').toBe(true);
    expect(state.mainTab, 'and it selects the tab it sits on').toBe('notes');
    expect(menus.files, 'and the sibling menu closes').toBe(false);
  });

  it('the files cog does the same three things for its own tab', () => {
    const { host, menus, state } = strip({ isPresenter: true, mainTab: 'screens' });
    menus.set('notes', true);

    host.querySelector<HTMLElement>('#dropdownMenuFiles')!.click();
    flushSync();

    expect(menus.files).toBe(true);
    expect(state.mainTab).toBe('files');
    expect(menus.notes).toBe(false);
  });

  it('and a second click on either closes it again', () => {
    const { host, menus } = strip({ isPresenter: true });
    const cog = host.querySelector<HTMLElement>('#dropdownMenuNotes')!;
    cog.click();
    flushSync();
    expect(menus.notes).toBe(true);
    cog.click();
    flushSync();
    expect(menus.notes, 'a cog is a toggle, not an opener').toBe(false);
  });
});

describe('MTS-03 — the Recordings pane is an iframe onto the archive service', () => {
  /*
    The row lists three structural steps to unblock this tab. They are real and they are not the
    blocker: the pane those steps would create is one `<iframe>` whose `src` is the archive
    endpoint three other rows are already blocked on.

    Pinned here rather than left in prose because the whole value of the finding is that FOUR rows
    share ONE blocker — and a shared blocker that is only written down in four separate places is
    one that gets lifted three times.
  */
  /*
    Paths are relative to the vitest cwd (`apps/room`), not to `import.meta.url`.

    A `.svelte.test.ts` runs through the Svelte plugin, where `import.meta.url` is not a `file:`
    URL — `fileURLToPath` throws `The URL must be of scheme file` on it, which is what the first
    version of this block did. `trade-alert-pane-contract.test.ts` already reads its sources this
    way for the same reason.
  */
  const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');

  const at = (offset: number, text: string) => BUNDLE.slice(offset, offset + text.length);

  it('the pane is a single iframe bound to getRecordingsUrl()', () => {
    const pane = 'function GSe(t,n){if(1&t&&(d(0,"div",25),T(1,"iframe",140)';
    expect(at(1_930_394, pane), 'GSe moved').toBe(pane);
    /* One iframe and nothing else — the pane has no markup of its own to build. */
    expect(BUNDLE.slice(1_930_394, 1_930_700)).toContain('e.getRecordingsUrl()');
  });

  it('and that URL is the SAME one G01, RS-06 and presAreaTabs-recordings are blocked on', () => {
    const url =
      'getRecordingsUrl(){return`${this.appService.globals.apiROOT}/sessions/v2/archives/recordings/${this.appService.globals.sessionID}/${this.appService.globals.sesionToken}`}';
    expect(at(1_959_845, url), 'getRecordingsUrl moved').toBe(url);

    /*
      The register names that endpoint on every row that is blocked on it. Counting them is what
      turns "four rows, one blocker" from a sentence into a fact that fails when it stops being
      true — if a fifth row acquires the endpoint, or one of the four is closed without the others
      being re-read, this number moves.

      SIX mentions across FOUR rows: `G01` and `RS-06` name it once each in prose, `MTS-03` names it
      twice — once as `getRecordingsUrl` and once quoting `launchRecordings`, which is how it shows
      the two are the same string — and `presAreaTabs-recordings` carries it once more. The COUNT is
      the assertion rather than the row names, because a row can be renamed and a string cannot be
      miscounted.
    */
    const register = readFileSync('../../docs/decoded/room-surface-audit-2026-08-30.md', 'utf8');
    expect(register.split('sessions/v2/archives/recordings').length - 1).toBe(6);
  });

  it('and NOTHING here is built toward it, which is what makes waiting correct', () => {
    /*
      The negative half. Adding the type member, the settings wire, the tab and the pane before the
      service exists is scaffolding — four things that compile and cannot work — and the pane would
      iframe a 404 carrying a session token, which is the objection `G01` already records.
    */
    const types = readFileSync('src/lib/types.ts', 'utf8');
    expect(types, "MainTab gained 'recordings' — is the archive service live?").not.toContain(
      "| 'recordings'"
    );
  });
});
