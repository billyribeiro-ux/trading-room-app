<script lang="ts">
  /**
   * The screens tab bar: `ul#screenTabs`, one tab per screen being shared.
   *
   * Reproduced from a captured live room whose DOM carried three tabs at once, all belonging to a
   * single presenter:
   *
   * ```html
   * <a class="nav-link active" id="6a6c879d83f61901b973fe4e-tab" aria-controls="6a6c879d83f61901b973fe4e">
   *   <span placement="bottom" tooltip="This is the default screen…" class="mr-2"><i class="fas fa-eye"></i></span>
   *   <img class="presenter-img" src="https://secure.gravatar.com/avatar/…?d=mm&s=20">
   *   <span class="mx-1">Trendy Jon-FUTURES</span>
   * ```
   *
   * The three labels in that capture were `Trendy Jon-FUTURES`, `Trendy Jon-MAIN / SPX` and
   * `Trendy Jon-Flying until my appointment ` (trailing space included). That is what settles a
   * question two earlier captures made look otherwise: `screenName` is **free text the presenter
   * types**, not an auto-generated `Screen N`. Two other rooms showed `TG-Screen 1` and
   * `Sam-Screen 1`, which reads like auto-numbering until you see "MAIN / SPX" - those are just
   * presenters who kept a default-looking name. Nothing here invents a name; the caller supplies it.
   *
   * A separate capture of the same bar with the gear open pins the open state: the toggle gains
   * `.show` and `aria-expanded="true"`, and the menu gains `.show` plus Popper's
   * `data-popper-placement="bottom-start"` and inline transform. Bootstrap's JS owns that
   * positioning, so only the class and aria state are driven here.
   */
  import type { Snippet } from 'svelte';

  export type ScreenTab = {
    /** The muser/screen id. The anchor is `{id}-tab` and it controls the pane `{id}`. */
    id: string;
    /** The sharer's display name - the left half of the label. */
    name: string;
    /** The presenter-typed screen name - the right half. Free text, never generated. */
    screenName: string;
    /** Gravatar URL for `img.presenter-img`. */
    avatarUrl: string;
    /**
     * Who is sharing it — never rendered; it is who "Stop This Screen" is addressed to. `null` for
     * one of this browser's own, and for a producer whose peer is not in the roster yet. Why the
     * stop needs a recipient at all is on `forceStopScreen` in `presenter-commands.remote.ts`.
     */
    ownerId: number | null;
  };

  type Props = {
    screens: ScreenTab[];
    /** The tab whose pane is showing. */
    selectedScreenId?: string | null;
    /**
     * The screen everyone is currently taken to. Renders the eye badge, whose captured tooltip is
     * quoted verbatim in {@link FORCED_SCREEN_TOOLTIP}.
     */
    forcedScreenId?: string | null;
    /** The locked screen, if any - flips "Lock Screen" to "Unlock Screen" on that tab only. */
    lockedScreenId?: string | null;
    /**
     * Presenter-only menu entries. The captured viewer's dropdown holds exactly two items and a
     * leading `<!---->` where Angular collapsed the `[ngIf isP]` block, so this gates the same two.
     */
    isPresenter?: boolean;
    onselect?: (screenId: string) => void;
    onbringeveryone?: (screenId: string) => void;
    onstopscreen?: (screenId: string) => void;
    ondetach?: (screenId: string) => void;
    ontogglelock?: (screenId: string) => void;
    /** The `li.nav-item.ms-auto` cluster - zoom, volume, capture, fullscreen. */
    controls?: Snippet;
  };

  /*
    `viewer-only-screen-tab` does NOT belong on this `ul`, and briefly did.

    `wSe`'s update block (`docs/source/components/app-presentationarea.render-helpers.js:483-493`)
    walks: `O(0, …)` at node 0, `m(2)` to node 2, `pt(…)`, `m(2)` to node 4, `O(4, …)` — an explicit
    index, so the pointer is fixed independently of counting — then `m()` to node 5, and THAT is
    where `z('ngClass', ut(3, jCe, …viewerOnlyMode))` lands. Node 5 is `d(5, 'div', 72)`, i.e.
    `div#screensTabsContent.tab-content`, which `+page.svelte` renders.

    The const table agrees from the other side: const 70 — this element — is
    `['id','screenTabs','role','tablist',1,'nav','nav-tabs','screens-tabs']` with NO `3,'ngClass'`
    marker (`app-presentationarea.compiled.js:2042`), and Angular emits that marker only where a
    binding exists. Const 72 has it. So this `ul` cannot carry the class upstream at all.
  */

  let {
    screens,
    selectedScreenId = null,
    forcedScreenId = null,
    lockedScreenId = null,
    isPresenter = false,
    onselect,
    onbringeveryone,
    onstopscreen,
    ondetach,
    ontogglelock,
    controls
  }: Props = $props();

  /** Quoted verbatim from the captured `tooltip` attribute on the eye badge. */
  const FORCED_SCREEN_TOOLTIP =
    'This is the default screen users are taken to right now. If you are a presenter and talking ' +
    'whichever screen you select will be forced on others. You can also select a specific screen ' +
    'and click the gear icon on this tab to force everyone to watch that screen.';

  let openMenuId = $state<string | null>(null);

  function toggleMenu(screenId: string, event: MouseEvent) {
    // The gear sits inside the tab anchor, so a click on it would otherwise also switch tabs.
    event.stopPropagation();
    openMenuId = openMenuId === screenId ? null : screenId;
  }

  function runItem(event: MouseEvent, screenId: string, action?: (id: string) => void) {
    // Every item is `<a href="#">` in the capture; without this the room navigates to `#`.
    event.preventDefault();
    event.stopPropagation();
    openMenuId = null;
    action?.(screenId);
  }
</script>

<!--
  Attribute shape is copied from the room's own `#mainTabs` (`+page.svelte:4172-4185`) rather than
  invented: `class="nav-link"` plus `class:active`, `tabindex` left UNDEFINED on the active tab,
  `aria-selected` as a boolean, and `data-bs-toggle`/`data-bs-target` so Bootstrap drives the pane
  the same way it drives Screens/Notes/Files.

  `tabindex={undefined}` on the active tab is not a shortcut - a live member dump shows the active
  screen tab carrying no `tabindex` attribute at all, and the inactive ones carrying `-1`, which is
  exactly what `#mainTabs` already emits.
-->
<ul id="screenTabs" role="tablist" class="nav nav-tabs screens-tabs">
  {#each screens as screen (screen.id)}
    <li role="presentation" class="nav-item">
      <!-- svelte-ignore a11y_missing_attribute -->
      <!--
        Attributes matched against the owner's populated `#screenTabs`, 2026-08-11 — the first
        capture of this bar with tabs in it. Three differences were found; one is matched and two
        are deliberate divergences, by one consistent rule: **a captured value is reproduced unless
        reproducing it locks a real person out.**

        MATCHED — `data-bs-target` is gone. The reference drives the pane with `data-bs-toggle="tab"`
        and `aria-controls` alone, and nothing is lost by doing the same.

        DIVERGED — `aria-selected`. The reference emits `aria-selected="true"` on all three tabs,
        including the two without `.active`, which tells a screen reader that three tabs are selected
        at once.

        DIVERGED — `tabindex`. The reference carries none, and its anchors have no `href` either, so
        upstream these tabs cannot be reached by keyboard at all. Keeping the roving tabindex is what
        makes the screen switcher operable without a mouse.

        The earlier note here justified `-1` from "a live member dump"; the populated capture
        disagrees, so the VALUE is no longer evidence-backed and is kept as an accessibility decision
        instead of a transcription. Both divergences are recorded in `TODO.md` under decisions taken
        deliberately, beside "the editor toolbar stays enabled" and "failures render", which are the
        same kind of call.

        Everything else captured here is still reproduced verbatim, including the duplicate
        `id="dropdownMenuScreen"` across every gear, because that one costs a reader nothing.
      -->
      <a
        id="{screen.id}-tab"
        class={['nav-link', { active: screen.id === selectedScreenId }]}
        role="tab"
        tabindex={screen.id === selectedScreenId ? 0 : -1}
        aria-controls={screen.id}
        aria-selected={screen.id === selectedScreenId}
        data-bs-toggle="tab"
        onclick={() => onselect?.(screen.id)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onselect?.(screen.id);
        }}
      >
        {#if screen.id === forcedScreenId}
          <span
            {...{ placement: 'bottom', tooltip: FORCED_SCREEN_TOOLTIP } as Record<string, string>}
            class="mr-2"
          >
            <i class="fas fa-eye"></i>
          </span>
        {/if}
        <!--
          `SV-SP-06` — the LOCKED badge, and its one-click unlock.

          ```js
          function oSe(t,n){ if(1&t){ const e=Y();
            d(0,"span",82), x("click", () => { const o = g().$implicit;
              return g(3).toggleLockScreen(o._id) }), T(1,"i",83), u() } }     // byte 1,918,843
          O(3, i.appService.globals.lockedScreenID === e._id ? 3 : -1)         // byte 1,920,343
          ```

          Const 82 is `["placement","bottom","tooltip","Unlock this screen?",1,"mr-2",3,"click"]` and
          const 83 `["aria-hidden","true",1,"fas","fa-lock"]`. It sits immediately after the forced
          screen's eye badge, which is the order here.

          **The asymmetry was the tell.** `StreamTabs.svelte` has rendered this badge from the same
          const all along — on the bar where, upstream, it can never appear — while the bar that
          actually locks screens had none. `lockedScreenId` reached this component and was read for
          exactly one thing: flipping the dropdown item's label. So a locked screen showed no
          indicator anywhere and the only way out was to find the right item in the right menu.

          `stopPropagation` because the badge lives inside the tab's own anchor: without it, clicking
          Unlock would also select the tab, which is not what the reference's separate `click` does.
        -->
        {#if screen.id === lockedScreenId}
          <!--
            NO `svelte-ignore` here, and that is not an oversight: the `{...spread}` carrying
            `placement` and `tooltip` already suppresses both a11y rules, so an ignore placed on this
            element is reported as UNWARNED and fails `svelte/no-unused-svelte-ignore`.
            `StreamTabs.svelte` records the same thing about its own copy of this badge.
          -->
          <span
            {...{ placement: 'bottom', tooltip: 'Unlock this screen?' } as Record<string, string>}
            class="mr-2"
            onclick={(event) => {
              event.stopPropagation();
              ontogglelock?.(screen.id);
            }}
          >
            <i aria-hidden="true" class="fas fa-lock"></i>
          </span>
        {/if}
        <img class="presenter-img" src={screen.avatarUrl} alt="" width="20" height="20" />
        <span class="mx-1">{screen.name}-{screen.screenName}</span>
      </a>
      <!--
        The capture puts this `div.d-inline-block` INSIDE the tab anchor, so `a.dropdown-item` ends
        up nested in `a.nav-link`. Angular can build that because it assembles the DOM through JS
        APIs, which never run the parser's repair step. Server-rendered markup does run it: the
        parser hoists the inner anchor out, the hydrated tree stops matching the served HTML, and
        Svelte's structural assumptions break with it.

        So the gear moves to a sibling of the anchor inside the same `li.nav-item`. Classes, ids,
        icons, order and text are unchanged; only the nesting differs, and it differs because the
        captured nesting is not expressible in parsed HTML.
      -->
      <div class="d-inline-block">
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            id="dropdownMenuScreen"
            data-bs-toggle="dropdown"
            aria-expanded={openMenuId === screen.id}
            class={['dropdown-toggle', { show: openMenuId === screen.id }]}
            onclick={(event) => toggleMenu(screen.id, event)}
          >
            <i class="fas fa-cog"></i>
          </span>
          <ul
            aria-labelledby="dropdownMenuButton"
            class={['dropdown-menu', { show: openMenuId === screen.id }]}
          >
            {#if isPresenter}
              <li>
                <a
                  href="#{screen.id}"
                  class="dropdown-item"
                  onclick={(event) => runItem(event, screen.id, onbringeveryone)}
                >
                  <i class="fas fa-eye"></i> Bring everyone here
                </a>
              </li>
              <li>
                <a
                  href="#{screen.id}"
                  class="dropdown-item"
                  onclick={(event) => runItem(event, screen.id, onstopscreen)}
                >
                  <i class="fas fa-trash-alt"></i> Stop This Screen
                </a>
              </li>
            {/if}
            <li>
              <a
                href="#{screen.id}"
                class="dropdown-item"
                onclick={(event) => runItem(event, screen.id, ondetach)}
              >
                <i class="fas fa-external-link-alt"></i> Detach Screen to a new window
              </a>
            </li>
            <li>
              <a
                href="#{screen.id}"
                class="dropdown-item"
                onclick={(event) => runItem(event, screen.id, ontogglelock)}
              >
                {#if screen.id === lockedScreenId}
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

  {#if screens.length > 0 && controls}
    <li class="nav-item ms-auto">
      <div class="zoom-controls-container position-relative">
        {@render controls()}
      </div>
    </li>
  {/if}
</ul>

<style>
  /*
   * The gear sits BESIDE the screen name, not under it.
   *
   * This is the unpaid cost of the nesting divergence documented above. The capture puts
   * `div.d-inline-block` INSIDE `a.nav-link`, where it is inline content of the anchor and
   * therefore on the same line as the name. That nesting is not expressible in parsed HTML -
   * `a.dropdown-item` inside `a.nav-link` is hoisted out by the parser - so the gear is rendered
   * as a sibling of the anchor instead.
   *
   * Bootstrap's `.nav-link` is `display: block`. A block-level anchor followed by a sibling puts
   * that sibling on the NEXT line, which is what shipped: the name in its pill, the gear dropped
   * underneath it and sitting against the shared screen's zoom magnifier.
   *
   * The earlier note claimed "only the nesting differs". That was true of the markup and false of
   * the rendering. Making the tab a flex row restores the captured single-line layout without
   * restoring the unparseable nesting - the anchor and the gear are laid out as siblings but
   * painted as one row, which is what the capture shows.
   *
   * Scoped to this component, and to the tab `li` only: the dropdown's own `li` elements
   * (`.dropdown-menu > li`) must stay block, or the menu items would run across.
   */
  li.nav-item {
    display: flex;
    align-items: center;
  }
</style>
