<script lang="ts">
  /**
   * The zoom-overlay volume dropdown — `#dropdownVolume` as `app-presentationarea` renders it,
   * which is NOT the one in the main navbar.
   *
   * There are two `#dropdownVolume` triggers in the reference and they are different controls:
   *
   * | variant | const | where |
   * | --- | --- | --- |
   * | `["id","dropdownVolume","data-bs-toggle","dropdown",1,"nav-link","d-flex","align-items-center"]` | app-room 104 | the navbar — already built, `RoomNavbar.svelte:663` |
   * | `["id","dropdownVolume","data-bs-toggle","dropdown",1,"btn","btn-sm","btn-dark"]` | app-presentationarea 89 | HERE, the screen tab bar's `ms-auto` cluster |
   *
   * RE-DECODED 2026-08-31 against the PINNED v4 bundle: `SSe` at byte 1,923,312, its const table
   * bracket-walked BY VALUE from `consts:[[` at byte 1,994,264. Every index from 66 up is one lower
   * there than in the build first decoded here, so each number below had named the entry after it.
   *
   * ## Why nobody ever saw this control
   *
   * `SSe`'s update block (byte 1,924,167) gates the trigger — and ONLY it — on viewer-only mode:
   *
   * ```text
   * m(2), O(2, e.showZoomCtrl ? 2 : -1),                         // the zoom trio
   * m(),  O(3, e.appService.globals.viewerOnlyMode ? 3 : -1),     // THIS button
   * m(6), je('ngModel', e.audioVolume),
   * m(2), O(11, e.audioVolume > 0 ? 11 : -1),                     // Mute
   * m(),  O(12, 0 == e.audioVolume ? 12 : -1),                    // Unmute
   * m(3), O(15, e.mediaService.talkingUsers && e.mediaService.talkingUsers.length > 0 ? 15 : -1)
   * ```
   *
   * so no capture taken in a normal room could contain it. The MENU (const 90) carries no gate at
   * all — it is created unconditionally in `SSe`'s create block and hidden by Bootstrap's own
   * `.dropdown-menu { display: none }` until `.show` lands, which is why it is rendered here
   * unconditionally too.
   *
   * ## The traps, each reproduced deliberately
   *
   * - **The icon branches are STRICT** (`> 50`, `< 50 && > 4`, `< 4`), so at exactly 50 and exactly
   *   4 the button renders EMPTY. `volumeIcon()` in `#lib/screen-volume.js` owns it; the guard is
   *   `screen-cluster-v4-contract.test.ts` — `screen-volume-contract.test.ts` cannot run here.
   * - **`value="Presenter audiob"`** on the checkbox (const 111) is the reference's typo, reproduced
   *   the same way this codebase already reproduces `clas=` and `noboby`.
   * - **`audioMutedFor[userID]` is an object `{name}`**, so "muted" is a truthiness check and
   *   unmuting is a `delete`. See `#lib/screen-volume.js`.
   * - **Mute and Unmute are two separate gated buttons**, not one button with a swapped label:
   *   const 108 and const 109 differ only in their `title`, and each has its own click handler.
   *
   * `type="button"` is added to all three buttons, which the reference's consts omit. Same call as
   * `ScreenZoomControls.svelte` already makes for consts 97/101: a bare `<button>` defaults to
   * `submit`, and this cluster is one `<form>` away from being a live defect. Nothing else is
   * changed — every class, attribute, order and text node is the reference's, spaces included.
   */
  import PresenterMuteRows from '#lib/components/PresenterMuteRows.svelte';
  import { type PresenterAudioPreferences, type TalkingPresenter } from '#lib/screen-volume.js';

  type Props = {
    /**
     * `appService.globals.viewerOnlyMode` — the ONLY gate on the trigger.
     *
     * Sourced in `+page.svelte` from the `vo` query parameter, beside the `co` (`chatOnlyMode`) and
     * `dscreen` parameters that were already read there.
     */
    viewerOnlyMode: boolean;
    /** `audioVolume`, the component-level master volume. `this.audioVolume = 100` in the reference's constructor. */
    audioVolume: number;
    /** `mediaService.talkingUsers` — everyone with a microphone open right now. */
    talkingUsers: TalkingPresenter[];
    /** `preferences.audioMutedFor` / `preferences.audioVolumeFor`. */
    preferences: PresenterAudioPreferences;
    /** `sessData.individualVolumeControls` — the room setting that reveals the per-presenter slider. */
    individualVolumeControls: boolean;
    /** `adjustVol($event)` — the master slider's `change` and `input`. */
    onvolume: (value: number) => void;
    /** `mute()` — const 108's click. */
    onmute: () => void;
    /** `unmute()` — const 109's click. */
    onunmute: () => void;
    /** `toggleTalkingPresenter(user)` — the checkbox's `change`. */
    ontogglepresenter: (user: TalkingPresenter) => void;
    /** `adjustVolPres($event, user)` — the per-presenter slider's `change` and `input`. */
    onpresentervolume: (user: TalkingPresenter, rawValue: string) => void;
    /**
     * Whether the dropdown is open — the `.show` Bootstrap's JavaScript used to add, and which
     * nothing added here until 2026-08-29, so this control could not be opened at all. See
     * `bootstrap-dropdown-contract.test.ts`.
     */
    open: boolean;
    /** The trigger's click. Owned by `RoomMenus` so the window-click closer reaches this too. */
    ontoggle: () => void;
  };

  let {
    viewerOnlyMode,
    audioVolume,
    talkingUsers,
    preferences,
    individualVolumeControls,
    onvolume,
    onmute,
    onunmute,
    ontogglepresenter,
    onpresentervolume,
    open,
    ontoggle
  }: Props = $props();

  /**
   * The master slider is written through an attachment rather than `bind:value`, matching how the
   * navbar's copy of this slider already works in `+page.svelte`: the value is owned by the page
   * (and by the stored preference), and a two-way binding would let the element's own default win
   * on the first paint before the preference arrives.
   */
  function setRangeValue(value: number) {
    return (node: HTMLInputElement) => {
      node.value = String(value);
    };
  }
</script>

<!--
  Const 89, `pSe` at byte 1,921,142. Gated on `viewerOnlyMode` alone — `O(3, …viewerOnlyMode ? 3 : -1)`.
-->
{#if viewerOnlyMode}
  <button
    type="button"
    id="dropdownVolume"
    data-bs-toggle="dropdown"
    aria-expanded={open}
    class="btn btn-sm btn-dark"
    onclick={ontoggle}
  >
    <!--
      Three independent conditionals, exactly as `pSe` emits them. At audioVolume === 50 and
      audioVolume === 4 every branch is false and the button is empty; that is the reference's
      behaviour and `verify-screen-volume.mjs` renders both of those values to prove it.
    -->
    {#if audioVolume > 50}
      <i class="fas fa-volume-up"></i>
    {/if}
    {#if audioVolume < 50 && audioVolume > 4}
      <i class="fas fa-volume-down"></i>
    {/if}
    {#if audioVolume < 4}
      <i class="fas fa-volume-off"></i>
    {/if}
  </button>
{/if}

<!--
  Const 90. No gate in the reference: created unconditionally, hidden by `.dropdown-menu` until
  `.show` lands. Upstream Bootstrap's JavaScript adds that; this app ships none, so it comes from
  `RoomMenus` — as the navbar's twin of this control always did.
-->
<div
  aria-labelledby="dropdownVolume"
  class={open ? 'dropdown-menu volumeControl show' : 'dropdown-menu volumeControl'}
>
  <h4>
    {' Volume '}
    <!--
      Const 91 — a `span[data-bs-toggle=dropdown]` INSIDE the h4, which is how the reference closes
      the menu: toggling the same dropdown a second time collapses it. It carries no handler of its
      own (`d(7,'span',91), T(8,'i',92)` with no `x('click', …)`) because Bootstrap's JavaScript
      reads the attribute — and NOTHING reads it here, so this closed nothing until 2026-08-29.

      `ontoggle` rather than a bare close: the reference's mechanism IS a second toggle, and the
      menu is necessarily open when this is visible, so the two are the same act. The tag stays the
      reference's `<span>`; the `svelte-ignore`s record that rather than silence it.
    -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span data-bs-toggle="dropdown" class="float-right mr-2" onclick={ontoggle}>
      <i class="fas fa-times"></i>
    </span>
  </h4>
  <!--
    Const 93. `audioVolSlider` is a template-reference name in the reference (`['audioVolSlider','',…]`),
    which Angular consumes and never writes to the DOM; it is emitted here as the empty attribute the
    navbar copy already emits, so the two stay identical.
  -->
  <input
    audiovolslider=""
    type="range"
    min="0"
    max="100"
    title="Volume"
    class="mx-auto py-2 volCtrl"
    {@attach setRangeValue(audioVolume)}
    onchange={(event) => onvolume(Number(event.currentTarget.value))}
    oninput={(event) => onvolume(Number(event.currentTarget.value))}
  />
  <br />
  <!-- Const 94/108, `fSe` at byte 1,921,378 — rendered when `audioVolume > 0`. -->
  {#if audioVolume > 0}
    <button type="button" title="Mute Audio" class="btn btn-primary btn-sm" onclick={onmute}>
      {' Mute '}
    </button>
  {/if}
  <!-- Const 95/109, `mSe` at byte 1,921,503 — a SEPARATE gate on `0 == audioVolume`. -->
  {#if audioVolume === 0}
    <button type="button" title="Unmute Audio" class="btn btn-primary btn-sm" onclick={onunmute}>
      {' Unmute '}
    </button>
  {/if}
  <hr />
  <!--
    Const 96, byte 2,001,143. The overlay's `room-sound-options` holds ONE ROW PER TALKING
    PRESENTER and nothing else. The navbar's, at byte 2,540,026, holds the same rows FOLLOWED BY an
    `hr` and the six sound checkboxes, so the two are a superset and a subset of each other rather
    than alternatives — copying either one across renders the wrong control under the right class
    name.
  -->
  <div class="room-sound-options">
    <!--
      The rows are `PresenterMuteRows`, shared with the navbar dropdown: `vSe` (byte 1,922,302) and
      `T4e` (byte 2,483,243) render the same markup from the same consts; the navbar copy adds a
      trailing `hr`. `idPrefix` diverges — `screen-cluster-v4-contract.test.ts` says why and pins it.
    -->
    <PresenterMuteRows
      {talkingUsers}
      {preferences}
      {individualVolumeControls}
      idPrefix="screenTalkingPresenter"
      {ontogglepresenter}
      {onpresentervolume}
    />
  </div>
</div>
