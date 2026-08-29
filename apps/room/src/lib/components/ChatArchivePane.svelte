<script lang="ts">
  import type { ChatArchiveView } from '#lib/server/chat-archive.js';

  /**
   * The chat archives browser — `app-chat-logs-modal`, and the four-button dialog beside it.
   *
   * ## What was here before, and why it counted as a defect rather than a stub
   *
   * `ModalHost.svelte` drew this modal with the literal string *"There are no archived chats at this
   * time"* and a `Reload Log List` button carrying **no `onclick` at all** — a control whose only
   * effect is being drawn, which is the shape `INERT_ACTIONS` exists to catalogue. It reported a
   * fact about the room ("there are none") that nothing had checked.
   *
   * ## The capture, transcribed
   *
   * `archiveOptions()` @ bundle byte 1,444,182 is a bootbox dialog titled "Archive Chat Messages"
   * with a `<input type="date" id="date-archive-chat">` and four buttons — Close, Delete Searched,
   * Archive All, Archive Older than Selected Date. `unarchiveLog()` @ 2,304,726 confirms and sends.
   *
   * **`Delete Searched` is not drawn here**, and that is a decision recorded in
   * `server/chat-archive.ts`: it deletes by a LIKE pattern the caller typed, is irreversible where
   * archiving is not, and putting both on one surface would blur exactly the distinction a
   * presenter is standing there making.
   *
   * The date input is `type="date"` as upstream's is, so the picker is the platform's and there is
   * no format to parse or mis-parse.
   */
  interface Props {
    archives: readonly ChatArchiveView[];
    /** The channels this presenter may sweep, named by the server. */
    channels: readonly string[];
    /** Which of them the sweep acts on. Bound, so the owner reads it when a button is pressed. */
    channel: string;
    loading: boolean;
    error: string | null;
    onreload: () => void;
    onarchiveall: () => void;
    onarchiveolder: (value: string) => void;
    onrestore: (archive: ChatArchiveView) => void;
  }

  let {
    archives,
    channels,
    channel = $bindable(),
    loading,
    error,
    onreload,
    onarchiveall,
    onarchiveolder,
    onrestore
  }: Props = $props();

  /*
    The default is the FIRST channel the server named, never a hardcoded `'main'`: a room whose
    columns are configured differently would otherwise be offered a sweep the server then refuses.
    An effect and not a `$derived`, because this is a WRITE to bound state that the presenter may
    then change — a derived value would snap back to the first channel on every re-evaluation.
  */
  $effect(() => {
    if (channel === '' && channels.length > 0) channel = channels[0];
  });

  let olderThan = $state('');

  /**
   * Built once rather than per row, for the reason the notes list records: a formatter inside the
   * `{#each}` is one allocation and one locale-data lookup per archive.
   */
  const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });
  const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' });
</script>

<div>
  <div class="text-center my-2">
    <label for="date-archive-chat" class="form-label">
      You can either archive all chats or select an older than date:
    </label>
    <input type="date" id="date-archive-chat" class="form-control" bind:value={olderThan} />
  </div>
  {#if channels.length > 1}
    <!--
      OURS. The reference's dialog can only ever sweep `this.channel`, the column whose toolbar it
      was opened from; this browser is a room-level modal, so it has to name one. Offering the
      server's own list is the only alternative to guessing, and guessing is a lie in any room that
      configured a second column.
    -->
    <div class="text-center my-2">
      <label for="archive-channel" class="form-label">Chat column:</label>
      <select id="archive-channel" class="form-select" bind:value={channel}>
        {#each channels as name (name)}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </div>
  {/if}
  <div class="text-center mb-3">
    <button
      type="button"
      class="btn btn-warning mx-1"
      disabled={channel === ''}
      onclick={onarchiveall}>Archive All</button
    >
    <button
      type="button"
      class="btn btn-success mx-1"
      disabled={channel === ''}
      onclick={() => onarchiveolder(olderThan)}
    >
      Archive Older than Selected Date
    </button>
  </div>

  <button type="button" class="btn btn-primary my-2" onclick={onreload}>Reload Log List</button>

  {#if error}
    <div class="text-warning py-2">{error}</div>
  {:else if loading}
    <div class="list-group"><h5 class="mt-2">Loading…</h5></div>
  {:else if archives.length === 0}
    <!-- Upstream's own empty line, which used to be rendered unconditionally. -->
    <div class="list-group"><h5 class="mt-2">There are no archived chats at this time</h5></div>
  {:else}
    <ul class="list-group">
      {#each archives as archive (archive.id)}
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>
            <strong>{day.format(new Date(archive.olderThan))}</strong>
            and older &middot; {archive.messageCount} message{archive.messageCount === 1 ? '' : 's'}
            &middot; {archive.channel}
            <small class="d-block text-muted"
              >archived {when.format(new Date(archive.archivedAt))}</small
            >
          </span>
          <button
            type="button"
            class="btn btn-sm btn-outline-light"
            onclick={() => onrestore(archive)}
          >
            Unarchive
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
