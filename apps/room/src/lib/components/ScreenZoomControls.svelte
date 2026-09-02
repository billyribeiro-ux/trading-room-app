<script lang="ts">
  /**
   * The screen control cluster: the magnifier that toggles zoom mode, the camera, and the three
   * gated zoom buttons.
   *
   * The capture ships this cluster TWICE, in two different components, with two different orders
   * and two different containers. Both are reproduced here because the buttons, their classes and
   * their icons are identical - only the arrangement differs.
   *
   * **attached** - `app-presentationarea`, inside `li.nav-item.ms-auto`, function `SSe` at byte
   * 1,923,312. RE-DECODED 2026-08-31 by bracket-walking that component's 292-entry const table BY
   * VALUE from `consts:[[` at byte 1,994,264 - every index from 66 up is one lower than it was:
   *
   * ```html
   * <li class="nav-item ms-auto">                            <!-- const 70 -->
   *   <div class="zoom-controls-container position-relative"> <!-- const 87, rendered by ScreenTabs -->
   *     <div class="zoom-controls position-absolute"          <!-- const 88, *ngIf showZoomCtrl -->
   *          [ngClass]="{'viewer-only-screen-zoom-controls': viewerOnlyMode}">
   *       <button class="btn btn-sm btn-warning" (click)="panZoomIn()">   <i class="icon fas fa-search-plus"></i>
   *       <button class="btn btn-sm btn-warning" (click)="panZoomOut()">  <i class="icon fas fa-search-minus"></i>
   *       <button class="btn btn-sm btn-warning" (click)="panZoomReset()"><i class="icon fas fa-redo"></i>
   *     </div>
   *     …volume dropdown…                                    <!-- consts 89-96, the `volume` snippet -->
   *     <button class="btn btn-sm btn-dark" (click)="togglePanZoom()">     <i class="icon fas fa-search"></i>
   *     <button class="btn btn-sm btn-dark" (click)="captureVideoImage()"> <i class="icon fas fa-camera"></i>
   *     <button class="btn btn-sm btn-dark" (click)="fullScreenshare()">   <i class="icon fas fa-expand"></i>
   *   </div>
   * </li>
   * ```
   *
   * The volume dropdown is `ScreenVolumeControl.svelte`, passed in as the {@link Props.volume}
   * snippet rather than rendered here, because its state is the PAGE's: `audioVolume`, the
   * preference maps and `talkingUsers` all live in `+page.svelte`, exactly as the reference keeps
   * them on the component that owns `SSe`. What this component owns is the ORDER — children 2, 3
   * and 4 of const 87 come before children 16, 18 and 20 — and that is why the slot is here and not
   * beside the cluster in the page.
   *
   * Note the order: in the bar the gated trio comes FIRST and is `position-absolute`, so it floats
   * clear of the row rather than widening it. `app-presentationarea`'s own stylesheet places it at
   * `.zoom-controls { top: -33px; left: -33px }` - above and left of the container. That rule is
   * already applied globally by `src/lib/styles/captured-runtime-components.css:6930`, scoped under
   * the `app-presentationarea` host that `+page.svelte` already renders, so no CSS is declared here.
   *
   * **detached** - `app-screenshare-view`, over the video, function `Y0e` at byte 1,493,686, its
   * own 20-entry const table walked from `consts:[[` at byte 1,500,337 (those indices did NOT move):
   *
   * ```html
   * <div class="zoom-controls-container-detached" [ngClass]> <!-- const 4; SV-SP-14 owns the class -->
   *   <button class="btn btn-sm btn-dark" (click)="togglePanZoomDetached()"><i class="icon fas fa-search"></i>
   *   <button class="btn btn-sm btn-dark" (click)="captureVideoImage()">   <i class="icon fas fa-camera"></i>
   *   <div>                                                  <!-- *ngIf showZoomCtrlDetached, NO class -->
   *     …the same three btn-warning buttons…
   *   </div>
   * </div>
   * ```
   *
   * Here the trio comes LAST and its wrapper carries no class at all, so it lays out inline under
   * the two dark buttons.
   *
   * The camera is NOT behind the zoom gate in either arrangement. That is worth stating because the
   * gate is right next to it: `app-screenshare-view`'s const 13 (`btn btn-sm btn-dark`) is used
   * twice - once with `fa-search`, once with `fa-camera` - while const 16 (`btn btn-sm btn-warning`)
   * is the gated trio.
   */
  import type { Snippet } from 'svelte';

  type Props = {
    /**
     * Which captured arrangement to render. `attached` is the tab bar's `ms-auto` slot;
     * `detached` is the popped-out window's overlay.
     */
    variant: 'attached' | 'detached';
    /**
     * The volume dropdown — consts 89-96, children [3] and [4] of const 87.
     *
     * ATTACHED ONLY. `app-screenshare-view`'s detached cluster has no volume control of any kind:
     * its const table runs `zoom-controls-container-detached`, the two dark buttons and the
     * unclassed trio wrapper, and nothing else. Passing this snippet in the detached variant would
     * render a control the reference does not have there, so the detached branch ignores it.
     */
    volume?: Snippet;
    /**
     * `viewerOnlyMode`, which moves the gated trio rather than hiding it.
     *
     * `cSe`'s update block is one line — `z('ngClass', ct(1, HCe, …globals.viewerOnlyMode))` at byte
     * 1,920,974, with `HCe = t => ({'viewer-only-screen-zoom-controls': t})` at byte 1,916,482: a
     * shared arrow beside the template functions, NOT a const-table entry, which is the only place
     * an `ngClass` object's class NAMES exist. `VCe` 38 bytes earlier is `viewer-only-screen-tab` —
     * a DIFFERENT class this file used to name. The rule, `{ top: 33px !important; left: -3px
     * !important }`, ships in `styles/protradingroom-source.css`; without the binding the trio keeps
     * `top:-33px; left:-33px` in viewer-only mode, i.e. 66px above where the reference puts it.
     *
     * ATTACHED ONLY, like the volume slot: `app-screenshare-view`'s detached trio wrapper carries no
     * class at all.
     */
    viewerOnlyMode?: boolean;
    /** Whether the three zoom buttons are showing. */
    showZoomCtrl: boolean;
    /** The magnifier. */
    ontoggle: () => void;
    /** The camera. Resolves a different screen per variant - see {@link captureVideoImage}. */
    oncapture: () => void;
    /**
     * `fullScreenshare()` - the THIRD dark button, attached variant only.
     *
     * `fullScreenshare() { this.isFullScreenshare = !this.isFullScreenshare }`, and the icon swaps
     * with it: `O(21, e.isFullScreenshare ? 21 : 22)` picks `fa-compress-arrows-alt` when expanded
     * and `fa-expand` when not. `app-screenshare-view`'s detached cluster has no such button, so
     * this is optional and the detached branch does not render it.
     */
    onfullscreen?: () => void;
    /** Whether the screens pane is currently expanded, for the icon swap. */
    fullscreen?: boolean;
    onzoomin: () => void;
    onzoomout: () => void;
    onreset: () => void;
  };

  let {
    variant,
    volume,
    viewerOnlyMode = false,
    showZoomCtrl,
    ontoggle,
    oncapture,
    onzoomin,
    onzoomout,
    onreset,
    onfullscreen,
    fullscreen = false
  }: Props = $props();

  /*
    ── `swallowDoubleClick` IS GONE, 2026-09-02, AND SO IS THE ARRANGEMENT THAT NEEDED IT — SZC-03 ──

    It stopped `ondblclick` on all six buttons, because in OUR detached arrangement the cluster sat
    inside `.video-screen-container`, whose double-click maximises the screen — so a double-tap on
    the magnifier went fullscreen too.

    This docblock already carried the answer: *"UPSTREAM IT IS NOT NESTED: `Y0e` is node 5 of that
    component's root template and the `appDoubleClick` box (const 5) is node 6, a SIBLING, so the
    reference needs no guard."* Every word measured and still true — re-read at byte 1,501,256.
    `ScreenPane.svelte` lifts the cluster out to where the capture puts it, so there is no box to
    stop the event reaching and six handlers with nothing to do.

    **The reason the nesting was chosen is worth recording, because matching gives it up.** It read
    *"Ours nests it to fullscreen with the picture (SV-SP-01)"* — the controls stayed usable while
    the video was fullscreen. Upstream's do not: `onDoubleClicked` fullscreens
    `#video-screen-container-${id}`, and the cluster is outside that node there, so it disappears
    for as long as the picture is maximised. That is now true here too. It is a real capability
    given up to match, and SV-SP-01 — the watermark — is untouched, because it is a different node
    (`H(10,Q0e,…,"span",9)`, opened inside the video container).
  */
</script>

{#snippet darkButtons()}
  <button
    type="button"
    class="btn btn-sm btn-dark"
    title={showZoomCtrl ? 'Hide zoom controls' : 'Zoom'}
    aria-pressed={showZoomCtrl}
    onclick={ontoggle}
  >
    <i class="icon fas fa-search"></i>
  </button>
  <button type="button" class="btn btn-sm btn-dark" title="Screenshot" onclick={oncapture}>
    <i class="icon fas fa-camera"></i>
  </button>
{/snippet}

{#snippet zoomTrio()}
  <button type="button" class="btn btn-sm btn-warning" title="Zoom in" onclick={onzoomin}>
    <i class="icon fas fa-search-plus"></i>
  </button>
  <button type="button" class="btn btn-sm btn-warning" title="Zoom out" onclick={onzoomout}>
    <i class="icon fas fa-search-minus"></i>
  </button>
  <button type="button" class="btn btn-sm btn-warning" title="Reset view" onclick={onreset}>
    <i class="icon fas fa-redo"></i>
  </button>
{/snippet}

{#if variant === 'attached'}
  {#if showZoomCtrl}
    <div
      class={[
        'zoom-controls position-absolute',
        { 'viewer-only-screen-zoom-controls': viewerOnlyMode }
      ]}
    >
      {@render zoomTrio()}
    </div>
  {/if}
  <!--
    Children [3] and [4] of const 87, and they come BEFORE the dark buttons at [16], [18] and [20].
    `SSe`'s create block, read at byte 1,923,312, is the whole ordering:
      d(1,'div',87), H(2, cSe, …'div',88)(3, pSe, …'button',89), d(4,'div',90)…, d(16,'button',97)…
  -->
  {@render volume?.()}
  {@render darkButtons()}
  <!--
    Const 97 again, with const 100 / 115 swapping on `isFullScreenshare`. The owner's capture of
    the bar shows all THREE dark buttons - search, camera, expand - and this room rendered two.
  -->
  <button
    type="button"
    class="btn btn-sm btn-dark"
    title={fullscreen ? 'Exit full screen' : 'Full screen'}
    aria-pressed={fullscreen}
    onclick={() => onfullscreen?.()}
  >
    <i class="icon fas {fullscreen ? 'fa-compress-arrows-alt' : 'fa-expand'}"></i>
  </button>
{:else}
  {@render darkButtons()}
  {#if showZoomCtrl}
    <div>
      {@render zoomTrio()}
    </div>
  {/if}
{/if}
