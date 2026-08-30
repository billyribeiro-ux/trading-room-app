<script lang="ts">
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
   * | OBS / RTMP / Stream / Restream | `a4e`, byte 2,479,514 | `sessData.useMediaMTX` |
   * | Stop Sharing All Screens | `l4e`, byte 2,479,700 | `isScreenSharing` |
   * | Reopen Screenshare Preview | `c4e`, byte 2,479,924 | `isScreenSharing` |
   * | Stop Sharing {screenName} | `d4e`, byte 2,480,060 | one per local screen |
   *
   * The DIVIDERS are not decoration and are placed where the capture places them: `a4e` opens with
   * one, `l4e` opens with two, and `c4e` closes with one. Read as a group they are what separates
   * "start something" from "stop something" in a menu that does both.
   */
  export type LocalScreen = { readonly id: string; readonly screenName: string };

  let {
    /** `mediaService.isScreenSharing` — three of the six entries are behind it. */
    screenSharing,
    /** `menus.screen`; the navbar owns which top-level menu is open, because only one may be. */
    menuOpen,
    /*
      The three captured labels, passed rather than restated. `virtualCamText` is
      ' OBS / XSPLIT/ Share Virtual Cam' — the spacing and the missing space after the second slash
      are the reference's, and one of them has already been the source of a bug here.
    */
    shareScreenText,
    virtualCamText,
    stopSharingAllText,
    /** `sessData.useMediaMTX`. */
    streamingTabAvailable,
    /** The screens THIS browser is sharing; upstream's `screenProducers` map. */
    localScreens,
    ontoggle,
    onpromptforscreenname,
    onstopscreensharing,
    onopenstreamingtab,
    onreopenpreview,
    onstoplocalscreen
  }: {
    screenSharing: boolean;
    menuOpen: boolean;
    shareScreenText: string;
    virtualCamText: string;
    stopSharingAllText: string;
    streamingTabAvailable: boolean;
    localScreens: readonly LocalScreen[];
    ontoggle: () => void;
    onpromptforscreenname: (source: 'screen' | 'camera') => void;
    onstopscreensharing: () => void;
    onopenstreamingtab: () => void;
    onreopenpreview: () => void;
    onstoplocalscreen: (producerId: string) => void;
  } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<li
  title="Start/Stop Screen Sharing"
  class="screen-sharing nav-item dropdown"
  onclick={(event) => event.stopPropagation()}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <a
    id="dropdownScreenSharing"
    data-bs-toggle="dropdown"
    aria-haspopup="true"
    aria-expanded={menuOpen}
    class={[
      'nav-link dropdown-toggle d-flex align-items-center',
      { muted: !screenSharing, 'text-white': screenSharing }
    ]}
    onclick={() => ontoggle()}
  >
    <i class="fas fa-2x fa-desktop"></i>
    <span class="ml-2 mainNavItem">Start/Stop Screen Sharing</span>
  </a>
  <ul
    aria-labelledby="dropdownScreenSharing"
    data-bs-popper={menuOpen ? 'static' : undefined}
    class={['screen-options-start-screen dropdown-menu dropdown-menu-end', { show: menuOpen }]}
    style={menuOpen ? 'display: block;' : undefined}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <li title="(Regular Bandwidth) ** RECOMMENDED" onclick={() => onpromptforscreenname('screen')}>
      <!-- svelte-ignore a11y_missing_attribute -->
      <a aria-hidden="true">{shareScreenText}</a>
    </li>
    <div class="dropdown-divider"></div>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <li title="OBS" onclick={() => onpromptforscreenname('camera')}>
      <!-- svelte-ignore a11y_missing_attribute -->
      <a aria-hidden="true">{virtualCamText}</a>
    </li>
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
      G05 — ` OBS / RTMP / Stream / Restream `, `a4e` at byte 2,479,514, gated
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
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li title="OBS / RTMP / Stream / Restream" onclick={onopenstreamingtab}>
        <!-- svelte-ignore a11y_missing_attribute -->
        <a aria-hidden="true"
          >{' OBS / RTMP / Stream / Restream '}<span class="badge text-bg-danger ms-1">New</span></a
        >
      </li>
    {/if}
    {#if screenSharing}
      <div class="dropdown-divider"></div>
      <div class="dropdown-divider"></div>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li onclick={onstopscreensharing}>
        <!-- svelte-ignore a11y_missing_attribute -->
        <a aria-hidden="true">{stopSharingAllText}</a>
      </li>
      <!--
        G06 — ` Reopen Screenshare Preview`, `c4e` at byte 2,479,924, gated on the same
        `isScreenSharing`. Its divider comes AFTER the item, which is why it is written here
        and not folded into the pair above.

        **This is the way back from a one-way door.** `hidePreviewWindows()` sets
        `previewWindowsVisible = false` and, until now, NOTHING set it true again — so a
        presenter who hid the preview cards could not get them back without reloading the
        room. Upstream's handler is
        `if (!mediaService.isScreenSharing) return !1; emit("reopenPreviewWindow")`
        (byte 2,519,083); the gate is the same one this branch already carries.
      -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li onclick={onreopenpreview}>
        <!-- svelte-ignore a11y_missing_attribute -->
        <a aria-hidden="true">{' Reopen Screenshare Preview'}</a>
      </li>
      <div class="dropdown-divider"></div>
    {/if}
    <!--
      G07 — one ` Stop Sharing {screenName}` per screen, `d4e` at byte 2,480,060, repeated
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
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li onclick={() => onstoplocalscreen(screen.id)}>
        <!-- svelte-ignore a11y_missing_attribute -->
        <a aria-hidden="true">{` Stop Sharing ${screen.screenName}`}</a>
      </li>
    {/each}
  </ul>
</li>
