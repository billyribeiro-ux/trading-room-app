<script lang="ts">
  import { REPEAT_MODES, type RepeatMode } from '#lib/scheduled-alert.js';
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
    /** The composer's alert text. Empty disables scheduling, exactly as it disables posting. */
    body: string;
    nonTradeAlert: boolean;
    /** Announced so the composer can clear itself, the same way a successful post does. */
    onscheduled?: () => void;
  }

  let { body, nonTradeAlert, onscheduled }: Props = $props();

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

  async function schedule() {
    if (!canSchedule) return;
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

  async function remove(id: number) {
    try {
      await removeScheduledAlert({ id });
      await refresh();
    } catch (error) {
      problem = error instanceof Error ? error.message : 'The alert could not be removed.';
    }
  }

  /** `{{ sendOn | date:'short' }}` in the reference's own table. */
  const shortDate = (epochMs: number) =>
    new Date(epochMs).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
</script>

<section class="scheduler">
  <div class="row">
    <label class="field">
      <span>Send on</span>
      <input type="datetime-local" bind:value={sendOnLocal} disabled={busy} />
    </label>

    <label class="field">
      <span>Repeat</span>
      <select bind:value={repeat} disabled={busy}>
        {#each REPEAT_MODES as mode (mode)}
          <!-- `e.repeat || "off"` — the reference labels the empty string this way in its own table. -->
          <option value={mode}>{mode || 'off'}</option>
        {/each}
      </select>
    </label>

    {#if weekendsApply}
      <label class="check">
        <input type="checkbox" bind:checked={ignoreWeekends} disabled={busy} />
        <span>Skip weekends</span>
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
      <div class="scroll">
        <table>
          <thead>
            <tr><th>Sends</th><th>By</th><th>Alert</th><th>Repeat</th><th></th></tr>
          </thead>
          <tbody>
            {#each pending as row (row.id)}
              <tr>
                <td>{shortDate(row.sendOn)}</td>
                <td>{row.senderName}</td>
                <td class="body">{row.body}</td>
                <td>
                  {row.repeat || 'off'}
                  <!-- The reference shows this badge only for a daily series that skips weekends. -->
                  {#if row.repeat === 'daily' && row.ignoreWeekends}
                    <span class="badge">no weekends</span>
                  {/if}
                </td>
                <td><button type="button" onclick={() => remove(row.id)}>Remove</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</section>

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
  /* Wide content scrolls inside its own container so the modal never scrolls sideways. */
  .scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.2rem 0.4rem;
    border-bottom: 1px solid rgb(0 0 0 / 0.08);
  }
  .body {
    max-width: 18rem;
    overflow-wrap: anywhere;
  }
  .badge {
    padding: 0 0.3rem;
    border-radius: 3px;
    background: #f0c040;
    font-size: 0.7rem;
  }
</style>
