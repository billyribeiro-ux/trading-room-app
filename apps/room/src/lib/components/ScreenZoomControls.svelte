<script lang="ts">
  /**
   * The screen control cluster: the magnifier that toggles zoom mode, the camera, and the three
   * gated zoom buttons.
   *
   * The capture ships this cluster TWICE, in two different components, with two different orders
   * and two different containers. Both are reproduced here because the buttons, their classes and
   * their icons are identical - only the arrangement differs.
   *
   * **attached** - `app-presentationarea`, inside `li.nav-item.ms-auto`
   * (`docs/source/components/app-presentationarea.render-helpers.js:395-458`, function `CSe`),
   * decoded against that component's const table:
   *
   * ```html
   * <li class="nav-item ms-auto">                            <!-- const 71 -->
   *   <div class="zoom-controls-container position-relative"> <!-- const 88, rendered by ScreenTabs -->
   *     <div class="zoom-controls position-absolute"          <!-- const 89, *ngIf showZoomCtrl -->
   *          [ngClass]="{'viewer-only-screen-zoom-controls': viewerOnlyMode}">
   *       <button class="btn btn-sm btn-warning" (click)="panZoomIn()">   <i class="icon fas fa-search-plus"></i>
   *       <button class="btn btn-sm btn-warning" (click)="panZoomOut()">  <i class="icon fas fa-search-minus"></i>
   *       <button class="btn btn-sm btn-warning" (click)="panZoomReset()"><i class="icon fas fa-redo"></i>
   *     </div>
   *     …volume dropdown…                                    <!-- consts 90-97, NOT built here -->
   *     <button class="btn btn-sm btn-dark" (click)="togglePanZoom()">     <i class="icon fas fa-search"></i>
   *     <button class="btn btn-sm btn-dark" (click)="captureVideoImage()"> <i class="icon fas fa-camera"></i>
   *     <button class="btn btn-sm btn-dark" (click)="fullScreenshare()">   <!-- NOT built here -->
   *   </div>
   * </li>
   * ```
   *
   * Note the order: in the bar the gated trio comes FIRST and is `position-absolute`, so it floats
   * clear of the row rather than widening it. `app-presentationarea`'s own stylesheet places it at
   * `.zoom-controls { top: -33px; left: -33px }` - above and left of the container. That rule is
   * already applied globally by `src/lib/styles/captured-runtime-components.css:6902`, scoped under
   * the `app-presentationarea` host that `+page.svelte` already renders, so no CSS is declared here.
   *
   * **detached** - `app-screenshare-view`, over the video
   * (`docs/source/components/app-screenshare-view.render-helpers.js:74-108`, function `Y0e`):
   *
   * ```html
   * <div class="zoom-controls-container-detached">           <!-- const 4 -->
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
  type Props = {
    /**
     * Which captured arrangement to render. `attached` is the tab bar's `ms-auto` slot;
     * `detached` is the popped-out window's overlay.
     */
    variant: 'attached' | 'detached';
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
    showZoomCtrl,
    ontoggle,
    oncapture,
    onzoomin,
    onzoomout,
    onreset,
    onfullscreen,
    fullscreen = false
  }: Props = $props();

  /**
   * `ondblclick` is stopped on every button because in the DETACHED arrangement the cluster sits
   * inside `.video-screen-container`, whose double-click maximises the screen. Without it, a quick
   * double-tap on the magnifier would also go fullscreen. It is inert in the attached arrangement,
   * where the cluster is in the tab bar and has no such ancestor - the buttons are declared once
   * and shared, so the guard travels with them.
   */
  function swallowDoubleClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

{#snippet darkButtons()}
  <button
    type="button"
    class="btn btn-sm btn-dark"
    title={showZoomCtrl ? 'Hide zoom controls' : 'Zoom'}
    aria-pressed={showZoomCtrl}
    onclick={ontoggle}
    ondblclick={swallowDoubleClick}
  >
    <i class="icon fas fa-search"></i>
  </button>
  <button
    type="button"
    class="btn btn-sm btn-dark"
    title="Screenshot"
    onclick={oncapture}
    ondblclick={swallowDoubleClick}
  >
    <i class="icon fas fa-camera"></i>
  </button>
{/snippet}

{#snippet zoomTrio()}
  <button
    type="button"
    class="btn btn-sm btn-warning"
    title="Zoom in"
    onclick={onzoomin}
    ondblclick={swallowDoubleClick}
  >
    <i class="icon fas fa-search-plus"></i>
  </button>
  <button
    type="button"
    class="btn btn-sm btn-warning"
    title="Zoom out"
    onclick={onzoomout}
    ondblclick={swallowDoubleClick}
  >
    <i class="icon fas fa-search-minus"></i>
  </button>
  <button
    type="button"
    class="btn btn-sm btn-warning"
    title="Reset view"
    onclick={onreset}
    ondblclick={swallowDoubleClick}
  >
    <i class="icon fas fa-redo"></i>
  </button>
{/snippet}

{#if variant === 'attached'}
  {#if showZoomCtrl}
    <div class="zoom-controls position-absolute">
      {@render zoomTrio()}
    </div>
  {/if}
  {@render darkButtons()}
  <!--
    Const 98 again, with const 101 / 116 swapping on `isFullScreenshare`. The owner's capture of
    the bar shows all THREE dark buttons - search, camera, expand - and this room rendered two.
  -->
  <button
    type="button"
    class="btn btn-sm btn-dark"
    title={fullscreen ? 'Exit full screen' : 'Full screen'}
    aria-pressed={fullscreen}
    onclick={() => onfullscreen?.()}
    ondblclick={swallowDoubleClick}
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
