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
<p class="tz-note">
  NOTE: All times should be on <span class="tz-underline">your local time zone</span>
</p>
<div class="row">
  <label class="field">
    <!-- PAM-09 — `d(8,"label",61), v(9,"Send on this date & time:")`, const 61 `[1,"me-1"]`. -->
    <span>Send on this date &amp; time:</span>
    <input type="datetime-local" bind:value={sendOnLocal} disabled={busy} />
  </label>

  <label class="field">
    <!-- PAM-09 — `d(12,"label",64), v(13,"Repeat:")`, const 64 `[1,"m-0","me-1"]`. -->
    <span>Repeat:</span>
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
    <select aria-label="Repeat Scheduled Alert" bind:value={repeat} disabled={busy}>
      {#each REPEAT_MODES as mode (mode)}
        <option value={mode}>{REPEAT_MODE_LABEL[mode]}</option>
      {/each}
    </select>
  </label>

  {#if weekendsApply}
    <label class="check">
      <input type="checkbox" bind:checked={ignoreWeekends} disabled={busy} />
      <!-- PAM-08 — `v(3,"Ignore weekends?")` at byte 2,120,631. Ours read "Skip weekends". -->
      <span>Ignore weekends?</span>
    </label>
  {/if}
</div>

<style>
  /*
    PAM-09's note. `mb-3 mt-1` on the label and `text-decoration: underline` on the span are the
    reference's own consts 59 and 60; this sheet is scoped, so they are written as rules rather than
    as bootstrap utility classes the rest of this component does not use either.
  */
  .tz-note {
    margin: 0.25rem 0 1rem;
  }

  .tz-underline {
    text-decoration: underline;
  }

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
  .check {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
  }
</style>
