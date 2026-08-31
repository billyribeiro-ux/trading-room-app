<script lang="ts">
  import { removeScheduledAlertQuestion } from '#lib/scheduled-alert-table.js';
  import { REPEAT_MODES, REPEAT_MODE_LABEL, type RepeatMode } from '#lib/scheduled-alert.js';
  import ScheduledAlertsTable from './ScheduledAlertsTable.svelte';
  import {
    listScheduledAlerts,
    removeScheduledAlert,
    scheduleAlertLater
  } from '../../routes/scheduled-alerts.remote';

  /**
   * `hasAlertScheduler` — the send-later pane and the manage table, in one component.
   *
   * ## Why both halves are here rather than in two places
   *
   * The reference splits them — send-later fields live in `app-post-alert-modal`, the table in
   * `app-scheduled-alerts-modal` — and reaches the second from `manageScheduledAlerts()` on the
   * first. Keeping them together costs `PostAlertModal.svelte` a single insertion instead of two,
   * which matters because that file sits on its size ceiling; and the two halves share one question
   * — what is already scheduled — so splitting them would mean two components refetching the same
   * list and disagreeing about it after a removal.
   *
   * ## The body comes from the composer, and nothing else does
   *
   * `body` and `nonTradeAlert` are props because they are the composer's fields; everything else on
   * the reference's `alertMsgLater` payload is either owned here (the date, the repeat) or refused at
   * the boundary (`sendTxt`, `sendEmail`, `sendTweet`, `sendLaterAs*`, `dontCrossPost` — see
   * `routes/scheduled-alerts.remote.ts` for why each). The SENDER is never a field: it is taken from
   * the session on the server.
   *
   * ## The list is refetched, never spliced
   *
   * Upstream splices its local copy on removal (`globals.scheduledAlerts.splice(se, 1)`). This
   * refetches, because this repository's rule after a mutation is to reassign from the SERVER
   * response rather than from the local guess — a splice that succeeds against a delete that failed
   * leaves a presenter believing an alert is cancelled when it is still going to fire.
   */
  interface Props {
    /** PAM-11 — `bootbox.alert`, the room's own. This pane does not own the dialog stack. */
    onalert: (message: string) => void;
    /** PAM-11 — `bootbox.confirm`. The date is quoted back before anything is scheduled. */
    onconfirm: (message: string, accept: () => void) => void;
    /** The composer's alert text. Empty disables scheduling, exactly as it disables posting. */
    body: string;
    nonTradeAlert: boolean;
    /** Announced so the composer can clear itself, the same way a successful post does. */
    onscheduled?: () => void;
  }

  let { body, nonTradeAlert, onscheduled, onalert, onconfirm }: Props = $props();

  /**
   * The datetime-local value, as the browser gives it: `YYYY-MM-DDTHH:mm`, in the VIEWER's timezone.
   *
   * `new Date(string)` parses that form as LOCAL time, which is what a presenter means when they
   * pick 09:30 — so the conversion to the epoch millisecond the command takes is `.getTime()` and
   * nothing more. Writing an explicit `Z` here would silently move every schedule by the viewer's
   * offset, which is the mistake this sentence exists to prevent.
   */
  let sendOnLocal = $state('');
  let repeat = $state<RepeatMode>('');
  let ignoreWeekends = $state(false);
  let busy = $state(false);
  let problem = $state('');

  /** Open only on request — upstream's `manageScheduledAlerts()`, which is a click and not a load. */
  let managing = $state(false);
  let pending = $state.raw<
    {
      id: number;
      senderName: string;
      body: string;
      repeat: RepeatMode;
      ignoreWeekends: boolean;
      sendOn: number;
    }[]
  >([]);

  /*
    `$derived` and not an `$effect` that assigns: the button's state is a pure function of the three
    fields, and `effect-not-derived-contract.test.ts` is the gate that keeps that true.
  */
  const canSchedule = $derived(body.trim().length > 0 && sendOnLocal !== '' && !busy);
  /** `ignoreWeekends` is meaningless unless the series is daily — the composer's own rule. */
  const weekendsApply = $derived(repeat === 'daily');

  async function refresh() {
    pending = await listScheduledAlerts();
  }

  async function toggleManage() {
    managing = !managing;
    if (managing) await refresh();
  }

  /**
   * ── PAM-11 — SCHEDULING ASKS FIRST, and it used to happen on one click ────────────────────────
   *
   * ```js
   * bootbox.confirm("Send this alert on: " + o.toString() + ". send as: " + this.sendLaterAsNick +
   *   " (" + this.sendLaterAsEmail + ") ?", function(s){ if (s) { … sendServerCommand("alertMsgLater", r),
   *   bootbox.alert("Alert scheduled OK."), … } })
   * ```
   * (bytes 2,130,310 and 2,130,900.)
   *
   * The date is the whole reason for the question. A `datetime-local` field with a typo in it —
   * a month, a year, an AM for a PM — schedules an alert to the entire room at a time nobody meant,
   * and the only way to notice is to open the manage table afterwards and read it back. Asking
   * quotes the date in prose, which is where a wrong one is visible.
   *
   * ## The identity clause is REMOVED, and that is PAM-10's refusal reaching this sentence
   *
   * Upstream's question ends *"send as: <nick> (<email>) ?"*, because its form lets a presenter
   * post an alert under someone else's name and address. This room refuses those two fields —
   * `sendLaterAsNick` / `sendLaterAsEmail` are not on the wire and the server derives the sender
   * from the session — so the clause would be quoting values that cannot vary. Naming them would
   * imply a choice the presenter does not have.
   *
   * `onconfirm` and `onalert` are the room's own dialog primitives, passed in for the reason every
   * other component here takes them: this pane does not own the dialog stack, and two components
   * raising bootboxes from different places is how one replaces the other mid-read.
   */
  async function schedule() {
    if (!canSchedule) return;
    onconfirm(`Send this alert on: ${new Date(sendOnLocal).toString()} ?`, () => {
      void send();
    });
  }

  async function send() {
    busy = true;
    problem = '';
    try {
      await scheduleAlertLater({
        body: body.trim(),
        nonTradeAlert,
        repeat,
        ignoreWeekends,
        sendOn: new Date(sendOnLocal).getTime()
      });
      sendOnLocal = '';
      repeat = '';
      ignoreWeekends = false;
      if (managing) await refresh();
      // `bootbox.alert("Alert scheduled OK.")` — verbatim, including the full stop the room's own
      // lock sentences do not have.
      onalert('Alert scheduled OK.');
      onscheduled?.();
    } catch (error) {
      /*
        The server's own words, shown rather than swallowed. `scheduleAlertLater` refuses a past date
        with 400 and a room without the setting with 403; a silent failure here would leave a
        presenter believing an alert is scheduled that is not, which is the worst outcome this
        feature has.
      */
      problem = error instanceof Error ? error.message : 'The alert could not be scheduled.';
    } finally {
      busy = false;
    }
  }

  /**
   * SCH-01 — Remove ASKS, and it quotes the alert it is about to destroy.
   *
   * `onconfirm` is the room's own dialog primitive, the same one PAM-11 uses two functions up and for
   * the same recorded reason: this pane does not own the dialog stack. The question itself is
   * `#lib/scheduled-alert-table.ts`, where the capture's punctuation is argued and pinned.
   */
  function requestRemove(row: { id: number; senderName: string; body: string }) {
    onconfirm(removeScheduledAlertQuestion(row.senderName, row.body), () => {
      void remove(row.id);
    });
  }

  async function remove(id: number) {
    try {
      await removeScheduledAlert({ id });
      await refresh();
    } catch (error) {
      problem = error instanceof Error ? error.message : 'The alert could not be removed.';
    }
  }
</script>

<section class="scheduler">
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

  <div class="row">
    <button type="button" onclick={schedule} disabled={!canSchedule}>
      {busy ? 'Scheduling…' : 'Schedule alert'}
    </button>
    <button type="button" class="link" onclick={toggleManage}>
      {managing ? 'Hide scheduled' : 'Manage scheduled'}
    </button>
  </div>

  {#if problem}
    <p class="problem" role="alert">{problem}</p>
  {/if}

  {#if managing}
    {#if pending.length === 0}
      <p class="empty">Nothing is scheduled.</p>
    {:else}
      <ScheduledAlertsTable rows={pending} onremove={requestRemove} />
    {/if}
  {/if}
</section>

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

  .scheduler {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgb(0 0 0 / 0.15);
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
  .link {
    background: none;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
  }
  .problem {
    margin: 0;
    color: #b00020;
    font-size: 0.8rem;
  }
  .empty {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.7;
  }
</style>
