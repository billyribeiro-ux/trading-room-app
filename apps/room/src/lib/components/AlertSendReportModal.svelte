<script lang="ts">
  import AlertDeliveryReportBody from '#lib/components/AlertDeliveryReportBody.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import { getAlertDeliveryReport } from '../../routes/alert-delivery.remote';

  interface Props {
    open: boolean;
    targetMessage: { id: number } | null;
    onclose: () => void;
  }

  type Report = Awaited<ReturnType<typeof getAlertDeliveryReport>>;
  let { open, targetMessage, onclose }: Props = $props();
  let report = $state.raw<Report | null>(null);
  let loading = $state(false);
  let problem = $state('');
  let requestSequence = 0;

  async function load(alertId: number) {
    const sequence = ++requestSequence;
    loading = true;
    problem = '';
    report = null;
    try {
      const result = await getAlertDeliveryReport(alertId);
      if (sequence === requestSequence) report = result;
    } catch (cause) {
      if (sequence === requestSequence) {
        problem =
          cause instanceof Error ? cause.message : 'The delivery report could not be loaded.';
      }
    } finally {
      if (sequence === requestSequence) loading = false;
    }
  }

  function retry() {
    const alertId = targetMessage?.id;
    if (alertId) void load(alertId);
  }

  $effect(() => {
    const alertId = open ? targetMessage?.id : null;
    if (alertId && alertId > 0) void load(alertId);
    else if (!open) requestSequence += 1;
  });
</script>

<app-alert-send-report-modal>
  <Modal
    id="alert-send-report-modal"
    {open}
    ariaLabelledby="alert-send-report-modal-title"
    titleId="alert-send-report-modal-title"
    title={`Alert Sent Report. AlertID: ${targetMessage?.id ?? ''}`}
    {onclose}
    footerClass="text-center"
  >
    {#if loading}
      <div class="text-center my-4" aria-live="polite">
        <h5><i class="ml-2 fas fa-spinner fa-spin"></i> Loading...</h5>
      </div>
    {:else if problem}
      <div class="alert alert-danger mt-3" role="alert">{problem}</div>
      <button class="btn btn-outline-secondary btn-sm" type="button" onclick={retry}>Retry</button>
    {:else if report}
      <AlertDeliveryReportBody {report} />
    {/if}

    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}
        >Close</button
      >
    {/snippet}
  </Modal>
</app-alert-send-report-modal>
