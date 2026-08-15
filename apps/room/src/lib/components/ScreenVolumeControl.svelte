<script lang="ts">
  /**
   * The zoom-overlay volume dropdown — `#dropdownVolume` as `app-presentationarea` renders it,
   * which is NOT the one in the main navbar.
   *
   * There are two `#dropdownVolume` triggers in the reference and they are different controls:
   *
   * | variant | const | where |
   * | --- | --- | --- |
   * | `["id","dropdownVolume","data-bs-toggle","dropdown",1,"nav-link","d-flex","align-items-center"]` | app-room 104 | the navbar — already built, `+page.svelte:6824` |
   * | `["id","dropdownVolume","data-bs-toggle","dropdown",1,"btn","btn-sm","btn-dark"]` | app-presentationarea 90 | HERE, the screen tab bar's `ms-auto` cluster |
   *
   * Decoded from `docs/source/components/app-presentationarea.render-helpers.js:264-459`
   * (`cSe`/`dSe`/`uSe`, `hSe`, `pSe`/`fSe`, `mSe`/`gSe`, `_Se`, `bSe`, `vSe`, `CSe`) against that
   * component's const table at `app-presentationarea.compiled.js:2088-2169`.
   *
   * ## Why nobody ever saw this control
   *
   * `CSe`'s update block gates the trigger — and ONLY the trigger — on viewer-only mode:
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
   * so no capture taken in a normal room could contain it. The MENU (const 91) carries no gate at
   * all — it is created unconditionally in `CSe`'s create block and hidden by Bootstrap's own
   * `.dropdown-menu { display: none }` until `.show` lands, which is why it is rendered here
   * unconditionally too.
   *
   * ## The traps, each reproduced deliberately
   *
   * - **The icon branches are STRICT** (`> 50`, `< 50 && > 4`, `< 4`), so at exactly 50 and exactly
   *   4 the button renders EMPTY. `volumeIcon()` in `$lib/screen-volume` owns that and
   *   `screen-volume-contract.test.ts` fails if anyone relaxes a bound.
   * - **`value="Presenter audiob"`** on the checkbox (const 112) is the reference's typo, reproduced
   *   the same way this codebase already reproduces `clas=` and `noboby`.
   * - **`audioMutedFor[userID]` is an object `{name}`**, so "muted" is a truthiness check and
   *   unmuting is a `delete`. See `$lib/screen-volume`.
   * - **Mute and Unmute are two separate gated buttons**, not one button with a swapped label:
   *   const 109 and const 110 differ only in their `title`, and each has its own click handler.
   *
   * `type="button"` is added to all three buttons, which the reference's consts omit. Same call as
   * `ScreenZoomControls.svelte` already makes for consts 98/102: a bare `<button>` defaults to
   * `submit`, and this cluster is one `<form>` away from being a live defect. Nothing else is
   * changed — every class, attribute, order and text node is the reference's, spaces included.
   */
  import PresenterMuteRows from '$lib/components/PresenterMuteRows.svelte';
  import { type PresenterAudioPreferences, type TalkingPresenter } from '$lib/screen-volume';

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
    /** `mute()` — const 109's click. */
    onmute: () => void;
    /** `unmute()` — const 110's click. */
    onunmute: () => void;
    /** `toggleTalkingPresenter(user)` — the checkbox's `change`. */
    ontogglepresenter: (user: TalkingPresenter) => void;
    /** `adjustVolPres($event, user)` — the per-presenter slider's `change` and `input`. */
    onpresentervolume: (user: TalkingPresenter, rawValue: string) => void;
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
    onpresentervolume
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
  Const 90. Gated on `viewerOnlyMode` alone — `O(3, e.appService.globals.viewerOnlyMode ? 3 : -1)`.
-->
{#if viewerOnlyMode}
  <button type="button" id="dropdownVolume" data-bs-toggle="dropdown" class="btn btn-sm btn-dark">
    <!--
      Three independent conditionals, exactly as `hSe` emits them. At audioVolume === 50 and
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

<!-- Const 91. No gate in the reference; Bootstrap's `.dropdown-menu` hides it until `.show`. -->
<div aria-labelledby="dropdownVolume" class="dropdown-menu volumeControl">
  <h4>
    Volume
    <!--
      Const 92 — a `span[data-bs-toggle=dropdown]` INSIDE the h4, which is how the reference closes
      the menu: toggling the same dropdown a second time collapses it. It carries no handler of its
      own (`d(7,'span',92), T(8,'i',93)` with no `x('click', …)`).
    -->
    <span data-bs-toggle="dropdown" class="float-right mr-2">
      <i class="fas fa-times"></i>
    </span>
  </h4>
  <!--
    Const 94. `audioVolSlider` is a template-reference name in the reference (`['audioVolSlider','',…]`),
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
  <!-- Const 95/109 — rendered when `audioVolume > 0`. -->
  {#if audioVolume > 0}
    <button type="button" title="Mute Audio" class="btn btn-primary btn-sm" onclick={onmute}>
      Mute
    </button>
  {/if}
  <!-- Const 96/110 — rendered when `0 == audioVolume`. A separate gate, not an `{:else}`. -->
  {#if audioVolume === 0}
    <button type="button" title="Unmute Audio" class="btn btn-primary btn-sm" onclick={onunmute}>
      Unmute
    </button>
  {/if}
  <hr />
  <!--
    Const 97. The overlay's `room-sound-options` holds ONE ROW PER TALKING PRESENTER and nothing
    else. The navbar's `room-sound-options` holds the same rows FOLLOWED BY an `hr` and the six
    sound checkboxes (`app-room.render-helpers.js:1224-1279`), so the two are a superset and a
    subset of each other rather than alternatives — copying either one across renders the wrong
    control under the right class name.
  -->
  <div class="room-sound-options">
    <!--
      The rows are `PresenterMuteRows`, shared with the navbar dropdown: `bSe` and `_4e` render the
      same markup from the same const values, and the navbar copy adds a trailing `hr` this one does
      not have.
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
