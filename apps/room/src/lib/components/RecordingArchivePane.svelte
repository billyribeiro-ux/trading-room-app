<script lang="ts">
  import { onMount } from 'svelte';
  import {
    deleteRecording,
    listRecordings,
    recordingTranscript
  } from '../../routes/recordings.remote';

  interface Props {
    isPresenter: boolean;
    active?: boolean;
  }

  type RecordingRow = Awaited<ReturnType<typeof listRecordings>>['rows'][number];
  type TranscriptRow = Awaited<ReturnType<typeof recordingTranscript>>[number];
  let { isPresenter, active = false }: Props = $props();
  let rows = $state.raw<RecordingRow[]>([]);
  let nextBeforeId = $state<number | null>(null);
  let loading = $state(false);
  let problem = $state('');
  let transcriptRecordingId = $state<number | null>(null);
  let transcriptRows = $state.raw<TranscriptRow[]>([]);
  let transcriptLoading = $state(false);
  let pendingDeleteId = $state<number | null>(null);

  function bytes(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KiB`;
    return `${(size / 1024 ** 2).toFixed(1)} MiB`;
  }

  function duration(milliseconds: number): string {
    const seconds = Math.round(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  async function refresh() {
    loading = true;
    problem = '';
    try {
      const page = await listRecordings({ limit: 50 });
      rows = page.rows;
      nextBeforeId = page.nextBeforeId;
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'Recordings could not be loaded.';
    } finally {
      loading = false;
    }
  }

  async function loadOlder() {
    if (!nextBeforeId || loading) return;
    loading = true;
    problem = '';
    try {
      const page = await listRecordings({ beforeId: nextBeforeId, limit: 50 });
      rows = [...rows, ...page.rows];
      nextBeforeId = page.nextBeforeId;
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'Older recordings could not be loaded.';
    } finally {
      loading = false;
    }
  }

  async function remove(row: RecordingRow) {
    try {
      await deleteRecording({ id: row.id });
      rows = rows.filter((candidate) => candidate.id !== row.id);
      pendingDeleteId = null;
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'The recording could not be deleted.';
    }
  }

  async function toggleTranscript(row: RecordingRow) {
    if (transcriptRecordingId === row.id) {
      transcriptRecordingId = null;
      transcriptRows = [];
      return;
    }
    transcriptLoading = true;
    problem = '';
    try {
      transcriptRows = await recordingTranscript({ id: row.id });
      transcriptRecordingId = row.id;
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'The recording log could not be loaded.';
    } finally {
      transcriptLoading = false;
    }
  }

  function downloadTranscript(row: RecordingRow) {
    const payload = JSON.stringify(
      {
        recordingId: row.id,
        title: row.title,
        sha256: row.sha256,
        entries: transcriptRows.map((entry) => ({
          ...entry,
          occurredAt: new Date(entry.occurredAt).toISOString()
        }))
      },
      null,
      2
    );
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${row.title}-chat-log.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  onMount(() => {
    void refresh();
  });
</script>

<div
  id="recordings"
  class={['recording-archive tab-pane', { active, show: active }]}
  role="tabpanel"
  aria-labelledby="recordings-tab"
>
  <header>
    <div>
      <h2 id="recordings-heading">Recordings</h2>
      <p>Completed room screen recordings available to this room’s archive members.</p>
    </div>
    <button
      class="btn btn-outline-secondary btn-sm"
      type="button"
      onclick={refresh}
      disabled={loading}
    >
      Refresh
    </button>
  </header>

  {#if problem}<div class="alert alert-danger" role="alert">{problem}</div>{/if}
  {#if loading && rows.length === 0}
    <p aria-live="polite">Loading recordings…</p>
  {:else if rows.length === 0}
    <p>No recordings have been archived for this room.</p>
  {:else}
    <div class="recording-grid">
      {#each rows as row (row.id)}
        <article class="card">
          <!-- svelte-ignore a11y_media_has_caption -->
          <video controls preload="metadata" src={row.mediaUrl}></video>
          <div class="card-body">
            <h3>{row.title}</h3>
            <dl>
              <div>
                <dt>Recorded</dt>
                <dd>{new Date(row.startedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>By</dt>
                <dd>{row.recordedBy}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{duration(row.durationMs)}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{bytes(row.size)}</dd>
              </div>
            </dl>
            <div class="actions">
              <a class="btn btn-outline-primary btn-sm" href={row.mediaUrl} download={row.title}
                >Download</a
              >
              {#if row.logEntryCount > 0}
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  disabled={transcriptLoading}
                  aria-expanded={transcriptRecordingId === row.id}
                  onclick={() => toggleTranscript(row)}
                  >{transcriptRecordingId === row.id
                    ? 'Hide log'
                    : `View log (${row.logEntryCount})`}</button
                >
              {/if}
              {#if isPresenter}
                <button
                  class="btn btn-outline-danger btn-sm"
                  type="button"
                  onclick={() => (pendingDeleteId = row.id)}
                >
                  Delete
                </button>
              {/if}
            </div>
            {#if pendingDeleteId === row.id}
              <div class="alert alert-warning delete-confirmation" role="alert">
                <p>Delete “{row.title}”? This permanently removes its media and recorded log.</p>
                <button class="btn btn-danger btn-sm" type="button" onclick={() => remove(row)}
                  >Delete permanently</button
                >
                <button
                  class="btn btn-secondary btn-sm"
                  type="button"
                  onclick={() => (pendingDeleteId = null)}>Cancel</button
                >
              </div>
            {/if}
            {#if transcriptRecordingId === row.id}
              <div class="recording-log">
                <div class="text-right">
                  <button
                    class="btn btn-link btn-sm"
                    type="button"
                    onclick={() => downloadTranscript(row)}>Download JSON</button
                  >
                </div>
                <ol>
                  {#each transcriptRows as entry (entry.id)}
                    <li>
                      <time datetime={new Date(entry.occurredAt).toISOString()}
                        >{new Date(entry.occurredAt).toLocaleTimeString()}</time
                      >
                      <strong>{entry.senderName}</strong>
                      <span class="badge badge-secondary">{entry.sourceKind}</span>
                      {#if entry.channel}<span class="badge badge-light">{entry.channel}</span>{/if}
                      <p>{entry.body}</p>
                    </li>
                  {/each}
                </ol>
              </div>
            {/if}
          </div>
        </article>
      {/each}
    </div>
    {#if nextBeforeId}
      <button
        class="btn btn-outline-secondary"
        type="button"
        onclick={loadOlder}
        disabled={loading}
      >
        {loading ? 'Loading…' : 'Load older recordings'}
      </button>
    {/if}
  {/if}
</div>

<style>
  .recording-archive {
    height: 100%;
    overflow: auto;
    padding: 1rem;
  }
  header,
  .actions,
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
  header {
    align-items: start;
  }
  header p {
    color: #6c757d;
  }
  .recording-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: 1rem;
  }
  video {
    width: 100%;
    max-height: 20rem;
    background: #000;
  }
  h3 {
    font-size: 1rem;
    overflow-wrap: anywhere;
  }
  dl {
    margin: 0 0 1rem;
  }
  dt {
    font-weight: 600;
  }
  dd {
    margin: 0;
    text-align: right;
  }
  .recording-log {
    border-top: 1px solid #dee2e6;
    margin-top: 1rem;
    padding-top: 0.5rem;
  }
  .recording-log ol {
    max-height: 18rem;
    overflow: auto;
    padding-left: 1.5rem;
  }
  .recording-log li {
    margin-bottom: 0.5rem;
  }
  .recording-log time {
    color: #6c757d;
    margin-right: 0.5rem;
  }
  .recording-log .badge {
    margin-left: 0.35rem;
  }
  .recording-log p {
    margin: 0.15rem 0 0;
    white-space: pre-wrap;
  }
  .delete-confirmation {
    margin-top: 0.75rem;
  }
  .delete-confirmation p {
    margin-bottom: 0.5rem;
  }
  .delete-confirmation button + button {
    margin-left: 0.5rem;
  }
</style>
