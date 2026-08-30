<script lang="ts">
  /**
   * One row per talking presenter: a mute checkbox, the presenter's name, and — when the room turns
   * `individualVolumeControls` on — that presenter's own volume slider.
   *
   * ONE definition, TWO consumers, because the reference renders the identical markup in two places
   * and this repository had it in neither:
   *
   * | where | repeater | row | const table |
   * | --- | --- | --- | --- |
   * | the screen overlay's volume dropdown | `vSe` (`app-presentationarea.render-helpers.js:386-388`) | `bSe` (`:349-385`) | consts 111-115 (`app-presentationarea.compiled.js:2131-2169`) |
   * | the NAVBAR's volume dropdown | `b4e` (`app-room.render-helpers.js:1103-1106`) | `_4e` (`:1066-1102`) | consts 117, 201-204 (`app-room.compiled.js:1726, 2074-2111`) |
   *
   * The two const tables are the same values in the same order — `type=checkbox`,
   * `value="Presenter audiob"`, `title="Presenter audio"`, `form-check-input`; then
   * `form-check-label` with `for` and `ngClass`; then `mx-2 text-center` around
   * `mx-auto py-1 volCtrl`. Both repeaters track by `userID` (`NCe` / `qAe`) and both call the same
   * two handlers. So this is one control that appears twice, not two controls that look alike, and
   * `screen-volume-contract.test.ts` asserts the two decoded tables still agree.
   *
   * The ONE difference is what follows the rows: the navbar copy appends an `hr` inside the same
   * repeater (`b4e`: `ht(0, _4e, …), T(2, 'hr')`) and then the six sound checkboxes; the overlay
   * copy has nothing after them. That is the {@link Props.trailingRule} flag, and it is the whole
   * reason this component takes one.
   */
  import {
    isMutedFor,
    presenterRowId,
    presenterVolumeValue,
    type PresenterAudioPreferences,
    type TalkingPresenter
  } from '#lib/screen-volume.js';

  type Props = {
    /** `mediaService.talkingUsers` — everyone with a microphone open right now. */
    talkingUsers: TalkingPresenter[];
    /** `preferences.audioMutedFor` / `preferences.audioVolumeFor`. */
    preferences: PresenterAudioPreferences;
    /** `sessData.individualVolumeControls` — the gate on const 115 / const 204. */
    individualVolumeControls: boolean;
    /**
     * The `hr` the NAVBAR copy emits after the rows, which the overlay copy does not have.
     *
     * `b4e` is `ht(0, _4e, 7, 14, null, null, qAe), T(2, 'hr')`
     * (`app-room.render-helpers.js:1103-1106`): ONE `hr`, a SIBLING of the repeater rather than
     * part of it. It renders once per open dropdown, not once per row — and it renders at all only
     * because the whole of `b4e` is gated on `talkingUsers && talkingUsers.length > 0` at `:1436`,
     * which is what `{#if talkingUsers.length > 0}` reproduces here.
     */
    trailingRule?: boolean;
    /**
     * The `name`/`id`/`for` prefix. Defaults to the reference's own `talkingPresenter`.
     *
     * The overlay copy passes a different one. Both dropdowns are in the document at once in
     * viewer-only mode and the reference gives both the same ids, so upstream the overlay's labels
     * point at the navbar's checkboxes. See {@link presenterRowId} for the evidence and the reason
     * this one case diverges.
     */
    idPrefix?: string;
    /** `toggleTalkingPresenter(user)` — the checkbox's `change`. */
    ontogglepresenter: (user: TalkingPresenter) => void;
    /** `adjustVolPres($event, user)` — the slider's `change` and `input`. */
    onpresentervolume: (user: TalkingPresenter, rawValue: string) => void;
  };

  let {
    talkingUsers,
    preferences,
    individualVolumeControls,
    trailingRule = false,
    idPrefix = 'talkingPresenter',
    ontogglepresenter,
    onpresentervolume
  }: Props = $props();

  /**
   * `checked` and the slider's value are written through attachments rather than `bind:`, because
   * both are owned by the stored preference: the reference binds `checked` to
   * `audioMutedFor[userID]` (an object) and the slider to `audioVolumeFor[userID]`, and a two-way
   * binding would let the element's own default win before the preference is read back.
   */
  function setChecked(checked: boolean) {
    return (node: HTMLInputElement) => {
      node.checked = checked;
    };
  }

  function setRangeValue(value: number) {
    return (node: HTMLInputElement) => {
      node.value = String(value);
    };
  }
</script>

{#if talkingUsers.length > 0}
  {#each talkingUsers as user, index (user.userID)}
    {const muted = $derived(isMutedFor(preferences, user.userID))}
    {const rowId = $derived(presenterRowId(index, idPrefix))}
    <!-- Const 111 / 117 — `[1,'my-1']` in both tables. -->
    <div class="my-1">
      <!--
        Const 112 / 201, including the reference's `value="Presenter audiob"` typo. `checked` binds
        to the OBJECT at `audioMutedFor[userID]`, which the DOM coerces to a boolean.
      -->
      <input
        type="checkbox"
        value="Presenter audiob"
        title="Presenter audio"
        class="form-check-input"
        name={rowId}
        id={rowId}
        {@attach setChecked(muted)}
        onchange={() => ontogglepresenter(user)}
      />
      <!-- Const 113 / 202, with `ngClass` `{muted: audioMutedFor[userID]}`. -->
      <label class={['form-check-label', { muted }]} for={rowId}>
        {#if !muted}<span>Mute</span>{/if}
        {user.mediaValue.name}
        {#if muted}<span>Muted</span>{/if}
      </label>
    </div>
    <!-- Const 114 > 115 / 203 > 204, gated on the room's `individualVolumeControls`. -->
    {#if individualVolumeControls}
      <div class="mx-2 text-center">
        <input
          audiovolslider=""
          type="range"
          min="0"
          max="100"
          title="Volume"
          class="mx-auto py-1 volCtrl"
          {@attach setRangeValue(presenterVolumeValue(preferences, user.userID))}
          onchange={(event) => onpresentervolume(user, event.currentTarget.value)}
          oninput={(event) => onpresentervolume(user, event.currentTarget.value)}
        />
      </div>
    {/if}
  {/each}
  {#if trailingRule}
    <hr />
  {/if}
{/if}
