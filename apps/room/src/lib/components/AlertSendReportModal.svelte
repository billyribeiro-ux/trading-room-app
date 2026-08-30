<script lang="ts">
  import Modal from '#lib/components/Modal.svelte';

  /*
    ════ THE ALERT SENT REPORT MODAL — a whole surface, and a whole refusal ═══════════════════════

    `<app-alert-send-report-modal>`, lifted out of `ModalHost.svelte` when RPT-01 through RPT-08
    were dispositioned. It is its own file for the reason the size ratchet asks for and not merely
    to satisfy it: **the argument below is longer than the markup it explains**, and an argument
    that long about one surface is a document, which is exactly the shape `source-size-contract`
    means when it says to move an explanation to the code it explains rather than shorten it.

    Two props. `open` is the only thing the host still decides, and `targetMessage` is the alert the
    report would have been about. Nothing else crosses, because nothing else is needed — which is
    itself the measurement: a modal that fetched a report would need a loader, an error, a search
    term, a status filter and a row list, and it needs none of them.
  */

  interface Props {
    /** `name === 'report'` on the host. This component decides nothing about which modal is open. */
    open: boolean;
    /**
     * The alert this report would be about, or null.
     *
     * Only `id` is read — it is upstream's `alertID`, bound into the title as
     * `Ne("Alert Sent Report. AlertID: ", o.alertID, "")` at bundle byte 2,415,600 — but the shape
     * is the host's `targetMessage` so the two cannot get out of step over an optional field.
     */
    targetMessage: { id: number } | null;
    onclose: () => void;
  }

  let { open, targetMessage, onclose }: Props = $props();

  /**
   * What this modal says instead of a report — RPT-01 through RPT-07.
   *
   * OURS, and deliberately not the reference's `No Reports.`: that string means "the fetch came
   * back empty", and there is no fetch. Sibling to `SYNC_ROOMS_UNAVAILABLE` in `ModalHost.svelte`
   * in wording as well as in role — name the thing that is missing, not the feature that is absent,
   * so a reader can tell an unbuilt surface from a surface whose backing service this deployment
   * does not run.
   */
  const REPORT_UNAVAILABLE =
    'Delivery reporting is not available here: this room records no per-recipient delivery for an alert, so there is nothing to report on.';

  /**
   * RPT-08's refusal string, verbatim — shown when the modal is open over a message with no id.
   *
   * `openAlertSendReport(e){e?…emit("doAlertSendReportModal",e):bootbox.alert("No reports found.")}`
   * at bundle byte 1,349,819 (the audit row cites 1,349,868, which is mid-method). Upstream refuses
   * at the ENTRY POINT and never opens the modal; this room opens it from `message-actions`, which
   * that change did not own, so the refusal lands one step later — inside the dialog rather than
   * instead of it. That is HALF of the row and it is marked as half: what is reproduced is the
   * message a presenter reads, not the guard that stops the dialog appearing.
   *
   * Before this, an id-less report opened a dialog titled `Alert Sent Report. AlertID: ` — a real
   * heading with an empty identifier, which reads as a report about nothing rather than as a
   * refusal.
   */
  const NO_REPORTS_FOUND = 'No reports found.';
</script>

<app-alert-send-report-modal>
  <Modal
    id="alert-send-report-modal"
    {open}
    ariaLabelledby="alert-send-report-modal"
    title={`Alert Sent Report. AlertID: ${targetMessage?.id ?? ''}`}
    {onclose}
    footerClass="text-center"
  >
    <!--
      ════ RPT-01, RPT-03, RPT-04, RPT-05, RPT-06, RPT-07 — ONE MEASURED REFUSAL ══════════════════

      Six audit rows name six controls of the reference's `app-alert-send-report-modal`, and all six
      rest on the same thing: a list of per-recipient DELIVERY RECORDS for one alert. This
      application has none, anywhere, and that is measured rather than assumed.

      ## What the reference actually renders, read end to end

      The whole component sits at bundle bytes 2,408,900-2,416,400 and was decoded in full for this
      refusal — the pipe, the three row templates, the class, and the consts table.

        loadReports()      2,413,317  invokeAdminCmd("getAlertReport", { alertID }) → resp.queue,
                                      then calcPieData(reports); the catch sets
                                      loadingError = "There was an error loading the report."
        xMe                2,410,281  one row: ngClass over {"text-success": status==="sent",
                                      "text-danger": "failed", "text-warning": "queued"},
                                      `<strong>{name}&nbsp;</strong><i>({email})</i>`, a
                                      `.sent-time` block with `{sentTime|date:'medium'}` and
                                      `Latency: {latency} secs`, a `.failed-reason` with
                                      `{failReason}`, and a click → showTokenReport(row.token)
        searchReports      2,409,220  a pure pipe: filter by `status === searchStatus`, then by
                                      `email.toLowerCase().includes(searchTxt)`
        the <select>       2,414,516  consts 18-21: All / sent / queued / failed
        calcPieData        2,412,738  counts sent/failed/queued, turns each into a percentage, and
                                      hands them to `$.plot("#pie-container", …)` — jQuery flot
        showTokenReport    2,413,317  bootbox.alert({ title: "Token", message: token })

      Every field on a row — `status`, `name`, `email`, `sentTime`, `latency`, `failReason`,
      `token` — is a fact about ONE ATTEMPT TO DELIVER ONE ALERT TO ONE PERSON.

      ## What this product has instead, measured

      **No table records a delivery.** The schema is 24 tables (`services/api/migrations/**`,
      `CREATE TABLE public.*`): alert_media, alert_questions, alerts, audit_log, enterprises, files,
      follows, invite_tokens, member_notes, message_reactions, messages, mutes, note_versions,
      notes, poll_responses, polls, private_messages, refresh_tokens, room_channels, room_members,
      room_state, rooms, users. Searched for `queue`, `latency`, `fail_reason`, `sent_time`,
      `delivery`: the only hits are `alerts.dispatch` and two prose lines in a migration comment.

      **`alerts.dispatch` is the REQUEST, not the outcome.** It is a jsonb object constrained to
      exactly five booleans — sms, email, twitter, push, crossPost — recording which channels the
      presenter TICKED. There is no per-recipient row, no status, and no timestamp behind it.

      **Nothing sends an alert to anyone.** `apps/room/src/lib/server` contains no mail transport at
      all; the only one in the product is the controller's `mail.ts`, whose two callers are
      `email-verification.ts` and `member-email.ts` (welcome + webinar reminder). Neither is an
      alert, and `member-email.ts` records that as of its own commit nothing can be sent — there is
      no provider account.

      **And `getAlertReport` has no server half**: zero occurrences across `apps/`, and no endpoint
      under `src/routes/api`.

      So the queue this modal is a view onto does not exist, is not written anywhere, and has no
      producer. Building the rows, the search box, the status select, the pie and the token dialog
      would be six controls over an array that is empty by construction — the exact shape
      `CLAUDE.md` refuses by name ("no control whose only effect is changing its own label") and
      that DPE rule 3 forbids ("nothing is added without a consumer in the same change").

      ## Why this notice and not the reference's own "No Reports."

      `No Reports.` (upstream's `AMe`, const 38) is what the reference shows when the fetch
      SUCCEEDED and returned an empty queue. Rendering it here would answer a question nobody asked
      the server — it says "we looked and there were none", when a presenter's actual position is
      "nothing in this product has ever looked". That is the fake-spinner defect (RPT-02) told as a
      sentence instead of as an animation, and it is the more dangerous half: a presenter who reads
      `No Reports.` under a title carrying a real AlertID concludes their alert reached nobody.

      `REPORT_UNAVAILABLE` is OURS and is marked as ours, exactly as `SYNC_ROOMS_UNAVAILABLE` is
      forty lines up in this same file for the identical situation — a captured control whose
      backing service this deployment does not have. That precedent is the reason this reads as a
      standing decision rather than as an unfinished stub.

      **What would close these six rows:** a table of delivery attempts per alert per recipient
      (status, sent time, latency, failure reason, token), something that writes to it when
      `alerts.dispatch` fans out, and a presenter-only read for it. `calcPieData` additionally
      needs jQuery + flot, which this room does not load and should not; `PollPanel`'s own
      `drawPieChart` is the shape a pie would take here instead.
    -->
    {#if targetMessage?.id}
      <div class="mt-3 text-center">{REPORT_UNAVAILABLE}</div>
    {:else}
      <!-- RPT-08, the half of it this component can reach. See `NO_REPORTS_FOUND`. -->
      <div class="mt-3 text-center">{NO_REPORTS_FOUND}</div>
    {/if}
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-alert-send-report-modal>
