<script lang="ts">
  /**
   * The PRESENTER's SoundCloud dropdown — `i4e`, bundle byte 2,478,080, slot 22 of `U4e`.
   *
   * ## Two slots, one feature, exactly negated gates
   *
   * ```js
   * O(22, isPresenter || isNonPresenterAdmin ? 22 : -1)                        // i4e, 2,478,080
   * O(23, isPresenter || isNonPresenterAdmin || !e.scPlaying ? -1 : 23)        // o4e, 2,478,748
   * ```
   *
   * Slots 22 and 23 of the navbar template `U4e` are adjacent and slot 23's gate is slot 22's
   * negated with `scPlaying` on top, so exactly one of them can ever render. Which one you get is
   * decided by whether you may start the music: a presenter gets THIS dropdown, which plays, stops
   * for all and stops for themselves; everybody else gets `SoundCloudViewerStop.svelte`, a single
   * button that stops it for themselves.
   *
   * **TWO components because upstream is two templates** — `i4e` and `o4e` are separate functions
   * at separate offsets, not two branches of one — and because the navbar's presenter block has to
   * stay one contiguous `{#if isPresenter}`: `session-control-audience-contract.test.ts` reads the
   * FIRST such block and requires the microphone, the screenshare and the webcam to be inside it.
   * A single component switching on `isPresenter` would have had to sit outside that block, which
   * moves the presenter's dropdown from second position to fifth.
   *
   * ## Why it is a component at all
   *
   * `RoomNavbar.svelte` sits exactly at the ceiling `source-size-contract` holds it to, and NAV-02
   * adds markup to it. The ratchet's instruction for that is to extract rather than to raise the
   * number, and this is the seam that was free: every other region of that file is pinned by an
   * exact-string assertion in one of eight contract tests, and this one is pinned by none.
   * `ScreenShareMenu.svelte` came out of the same file for the same reason and states the test a
   * seam has to pass — every prop below is an INPUT, none is a value reached back through the bar.
   */
  let {
    /** `mediaService.scPlaying` — whether the room is playing SoundCloud right now. */
    playing,
    /** `menus.soundcloud`; the navbar owns which top-level menu is open, because only one may be. */
    menuOpen,
    ontoggle,
    onpromptforsoundcloud,
    onstopsoundcloud,
    onstopsoundcloudforme
  }: {
    playing: boolean;
    menuOpen: boolean;
    ontoggle: () => void;
    onpromptforsoundcloud: () => void;
    onstopsoundcloud: () => void;
    onstopsoundcloudforme: () => void;
  } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<li
  title="Play music from SoundCloud for all"
  class="nav-item dropdown"
  onclick={(event) => event.stopPropagation()}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <a
    id="soundcloudDropdown"
    data-bs-toggle="dropdown"
    aria-haspopup="true"
    aria-expanded={menuOpen}
    class={[
      'nav-link dropdown-toggle d-flex align-items-center',
      { 'text-white': playing }
    ]}
    onclick={ontoggle}
  >
    <i class="fab fa-2x fa-soundcloud"></i>
    <span class="ml-2">
      <span class="caret"></span>
      <!--
        THE ICON FORM: upstream renders `/assets/images/playing.gif` here and that asset is
        not in this repository, so the faithful transcription rendered a BROKEN image in the
        navbar on every play. Same case, and same resolution, as `benzinga-logo.png` in
        `RoomSidebar.svelte`. `fa-volume-up` is not a pick - it is what the navbar's own
        screen-volume control uses for "audio is on".

        Knowingly still: the reference's indicator animates and this one does not. FA 5.8.1
        ships here and its only animations are `fa-spin`/`fa-pulse`, both spinners meaning
        "working"; FA6's `fa-beat` would fit and does not exist in 5.8.1, so it would have
        been a class with no effect. Restore the animation by adding the asset, not by
        inventing a keyframe. Enforced by `img-dimensions-contract.test.ts`.
      -->
      {#if playing}
        <i class="fas fa-volume-up ml-1" title="Playing"></i>
      {/if}
    </span>
  </a>
  <ul
    aria-labelledby="soundcloudDropdown"
    data-bs-popper={menuOpen ? 'static' : undefined}
    class={[
      'dropdown-menu dropdown-menu-end soundcloud-options',
      { show: menuOpen }
    ]}
    style={menuOpen ? 'display: block;' : undefined}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <li class="nav-item" onclick={onpromptforsoundcloud}>
      <i class="fa fa-play-circle"></i> Play a track or playlist from SoundCloud
    </li>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <li class="nav-item" onclick={onstopsoundcloud}>
      <i class="fa fa-square"></i><i class="fa fa-users"></i> Stop Playing For All
    </li>
    <li class="divider"></li>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <li class="nav-item" onclick={onstopsoundcloudforme}>
      <i class="fa fa-square"></i> Stop Playing For Me
    </li>
  </ul>
</li>
