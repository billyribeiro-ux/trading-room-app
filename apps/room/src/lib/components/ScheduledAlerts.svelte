<script lang="ts">
  import { removeScheduledAlertQuestion } from '#lib/scheduled-alert-table.js';
  import { type RepeatMode } from '#lib/scheduled-alert.js';
  import ScheduledAlertFields from './ScheduledAlertFields.svelte';
  import Modal from './Modal.svelte';
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

  async function refresh() {
    pending = await listScheduledAlerts();
  }

  /*
    `SCH-07` — OPENS, and no longer toggles.

    The reference's control is `data-bs-toggle="modal" data-bs-target="#scheduledAlertsModal"`: it
    opens a dialog, and a dialog is closed from inside it. Toggling was a consequence of rendering
    the table inline, which is the divergence this row closed.
  */
  async function openManage() {
    managing = true;
    await refresh();
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
  <ScheduledAlertFields bind:sendOnLocal bind:repeat bind:ignoreWeekends {busy} />

  <div class="row">
    <button type="button" onclick={schedule} disabled={!canSchedule}>
      {busy ? 'Scheduling…' : 'Schedule alert'}
    </button>
    <!--
      `XTe`, consts 74 and 75 — the reference's own control for this, transcribed 2026-09-01.

      ```js
      function XTe(t,n){ … d(0,"button",74), x("click", () => manageScheduledAlerts()),
                         T(1,"i",75), v(2," See Scheduled Alerts ") … }
      74 ["data-bs-toggle","modal","data-bs-target","#scheduledAlertsModal",1,"btn",
          "btn-outline-success","mx-1",3,"click"]
      75 [1,"fas","fa-calendar"]
      ```

      This read `Manage scheduled` / `Hide scheduled` on a `class="link"` button — the same function
      under a label and a shape nobody had checked against the dump. The label, the classes and the
      icon are the reference's now, spaces included, and the `.link` rule went with its only wearer:
      `svelte-check` reported it unused within the minute, which is the orphan half of the same rule
      that forbids a class with no CSS.

      TWO things are still not the reference and both are structural rather than cosmetic. Its
      control opens a MODAL (`#scheduledAlertsModal`) where this pane shows the table INLINE, so the
      button toggles rather than opens; and the label does not flip, because a control that opens a
      modal has nothing to say about closing one. The `data-bs-*` pair is carried anyway — inert,
      since Bootstrap's JavaScript is not loaded in this application — so the attribute a reader
      greps for is where the dump puts it.
    -->
    <button
      type="button"
      data-bs-toggle="modal"
      data-bs-target="#scheduledAlertsModal"
      class="btn btn-outline-success mx-1"
      onclick={openManage}
    >
      <i class="fas fa-calendar"></i>{' See Scheduled Alerts '}
    </button>
  </div>

  {#if problem}
    <p class="problem" role="alert">{problem}</p>
  {/if}
</section>

<!--
  `SCH-07` — the reference's SECOND modal, which this pane had been rendering as an inline table.

  Const 0 of `app-scheduled-alerts` (byte 2,407,520) is
  `["id","scheduledAlertsModal","tabindex","-1","aria-labelledby","scheduledAlertsModalLabel",
  "aria-hidden","true",1,"modal","fade","text-white"]`, its dialog is `modal-dialog modal-xl`, its
  title `h5.modal-title#scheduledAlertsModalLabel` reads `v(5," Manage Scheduled Alerts ")`, and its
  footer button is `["type","button","data-bs-dismiss","modal",1,"btn","btn-primary"]` with
  `v(26," Close ")`.

  `Modal` is the project's own primitive and already renders exactly that chrome, so reusing it is
  what keeps the focus trap, the `inert` handling and `ASR-3`'s focus-on-open rather than making a
  second copy of all three. `aria-hidden` is the creation-time value — `closedAriaHidden` — for the
  reason `MTS-06`/`MSM-02`/`NTC-3` were disposed on.

  The full argument, the circular refusal it replaces, and the table-class measurement are in
  `room-surface-audit-2026-08-31-contract.test.ts` where they are asserted.
-->
<Modal
  id="scheduledAlertsModal"
  open={managing}
  ariaLabelledby="scheduledAlertsModalLabel"
  rootClass="modal fade text-white"
  dialogClass="modal-xl"
  title=" Manage Scheduled Alerts "
  titleId="scheduledAlertsModalLabel"
  titleClass="modal-title"
  onclose={() => (managing = false)}
  {footer}
>
  {#if pending.length === 0}
    <p class="empty">Nothing is scheduled.</p>
  {:else}
    <ScheduledAlertsTable rows={pending} onremove={requestRemove} />
  {/if}
</Modal>

{#snippet footer()}
  <button
    type="button"
    data-bs-dismiss="modal"
    class="btn btn-primary"
    onclick={() => (managing = false)}>{' Close '}</button
  >
{/snippet}

<style>
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
