<script lang="ts">
  import { REPEAT_MODES, REPEAT_MODE_LABEL, type RepeatMode } from '#lib/scheduled-alert.js';

  /**
   * PAM-07, PAM-08 and PAM-09 — the send-later FIELDS: when, how often, and whether weekends count.
   *
   * ## Why it is its own component
   *
   * `ScheduledAlerts.svelte` reached 342 lines against a ceiling of 320 when `XTe`'s "See Scheduled
   * Alerts" control was transcribed on 2026-09-01, and `source-size-contract`'s instruction at that
   * point is *extract, do not raise*. The seam it offers is the one upstream already draws: the
   * fields belong to `app-post-alert-modal`'s send-later block, and the table below them is a
   * separate component entirely (`app-scheduled-alerts-modal`). Splitting here follows the
   * reference rather than cutting across it — the same argument `NavbarTalkingIndicator` makes.
   *
   * ## The three values are `$bindable`, and the parent still owns them
   *
   * Svelte's own guidance is that bindings are for *"custom input components"* and should be used
   * *"sparingly and carefully"*. This is exactly that case: three form controls whose values the
   * parent must read to build the `alertMsgLater` payload. The alternative — three change callbacks
   * — would be more code saying the same thing, and would put the parent's state one render behind
   * the input on every keystroke.
   *
   * `weekendsApply` is derived HERE rather than passed in, because it is a pure function of
   * `repeat` and this component owns that field now. A prop would be a second copy of a fact the
   * child can compute, and copies drift.
   */
  interface Props {
    /**
     * The datetime-local value, as the browser gives it: `YYYY-MM-DDTHH:mm`, in the VIEWER's
     * timezone. The conversion to the epoch millisecond the command takes is the parent's, and the
     * reasoning for `.getTime()` with no explicit `Z` is recorded there.
     */
    sendOnLocal: string;
    repeat: RepeatMode;
    ignoreWeekends: boolean;
    /** Every control is disabled while a schedule is in flight, as the parent's button is. */
    busy: boolean;
  }

  let {
    sendOnLocal = $bindable(),
    repeat = $bindable(),
    ignoreWeekends = $bindable(),
    busy
  }: Props = $props();

  /** `ignoreWeekends` is meaningless unless the series is daily — the composer's own rule. */
  const weekendsApply = $derived(repeat === 'daily');
</script>

<!--
  ── PAM-09 — THE NOTE, and it answers the question the form otherwise raises ──────────────────

  ```js
  d(4,"label",59), v(5,"NOTE: All times should be on "),
    d(6,"span",60), v(7,"your local time zone")
  59  [1,"mb-3","mt-1"]      60  [2,"text-decoration","underline"]
  ```
  (byte 2,120,860.) A `datetime-local` input has no timezone in it, so a presenter scheduling an
  alert for 09:00 has no way to know whose 09:00 it is — theirs, the server's, or the room's. The
  reference answers that before it is asked, and underlines the answer. The room stores an epoch
  and `scheduled-alert.ts` fires on it, so the note is TRUE here as well as transcribed.
-->
<p class="mb-3 mt-1">
  NOTE: All times should be on
  <span style="text-decoration: underline">your local time zone</span>
</p>
<div class="row">
  <div class="field">
    <!--
      PAM-09 — `d(8,"label",61), v(9,"Send on this date & time:")`, const 61 `[1,"me-1"]`, and the
      field is
      `["type","datetime-local","id","alert-send-later-time","name","alert-send-later-time",3,…]`
      at byte 2,135,612 — `id` and `name`, both the same string.

      ## The id is TRANSCRIBED since 2026-09-01, and the reason it was not is worth keeping

      This wrapped the input in its `<label>`, which associates the two without an id at all, and
      the const sweep recorded that as *"a better association, not a missing one"*. Both are valid
      and the wrap is arguably the more robust — but "better" is a preference, and the decision here
      is to match the dump wherever matching is possible rather than wherever it is preferable.

      It IS possible: `PostAlertModal` is mounted at one site, gated on `name === 'alert'`, so the
      id is document-unique exactly as it is upstream. That is the same measurement that let the two
      note-modal titles take their captured ids — and the same one that keeps the Giphy modal's,
      whose picker is mounted four times, out.
    -->
    <label class="me-1" for="alert-send-later-time">Send on this date &amp; time:</label>
    <input
      type="datetime-local"
      id="alert-send-later-time"
      name="alert-send-later-time"
      bind:value={sendOnLocal}
      disabled={busy}
    />
  </div>

  <!--
    PAM-11 — THE REPEAT ROW'S OWN CLASSES, TRANSCRIBED 2026-09-01, AND THE SWEEP COULD NOT SEE THEM.

    ```js
    d(11,"div",63)(12,"label",64), v(13,"Repeat:"), u(), d(14,"select",65)
    63  [1,"form-group","d-flex","align-items-center","justify-content-between"]
    64  [1,"m-0","me-1"]
    65  ["aria-label","Repeat Scheduled Alert",1,"form-select","form-select-sm",3,"ngModelChange","ngModel"]
    ```

    The select shipped here with NO classes at all, so it rendered as the browser's default control
    beside two Bootstrap-styled siblings. `reference-const-coverage-contract` cannot report this:
    it is a substring search over the whole application, and `form-select`, `d-flex` and `m-0` all
    occur elsewhere in this room, so a value can be missing from THIS component while the sweep
    counts it present. That limitation is recorded in the sweep itself; this is what finding one
    looks like — a per-component read, which is what `todo-next.md`'s surface audit is for.

    Every one of the seven resolves in `css/complete-app-styles.css`, asserted rather than assumed.

    ## The wrap survives, and the classes move onto it

    Upstream's structure is `div > label + select` with the label carrying no `for` and the select no
    `id`, so upstream's Repeat label is UNASSOCIATED — recorded, with its negative control, when
    PAM-08 and PAM-09 took their captured ids earlier today. Keeping our `<label>` as the row and
    putting const 64 on the inner `<span>` gives the identical box model (a label is display:flex
    here either way), carries every captured class, keeps the association, and invents no `id` that
    the reference does not have. That last clause is the constraint: a `for`/`id` pair here would be
    transcribing something that is not in the dump.
  -->
  <label class="form-group d-flex align-items-center justify-content-between">
    <span class="m-0 me-1">Repeat:</span>
    <!--
      PAM-07 — THE OPTIONS ARE LABELLED, and ours rendered the wire values.

      ```js
      d(15,"option",66), v(16,"Off"), d(17,"option",67), v(18,"Daily"),
      d(19,"option",68), v(20,"Weekly")
      66 ["selected","","value",""]   67 ["value","daily"]   68 ["value","weekly"]
      ```
      The VALUES stay `''` / `daily` / `weekly` — they are what crosses the wire and what
      `isRepeatMode` refuses anything else against — and only the TEXT changes. A select whose
      options read "off", "daily", "weekly" is a control showing its own storage format; the
      empty-string mode reading "off" in the manage table below is the reference's own labelling
      of the same value and stays as it is, because that table is a different node upstream too.
    -->
    <select
      aria-label="Repeat Scheduled Alert"
      class="form-select form-select-sm"
      bind:value={repeat}
      disabled={busy}
    >
      {#each REPEAT_MODES as mode (mode)}
        <option value={mode}>{REPEAT_MODE_LABEL[mode]}</option>
      {/each}
    </select>
  </label>

  {#if weekendsApply}
    <!--
      PAM-08 — `v(3,"Ignore weekends?")` at byte 2,120,631; ours read "Skip weekends".

      ```js
      ["type","checkbox","id","ignoreWeekendsChk",1,"form-check-input",3,"ngModelChange",…]
      ["for","ignoreWeekendsChk"]                                        // byte 2,136,186
      ```

      Un-wrapped and given the captured id for the reason the date field above records, and since
      2026-09-01 the WRAPPER is the reference's own too: const 69 is `[1,"form-check","mb-2"]`, and
      both rules are in `css/complete-app-styles.css`. This carried a local `.check` flex row until
      that was measured — the note here said the sheet "does not implement" the captured pair, which
      was never checked and is false. `form-check` + `form-check-input` is the pairing Bootstrap's
      own float-and-negative-margin layout needs, so the local rule was not equivalent either.
    -->
    <div class="form-check mb-2">
      <input
        type="checkbox"
        id="ignoreWeekendsChk"
        class="form-check-input"
        bind:checked={ignoreWeekends}
        disabled={busy}
      />
      <label for="ignoreWeekendsChk">Ignore weekends?</label>
    </div>
  {/if}
</div>

<style>
  /*
    THREE RULES LEFT THIS BLOCK ON 2026-09-01, AND THE REASON THEY WERE HERE WAS UNCHECKED.

    It read: *"this sheet is scoped, so they are written as rules rather than as bootstrap utility
    classes the rest of this component does not use either."* Both halves are false. Svelte's scoping
    ADDS a hash class, it does not strip global ones, so `mb-3` still resolves from
    `css/complete-app-styles.css` on a scoped element; and the component now uses seven of those
    utilities, because the reference does.

    So `.tz-note` (const 59, `mb-3 mt-1`), `.tz-underline` (const 60, an inline
    `text-decoration:underline` — a `2,` entry is a STYLE, not a class) and `.check` (const 69,
    `form-check mb-2`) are gone, replaced by the captured values themselves. Hand-computed
    equivalents are how a sheet drifts from the capture it was derived from.

    `.row` and `.field` STAY and are this component's own: the reference has no counterpart for
    either — its three controls are siblings inside `app-post-alert-modal`'s footer form rather than
    a row of their own — so these are the layout that makes an extracted component sit correctly, not
    a substitute for something captured.
  */
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.5rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.8rem;
  }
</style>
