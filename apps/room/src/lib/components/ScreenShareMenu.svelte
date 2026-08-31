<script lang="ts">
  import type { Snippet } from 'svelte';
  import { activateOnKey, type ScreenShareMenuProps } from '#lib/screen-share-menu.js';

  /**
   * The navbar's Start/Stop Screen Sharing dropdown — the whole control, and everything in it.
   *
   * ## Why it is a component
   *
   * It was 145 lines inside `RoomNavbar.svelte` and G05, G06 and G07 added three entries to it in
   * one pass, which put that file 186 lines over its ceiling. The seam is real rather than
   * convenient: this is a self-contained control with its own open state, its own six entries and
   * its own gates, and every prop below is an INPUT to it — none is a value it reaches back through
   * the navbar to read. That is the test the message renderers' entries in `source-size-contract`
   * record for the split they refused.
   *
   * ## What is in it, and where each came from
   *
   * | entry | reference | gate |
   * | --- | --- | --- |
   * | Share Screen | `d(6,"li",185)` | always |
   * | OBS / XSPLIT / Share Virtual Cam | `d(10,"li",186)` | always |
   * | OBS / RTMP / Stream / Restream | `a4e`, byte 2,479,414 | `sessData.useMediaMTX` |
   * | Stop Sharing All Screens | `l4e`, byte 2,479,632 | `isScreenSharing` |
   * | Reopen Screenshare Preview | `c4e`, byte 2,479,832 | `isScreenSharing` |
   * | Stop Sharing {screenName} | `d4e`, byte 2,480,013 | one per local screen |
   *
   * **Those four byte offsets were each 47 to 100 too high until 2026-08-31** (2,479,514 /
   * 2,479,700 / 2,479,924 / 2,480,060), and every one of them landed INSIDE the function it named
   * rather than outside it — which is why nobody caught them: opening the offset shows plausible
   * code from the right template. `indexOf('function a4e(')` is what settles it, and the numbers
   * above are that. The const indices in the same table were re-checked the same way and were all
   * correct: 115, 158, 163, 185, 186, 187 and 188 are exactly what a by-value bracket-walk of
   * `app-room`'s consts table (`consts:[` at byte 2,533,190, 229 entries) hands back.
   *
   * The DIVIDERS are not decoration and are placed where the capture places them: `a4e` opens with
   * one, `l4e` opens with two, and `c4e` closes with one. Read as a group they are what separates
   * "start something" from "stop something" in a menu that does both.
   *
   * ## The four attributes on each row that the capture does not have
   *
   * `role`, `tabindex`, `aria-label` and the Enter/Space handler. Every entry upstream is a click
   * on an `<li>` wrapping an `aria-hidden` anchor with no `href`, so nothing in this control was
   * focusable and nothing in it had a name. The measurement, the precedent and the reason
   * `aria-hidden` stays are in `#lib/screen-share-menu.js`, beside the props; SSM-2 (why all six
   * clicks sit on the `<li>` where the capture splits them three and three) and SSM-3 (that none of
   * the six is inert upstream, unlike four of the stream tab's) are there too.
   */
  let {
    screenSharing,
    menuOpen,
    shareScreenText,
    virtualCamText,
    stopSharingAllText,
    streamingTabAvailable,
    localScreens,
    ontoggle,
    onpromptforscreenname,
    onstopscreensharing,
    onopenstreamingtab,
    onreopenpreview,
    onstoplocalscreen
  }: ScreenShareMenuProps = $props();
</script>

<!--
  One row of the menu, six times. Why the label keeps the capture's spaces while `aria-label` trims
  them, and why the badge is an optional render rather than a conditional block, are in
  `screen-share-menu-contract.test.ts` — which is also what fails if a seventh row is written
  longhand beside this snippet instead of through it.
-->
{#snippet entry(label: string, title: string | undefined, run: () => void, badge?: Snippet)}
  <li
    {title}
    role="menuitem"
    tabindex="0"
    aria-label={label.trim()}
    onclick={run}
    onkeydown={(event) => activateOnKey(event, run)}
  >
    <!-- svelte-ignore a11y_missing_attribute -->
    <a aria-hidden="true">{label}{@render badge?.()}</a>
  </li>
{/snippet}

{#snippet newBadge()}<span class="badge text-bg-danger ms-1">New</span>{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<li
  title="Start/Stop Screen Sharing"
  class="screen-sharing nav-item dropdown"
  onclick={(event) => event.stopPropagation()}
>
  <a
    id="dropdownScreenSharing"
    role="button"
    tabindex="0"
    data-bs-toggle="dropdown"
    aria-haspopup="true"
    aria-expanded={menuOpen}
    class={[
      'nav-link dropdown-toggle d-flex align-items-center',
      { muted: !screenSharing, 'text-white': screenSharing }
    ]}
    onclick={() => ontoggle()}
    onkeydown={(event) => activateOnKey(event, ontoggle)}
  >
    <i class="fas fa-2x fa-desktop"></i>
    <span class="ml-2 mainNavItem">Start/Stop Screen Sharing</span>
  </a>
  <ul
    role="menu"
    aria-labelledby="dropdownScreenSharing"
    data-bs-popper={menuOpen ? 'static' : undefined}
    class={['screen-options-start-screen dropdown-menu dropdown-menu-end', { show: menuOpen }]}
    style={menuOpen ? 'display: block;' : undefined}
  >
    {@render entry(shareScreenText, '(Regular Bandwidth) ** RECOMMENDED', () =>
      onpromptforscreenname('screen')
    )}
    <div class="dropdown-divider"></div>
    {@render entry(virtualCamText, 'OBS', () => onpromptforscreenname('camera'))}
    <!--
        `e4e` in the capture, verbatim - TWO dividers, then a bare `li > a` with no
        icon, bound to `mediaService.stopSharingAll()`:

          T(0,"div",115)(1,"div",115),
          d(2,"li")(3,"a",163), x("click", () => onstopsharingall()),
          v(4," Stop Sharing All Screens"), u()()

        The nav item is labelled "Start/Stop Screen Sharing" but there was no stop
        anywhere in the menu; `onstopscreensharing()` existed and was only ever
        reachable through a remote `mutescreens` command from a presenter.
      -->
    <!--
      G05 — ` OBS / RTMP / Stream / Restream `, `a4e` at byte 2,479,414, gated
      `O(13, sessData.useMediaMTX ? 13 : -1)`.

      ```js
      T(0,"div",115), d(1,"li",187), x("click", () => openStreamingTab()),
        d(2,"a",158), v(3," OBS / RTMP / Stream / Restream "),
        d(4,"span",188), v(5,"New")
      ```

      const 187 `["title","OBS / RTMP / Stream / Restream",3,"click"]`, const 188
      `[1,"badge","text-bg-danger","ms-1"]`. The divider comes FIRST, inside the gate, so a
      room without MediaMTX gets neither the item nor a stray rule.

      `openStreamingTab()` is three chained jQuery `.tab('show')` calls upstream
      (byte 2,531,675) — session-control modal, streaming-selection tab, obs-streaming tab.
      All three already exist here as state: `openSessionControl('streaming-selection')`,
      and `streamingControlTab` already defaults to `'obs-streaming'`. So the page opens the
      modal on the right tab and nothing here reaches into another component's DOM.
    -->
    {#if streamingTabAvailable}
      <div class="dropdown-divider"></div>
      {@render entry(
        ' OBS / RTMP / Stream / Restream ',
        'OBS / RTMP / Stream / Restream',
        onopenstreamingtab,
        newBadge
      )}
    {/if}
    {#if screenSharing}
      <div class="dropdown-divider"></div>
      <div class="dropdown-divider"></div>
      {@render entry(stopSharingAllText, undefined, onstopscreensharing)}
      <!--
        G06 — ` Reopen Screenshare Preview`, `c4e` at byte 2,479,832, gated on the same
        `isScreenSharing`. Its divider comes AFTER the item, which is why it is written here
        and not folded into the pair above.

        **This is the way back from a one-way door.** `hidePreviewWindows()` sets
        `previewWindowsVisible = false` and, until now, NOTHING set it true again — so a
        presenter who hid the preview cards could not get them back without reloading the
        room. Upstream's handler is
        `if (!mediaService.isScreenSharing) return !1; emit("reopenPreviewWindow")`
        (byte 2,519,083); the gate is the same one this branch already carries.
      -->
      {@render entry(' Reopen Screenshare Preview', undefined, onreopenpreview)}
      <div class="dropdown-divider"></div>
    {/if}
    <!--
      G07 — one ` Stop Sharing {screenName}` per screen, `d4e` at byte 2,480,013, repeated
      over `mediaSoupService.screenProducers` — the LOCAL producer map, so a presenter sees
      their own shares and never anyone else's.

      A presenter sharing two screens could previously only stop BOTH: the menu's one stop
      was "Stop Sharing All Screens". `stopLocalScreen(producerId)` is what upstream's
      `stopSharingProducer(key)` does — close the producer, drop the tab, re-select the next
      one — and it already exists because the browser's own "Stop sharing" bar calls it.

      Keyed by producer id: the list is a map upstream and these entries genuinely have
      identity, unlike the body segments next door.
    -->
    {#each localScreens as screen (screen.id)}
      {@render entry(` Stop Sharing ${screen.screenName}`, undefined, () =>
        onstoplocalscreen(screen.id)
      )}
    {/each}
  </ul>
</li>
