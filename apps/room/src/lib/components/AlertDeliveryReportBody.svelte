<script lang="ts">
  import { alertDateFormatter } from '#lib/message-formatters.js';
  import { ngbTooltipWith } from '#lib/ngb-tooltip.js';
  import { getAlertDeliveryReport } from '../../routes/alert-delivery.remote';

  type Report = Awaited<ReturnType<typeof getAlertDeliveryReport>>;
  type Row = Report['rows'][number];
  type StatusFilter = 'all' | Row['status'];

  let { report }: { report: Report } = $props();
  let search = $state('');
  let status = $state<StatusFilter>('all');
  const filteredRows = $derived(
    report.rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      const term = search.trim().toLowerCase();
      return (
        !term ||
        row.recipientEmail.toLowerCase().includes(term) ||
        row.roomName.toLowerCase().includes(term)
      );
    })
  );
  const summary = $derived.by(() => ({
    sent: report.rows.filter((row) => row.status === 'sent').length,
    failed: report.rows.filter((row) => row.status === 'failed').length,
    queued: report.rows.filter((row) => row.status === 'queued' || row.status === 'sending').length,
    suppressed: report.rows.filter(
      (row) => row.status === 'suppressed' || row.status === 'no-registration'
    ).length
  }));
  const pieStyle = $derived.by(() => {
    const total = summary.sent + summary.failed + summary.queued + summary.suppressed;
    if (total === 0) return 'background: #343a40;';
    const sent = (summary.sent / total) * 100;
    const failed = sent + (summary.failed / total) * 100;
    const queued = failed + (summary.queued / total) * 100;
    return `background: conic-gradient(#00bc8c 0 ${sent}%, #e74c3c ${sent}% ${failed}%, #ffc107 ${failed}% ${queued}%, #6c757d ${queued}% 100%);`;
  });

  const date = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');
  const latency = (row: Row) =>
    row.startedAt && row.finishedAt
      ? `${Math.max(0, Math.round((Date.parse(row.finishedAt) - Date.parse(row.startedAt)) / 1000))}s`
      : '—';
</script>

<div class="w-100">
  <div class="report-header-container text-white">
    <div class="my-1 report-header">
      <div
        id="pie-container"
        role="img"
        aria-label={`Delivery status: ${summary.sent} sent, ${summary.failed} failed, ${summary.queued} queued, ${summary.suppressed} suppressed`}
        style={pieStyle}
      ></div>
      <div class="summary" aria-label="Delivery summary">
        <span class="text-success fw-semibold">Sent {summary.sent}</span>
        <span class="text-danger fw-semibold">Failed {summary.failed}</span>
        <span class="text-warning fw-semibold">Queued {summary.queued}</span>
        <span class="fw-semibold">Suppressed {summary.suppressed}</span>
      </div>
      <div class="input-group">
        <span id="search-select-addon" class="input-group-text">
          <select aria-label="Search select" class="form-select" bind:value={status}>
            <option value="all">All</option><option value="sent">Sent</option>
            <option value="queued">Queued</option><option value="sending">Sending</option>
            <option value="failed">Failed</option><option value="suppressed">Suppressed</option>
            <option value="no-registration">No registration</option>
          </select>
        </span>
        <input
          id="search-term"
          type="search"
          aria-describedby="search-addon"
          placeholder="Enter search term"
          class="form-control"
          bind:value={search}
        />
        {#if search}
          <button
            id="clear-search-addon"
            class="input-group-text btn btn-ligth"
            type="button"
            aria-label="Clear search"
            onclick={() => (search = '')}><i class="fas fa-times"></i></button
          >
        {/if}
        <button
          id="search-addon"
          class="input-group-text btn btn-ligth"
          type="button"
          aria-label="Search delivery report"
          onclick={() => (search = search.trim())}><i class="fas fa-search"></i></button
        >
      </div>
    </div>
  </div>

  {#if report.localStatus === 'suppressed'}
    <div class="alert alert-info">Push was suppressed by the sender for this alert.</div>
  {/if}
  <div class="report-body">
    {#if filteredRows.length === 0}
      <p class="mt-3 text-center">No Reports.</p>
    {:else}
      <div class="list-group">
        {#each filteredRows as row (`${row.roomShortCode}:${row.recipientEmail}`)}
          <div
            style:margin-bottom="1px"
            class={[
              'list-group-item list-group-item-action border-0 bg-dark',
              {
                'text-success': row.status === 'sent',
                'text-danger': row.status === 'failed',
                'text-warning': row.status === 'queued' || row.status === 'sending'
              }
            ]}
          >
            <strong class="fw-bold">{row.recipientName}&nbsp;</strong>
            <i>({row.recipientEmail})</i>
            <div>{row.roomName} ({row.roomShortCode})</div>
            <div>
              Status: {row.status}; devices: {row.sentCount}/{row.registrationCount}{#if row.prunedCount > 0}
                ({row.prunedCount} pruned){/if}
            </div>
            {#if row.finishedAt}
              <div class="sent-time">
                <i class="fas fa-clock"></i><span
                  {...{ placement: 'top' } as Record<string, string>}
                  {@attach ngbTooltipWith(alertDateFormatter.format(Date.parse(row.finishedAt)))}
                  class="ms-1">{date(row.finishedAt)}&nbsp;&nbsp;Latency: {latency(row)}</span
                >
              </div>
            {/if}
            {#if row.reason}
              <div class="failed-reason m-1">
                <i class="fas fa-exclamation-circle me-1"></i>{row.reason}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if report.lastError}
  <div class="alert alert-warning mb-0">Last delivery worker error: {report.lastError}</div>
{/if}

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .list-group,
  .report-header,
  .report-body {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }
  .report-header-container {
    padding: 10px;
  }
  .report-body {
    text-align: left;
    max-height: calc(100vh - 500px);
    overflow-y: auto;
  }
  #search-select-addon {
    padding: 0;
    border: 0;
    margin: 0;
  }
  .form-select {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .failed-reason {
    font-size: 14px;
    font-weight: 100;
    font-style: italic;
  }
  .sent-time {
    font-size: 14px;
    color: #6c757d;
  }
  #pie-container {
    width: 192px;
    height: 192px;
    margin: 0 auto 8px;
    border-radius: 50%;
  }
</style>
