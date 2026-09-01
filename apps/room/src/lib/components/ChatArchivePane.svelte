<script lang="ts">
  import type { ChatArchiveView } from '#lib/server/chat-archive.js';
  import { shortWhen } from '#lib/short-when.js';

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
    /**
     * `toggleShowLogs(entry)` — open this archive's log.
     *
     * The reference puts the click on the ROW (const 14, `[1,"list-group-item",
     * "list-group-item-action",3,"click"]`) and this does too, which is why `onrestore` below stops
     * propagation: a row that both opened and restored on one click would restore the archive a
     * presenter was trying to look at first.
     */
    onopen: (archive: ChatArchiveView) => void;
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
    onrestore,
    onopen
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

  /** The date half alone — `shortWhen` carries the pair, and nothing else needs this one. */
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
        <li
          class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
        >
          <!--
            A BUTTON and not a clickable `li`. Upstream carries `list-group-item-action`, which is
            Bootstrap's class for a list row that behaves like a control, and then puts the handler on
            the `li` itself — so the row is reachable by mouse and by nothing else. The class stays
            because it is what styles the hover; the element under it is the one a keyboard can reach.
          -->
          <button
            type="button"
            class="btn btn-link text-start p-0 text-reset text-decoration-none"
            onclick={() => onopen(archive)}
          >
            <!--
              THREE LABELLED LINES, transcribed from the capture (`vxe`, bundle byte 2,301,700):

                d(1,"div")(2,"strong",15),v(3),Xe(4,"date"),u()(),
                d(5,"div")(6,"strong",15),v(7,"By:\xa0"),u(),d(8,"i"),v(9),u()(),
                d(10,"div")(11,"strong",15),v(12,"Channel:\xa0"),u(),d(13,"i"),v(14),u()()()
                …  m(3),Ze(Ct(4,3,e.updated,"mediumDate")),m(6),Ze(e.createdBy),m(5),Ze(e.channel)

              — const 15 is `[1,"fw-bold"]`, and the `\xa0` is a non-breaking space so the label
              never wraps away from its value. Until 2026-09-01 this room compressed all three onto
              one line and dropped `By:` entirely, which is why the row could not answer the question
              `chat_archives.archived_by_user_id` was added to answer.

              `fw-bold` on a `<strong>` is redundant to a browser and is transcribed anyway: it is
              what the capture carries, and a class removed because it "does nothing" is a class the
              next person cannot find when a stylesheet starts keying on it.
            -->
            <div>
              <strong class="fw-bold">{day.format(new Date(archive.olderThan))}</strong> and older
            </div>
            <div><strong class="fw-bold">By:&nbsp;</strong><i>{archive.archivedBy}</i></div>
            <div><strong class="fw-bold">Channel:&nbsp;</strong><i>{archive.channel}</i></div>
            <!--
              OURS, and the fourth line rather than a fourth labelled one so the transcription above
              stays legible as a block. The reference lists archives by a single date and gives a
              presenter no way to tell a sweep of four messages from a sweep of four thousand before
              restoring it; `messageCount` is that, and `archivedAt` is the second of the two dates
              this room holds — the capture's `updated` is one date whose provenance is not in the
              bundle, since the server that wrote it is not captured, so both are shown rather than
              one of them guessed to be the other.
            -->
            <small class="d-block text-muted">
              {archive.messageCount} message{archive.messageCount === 1 ? '' : 's'} &middot; archived
              {shortWhen.format(new Date(archive.archivedAt))}
            </small>
          </button>
          <!--
            OURS. Upstream's Unarchive is inside the log VIEWER and gated on `isPresenter`; this one
            is on the row, so an archive can be restored without opening it first. It needs no gate
            of its own because `listChatArchives` is `presenterRoom()` — nobody who is not a
            presenter has a row to press it on — and `unarchiveChatLogCommand` re-checks on the
            server either way.
          -->
          <button
            type="button"
            class="btn btn-sm btn-outline-light"
            onclick={(event) => {
              /* See `onopen`: the row opens the log, so this must not do both. */
              event.stopPropagation();
              onrestore(archive);
            }}
          >
            Unarchive
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
