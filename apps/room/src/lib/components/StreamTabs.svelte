<script lang="ts">
  /**
   * The MediaMTX streams tab bar: `ul#streamsTabs`, one tab per live stream.
   *
   * Transcribed from `RSe` — `docs/source/components/app-presentationarea.full.js:543-588` — with
   * every attribute resolved through the component's own const table (`:3790` onward, index by
   * position from 0). The indices this template uses:
   *
   * | index | const                                                                  |
   * | ----- | ---------------------------------------------------------------------- |
   * | 118   | `['id','streamsTabs','role','tablist',1,'nav','nav-tabs','screens-tabs']` |
   * | 31    | `['role','presentation',1,'nav-item',3,'click']`                       |
   * | 74    | `['data-bs-toggle','tab','role','tab','aria-selected','true',1,'nav-link',3,'ngClass','id']` |
   * | 75    | `['placement','bottom','tooltip','This is the default screen…',1,'mr-2']` |
   * | 83    | as 76 (`'Unlock this screen?'`) plus `3,'click'`                        |
   * | 14    | `[1,'mx-1']`                                                           |
   * | 78    | `[1,'d-inline-block']`                                                 |
   * | 79    | `['id','dropdownMenuScreen','data-bs-toggle','dropdown','aria-expanded','false',1,'dropdown-toggle']` |
   * | 55    | `[1,'fas','fa-cog']`                                                   |
   * | 56    | `['aria-labelledby','dropdownMenuButton',1,'dropdown-menu']`            |
   * | 57    | `[3,'click']`                                                          |
   * | 58    | `['href','#',1,'dropdown-item']`                                       |
   * | 81/86 | `['title','Lock this screen?']` / `['title','Unlock this screen?']`     |
   * | 82/84/87 | `fa-eye` / `fa-lock` (aria-hidden) / `fa-unlock` (aria-hidden)       |
   *
   * The bar's `id` is `streamsTabs` but its CLASS is `screens-tabs` — the same class the screenshare
   * bar (const 70, `id="screenTabs"`) carries. The two bars are styled as one thing and identified
   * as two. Nothing here invents a `streams-tabs` class; there is no such class in the capture.
   *
   * ## Why this is not `ScreenTabs.svelte` with a flag
   *
   * `ScreenTabs` renders `img.presenter-img` and the label `{name}-{screenName}`, both
   * unconditionally. `RSe` renders neither: no avatar, and the label is `mediaValue.name` alone
   * (`:582`, `Ze(e.mediaValue.name)` — `ɵɵtextInterpolate`, so no surrounding spaces). Its dropdown
   * holds two items, not four. Folding the two together would mean four flags around every line.
   *
   * ## What is inert UPSTREAM — read this before "finishing" any of it
   *
   * Three of the four controls below do nothing in the shipped reference. This is recorded because
   * the obvious reading of the markup is that they work, and the obvious fix is to invent a protocol
   * for them. There is no evidence for any such protocol.
   *
   *  1. **The forced (eye) badge.** Gated on `forcedScreenMTXID`. That field appears exactly twice
   *     in the whole 2.8 MB bundle: the template read at byte 1926192 and `forcedScreenMTXID=""` in
   *     the constructor at byte 1952638. Nothing ever assigns it a stream id, so the badge can never
   *     render upstream.
   *  2. **The lock badge.** Gated on `globals.lockedScreenIDMTX`, which appears four times: the
   *     globals initialiser `lockedScreenIDMTX=""` at byte 977288, the template read at 1926252, and
   *     TWICE inside the one `selectStreamTabOfId` guard at 1960257, which tests the field for
   *     emptiness and then for equality. Also never assigned. (The count is four rather than the
   *     three a first pass reported, because a `grep -o` match window swallowed the guard's second
   *     occurrence — `stream-tabs-contract.test.ts` now counts it by splitting the file, so the
   *     number cannot rot.)
   *  3. **"Lock Screen".** `toggleLockScreenMTX(e) { console.error('TODO: toggleLockScreenMTX') }`
   *     — `app-presentationarea.full.js:3056-3058`. A stub, next to a working `toggleLockScreen`
   *     for screenshares directly above it at `:3050`.
   *  4. **"Bring everyone here"** is the one that LOOKS live and is not. It calls the same
   *     `bringFocusToScreen(e)` the screenshare menu uses (`:2727`), which sends
   *     `sendServerAdminCommand('focusOnScreen', {id: e})`. But every client's receiver scans only
   *     the screenshare list — `guiEventBus.subscribe("focusOnScreen", e => { const i =
   *     this.mediaService.screenSharingUsers; for (…) if (s._id == e) … })`, byte 1962380. It never
   *     looks in `mtxHandlerService.mtxStreams`, which is also why (1) has no writer. So a presenter
   *     clicking it on a STREAM tab broadcasts an id that no recipient can resolve.
   *
   * All four are rendered anyway, because a viewer of the reference sees them and this is a clone.
   * They are driven by props rather than hard-wired, so the branches are reachable, testable, and
   * ready if the protocol is ever captured — see `stream-tabs-contract.test.ts`, which pins each of
   * the four findings above so that a future reader cannot quietly "fix" one by guessing.
   */
  import type { MtxStream } from '../mtx-streams';

  type Props = {
    /*
      `readonly` because the list is owned by `room-mtx.svelte.ts` and reaches here through a
      getter. A tab bar has no business mutating the list it renders, and saying so in the type is
      what lets the owner hand out its own array instead of defensively copying it on every read.
    */
    streams: readonly MtxStream[];
    /** `selectedMTXStreamTab`. Upstream's initial value is `''`, not null; either compares false. */
    selectedStreamId?: string | null;
    /** `forcedScreenMTXID` — the eye badge. Upstream has no writer for it; see the header. */
    forcedStreamId?: string | null;
    /** `globals.lockedScreenIDMTX` — the lock BADGE. Upstream has no writer for it either. */
    lockedStreamId?: string | null;
    /**
     * `globals.lockedScreenID` — the SCREENSHARE lock field, and this is not a typo.
     *
     * The badge at the top of the tab reads `lockedScreenIDMTX` (`:580`) while the menu item's
     * label reads `lockedScreenID` (`:586`). Two different fields deciding two halves of one
     * feature, in the same update block, eight lines apart. It is reproduced rather than
     * reconciled: picking either field would be inventing a decision the reference did not make,
     * and the asymmetry is invisible in practice because neither is ever set to a stream id.
     */
    lockedScreenId?: string | null;
    /** `isP`, i.e. `globals.isPresenter`, read once in the constructor (`:2209`). */
    isPresenter?: boolean;
    onselect?: (streamId: string) => void;
    onbringeveryone?: (streamId: string) => void;
    ontogglelock?: (streamId: string) => void;
  };

  let {
    streams,
    selectedStreamId = null,
    forcedStreamId = null,
    lockedStreamId = null,
    lockedScreenId = null,
    isPresenter = false,
    onselect,
    onbringeveryone,
    ontogglelock
  }: Props = $props();

  /**
   * Const 75's `tooltip`, verbatim. Identical to the string on the screenshare bar's eye badge, so
   * it is duplicated here rather than shared: `ScreenTabs` reads it from ITS const (75 as well) and
   * a shared constant would imply the two are linked upstream. They are two literals in one table.
   */
  const FORCED_SCREEN_TOOLTIP =
    'This is the default screen users are taken to right now. If you are a presenter and talking ' +
    'whichever screen you select will be forced on others. You can also select a specific screen ' +
    'and click the gear icon on this tab to force everyone to watch that screen.';

  let openMenuId = $state<string | null>(null);

  function toggleMenu(streamId: string, event: MouseEvent) {
    // The gear is a sibling of the tab anchor here, but it is inside the anchor upstream and the
    // click still bubbles to the `li` that carries the tab-select listener. Stop it either way.
    event.stopPropagation();
    openMenuId = openMenuId === streamId ? null : streamId;
  }

  function runItem(event: MouseEvent, streamId: string, action?: (id: string) => void) {
    // Const 58 is `href="#"`, so without this the room navigates to `#` and scrolls to the top.
    event.preventDefault();
    event.stopPropagation();
    openMenuId = null;
    action?.(streamId);
  }
</script>

<!--
  `class="nav nav-tabs screens-tabs"` with `id="streamsTabs"` — const 118, not a copy of the
  screenshare bar's const 70. The two differ only in the `id`.
-->
<ul id="streamsTabs" role="tablist" class="nav nav-tabs screens-tabs">
  {#each streams as stream (stream._id)}
    <li role="presentation" class="nav-item">
      <!-- svelte-ignore a11y_missing_attribute -->
      <!--
        Three divergences from const 74, each one already taken on `ScreenTabs` for the same reason
        and taken again here so the two bars behave alike:

        `aria-selected` — the reference hardcodes `"true"` on every tab (it is a static attribute in
        const 74, not a binding), which tells a screen reader that every stream is selected at once.
        Emitted as a real boolean instead.

        `tabindex` + `onkeydown` — the reference emits neither, and const 74 has no `href` either, so
        upstream these tabs cannot be reached by keyboard at all. The roving tabindex is what makes
        the stream switcher operable without a mouse.

        `data-bs-target` — absent upstream, absent here. `data-bs-toggle` plus `aria-controls` is
        what the reference uses and nothing is lost.
      -->
      <a
        id="{stream._id}-tab"
        class="nav-link"
        class:active={stream._id === selectedStreamId}
        role="tab"
        tabindex={stream._id === selectedStreamId ? 0 : -1}
        aria-controls={stream._id}
        aria-selected={stream._id === selectedStreamId}
        data-bs-toggle="tab"
        onclick={() => onselect?.(stream._id)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onselect?.(stream._id);
        }}
      >
        {#if stream._id === forcedStreamId}
          <span
            {...{ placement: 'bottom', tooltip: FORCED_SCREEN_TOOLTIP } as Record<string, string>}
            class="mr-2"
          >
            <i class="fas fa-eye"></i>
          </span>
        {/if}
        <!--
          Not keyboard-reachable, deliberately. Const 83 puts this badge's click INSIDE the tab
          anchor, and an independently focusable control nested in a link is invalid content — the
          same class of problem as the dropdown below, but without a placement that fixes it, since
          hoisting the badge out of the anchor would move it out of the tab's hit area.

          The gap is covered rather than ignored: the identical action is on the dropdown item a few
          lines down, which is a real anchor with a real `href` and is fully operable. A pointer
          user gets the shortcut; a keyboard user gets the menu.

          No `svelte-ignore` sits here, and that is not an oversight. The compiler cannot prove this
          span is static because the spread below may carry a `role`, so it emits no a11y warning to
          suppress — the autofixer reports any ignore placed here as unwarned. See the gear's span
          further down, which takes no spread and therefore does need one.
        -->
        {#if stream._id === lockedStreamId}
          <span
            {...{ placement: 'bottom', tooltip: 'Unlock this screen?' } as Record<string, string>}
            class="mr-2"
            onclick={(event) => {
              event.stopPropagation();
              ontogglelock?.(stream._id);
            }}
          >
            <i aria-hidden="true" class="fas fa-lock"></i>
          </span>
        {/if}
        <span class="mx-1">{stream.mediaValue.name}</span>
      </a>
      <!--
        The capture nests this `div.d-inline-block` INSIDE the tab anchor (`:551` opens `a` at node
        1, `:556` opens the div at node 6, and the anchor does not close until `:568`), which puts
        `a.dropdown-item` inside `a.nav-link`. Angular can build that because it assembles the DOM
        through JS APIs, which never run the parser's repair step. Server-rendered markup does run
        it: the parser hoists the inner anchor out, the hydrated tree stops matching the served HTML,
        and Svelte's structural assumptions break with it.

        So the gear becomes a sibling of the anchor within the same `li`, exactly as on `ScreenTabs`,
        and the `li` is made a flex row below to restore the captured single-line layout.
      -->
      <div class="d-inline-block">
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <!--
          `id="dropdownMenuScreen"` is reproduced from const 79 even though it repeats on every tab
          AND collides with the screenshare bar's gears, which carry the same const. Both bars can be
          in the DOM at once, so the document can hold several elements with this id — that is what
          the reference does, and a duplicate id costs a reader nothing here because the menu is
          associated by `aria-labelledby`, not by this one.
        -->
        <span
          id="dropdownMenuScreen"
          data-bs-toggle="dropdown"
          aria-expanded={openMenuId === stream._id}
          class="dropdown-toggle"
          class:show={openMenuId === stream._id}
          onclick={(event) => toggleMenu(stream._id, event)}
        >
          <i class="fas fa-cog"></i>
        </span>
        <!--
          `aria-labelledby="dropdownMenuButton"` points at an id that does not exist on this tab —
          the toggle above is `dropdownMenuScreen`. That is const 56 as captured, and `ScreenTabs`
          reproduces the same dangling reference from the same const.
        -->
        <ul
          aria-labelledby="dropdownMenuButton"
          class="dropdown-menu"
          class:show={openMenuId === stream._id}
        >
          {#if isPresenter}
            <li>
              <a
                href="#{stream._id}"
                class="dropdown-item"
                onclick={(event) => runItem(event, stream._id, onbringeveryone)}
              >
                <i class="fas fa-eye"></i> Bring everyone here
              </a>
            </li>
          {/if}
          <li>
            <a
              href="#{stream._id}"
              class="dropdown-item"
              onclick={(event) => runItem(event, stream._id, ontogglelock)}
            >
              {#if stream._id === lockedScreenId}
                <span title="Unlock this screen?">
                  <i aria-hidden="true" class="fas fa-unlock"></i> Unlock Screen
                </span>
              {:else}
                <span title="Lock this screen?">
                  <i aria-hidden="true" class="fas fa-lock"></i> Lock Screen
                </span>
              {/if}
            </a>
          </li>
        </ul>
      </div>
    </li>
  {/each}
</ul>

<style>
  /*
   * The gear sits BESIDE the stream name, not under it.
   *
   * Same unpaid cost as on `ScreenTabs`, for the same reason. The capture puts `div.d-inline-block`
   * inside `a.nav-link`, where it is inline content and therefore on the same line as the name.
   * That nesting is not expressible in parsed HTML, so the gear is rendered as a sibling — and
   * Bootstrap's `.nav-link` is `display: block`, which drops any following sibling onto the next
   * line. Making the tab a flex row restores the captured layout without restoring the unparseable
   * nesting.
   *
   * Scoped to the tab `li` only. The dropdown's own `li` elements must stay block, or the menu
   * items would run across in a row.
   */
  li.nav-item {
    display: flex;
    align-items: center;
  }
</style>
