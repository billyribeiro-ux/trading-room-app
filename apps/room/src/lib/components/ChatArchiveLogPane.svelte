<script lang="ts">
  import CompactMessageRow from '#lib/components/CompactMessageRow.svelte';
  import type { RoomChatArchiveLog } from '#lib/room/chat-archive-log.svelte.js';
  import { shortWhen } from '#lib/short-when.js';

  /**
   * ONE ARCHIVED LOG, OPENED — the second view of `app-chat-logs-modal`, which was never built.
   *
   * ## The capture, transcribed by value
   *
   * `jxe` at bundle byte **2,309,873**, consts 17 to 37 of the modal's table (byte 2,305,566):
   *
   * ```js
   * 17 [1,"log-header-container","bg-secondary","text-white"]
   * 18 [1,"d-flex","align-items-center","justify-content-between","my-1","log-header"]
   * 19 ["type","button",1,"btn","btn-light","me-2",3,"click"]              Back
   * 20 [1,"fas","fa-arrow-left"]
   * 23 ["type","text","id","search-term","aria-describedby","search-addon",
   *     "placeholder","Enter search term",1,"form-control",3,"ngModelChange","keyup","ngModel"]
   * 24 ["id","search-addon",1,"input-group-text","btn","btn-ligth"]        the clear cross
   * 25 ["id","search-addon",1,"input-group-text","btn","btn-ligth",3,"click"]  the search
   * 29 ["type","button",1,"btn","btn-light","btn-sm",3,"click"]            Download Log
   * 34 ["type","button",1,"btn","btn-secondary","btn-sm","mx-1",3,"click"] Unarchive
   * 35 [1,"fas","fa-box-open"]
   * 36 [3,"msg","logType","prevD"]                                        one app-st-message
   * 37 [1,"mt-3"]                                                         "No logs."
   * ```
   *
   * with `O(9, e.inputTxt && e.inputTxt.length > 0 ? 9 : -1)` gating the cross,
   * `O(17, e.appService.globals.isPresenter ? 17 : -1)` gating Unarchive, and
   * `O(18, …searchLogs(msgs, searchTxt).length > 0 ? 18 : 20)` choosing the list or "No logs.".
   *
   * ## Three divergences, each deliberate
   *
   * **Consts 24 and 25 carry the SAME `id`, and BOTH are transcribed.** Two elements with
   * `id="search-addon"` in one modal is invalid HTML and is what the reference ships; the input's
   * `aria-describedby` resolves to whichever the browser finds first. This said "only the search span
   * keeps the id here" until 2026-09-01, which was a judgement about the reference rather than a fact
   * about this application. The ELEMENT is still a `<button>` — see the note at it.
   *
   * **`btn-ligth` is upstream's typo for `btn-light` and it is transcribed anyway.** It matches no
   * rule in `app.css` or in the captured sheet, which means it matched nothing upstream either: those
   * spans are styled by `input-group-text` and `btn` alone, and dropping the typo would change
   * nothing while making this markup disagree with the capture it was read from. Kept for the same
   * reason `PollPanel.svelte` keeps `ria-controls`.
   *
   * **The rows are `app-st-compactmessage`, not `app-st-message`.** Upstream renders the full message
   * component with `logType`, which brings reactions, the menu, replies and colours — every one of
   * them inert over an archive nobody can act on. The compact row already owns the link split and the
   * time format, and its own docblock records why a second transcription of that would be two
   * transcriptions. The shape it wants is the private-chat wire's, so the map below is an adapter and
   * is the whole cost of the reuse.
   *
   * The component's own `styles:[…]` travel with it — they are Angular component styles rather than
   * anything in the captured sheet, so without the block at the bottom of this file every class above
   * would be a class with no CSS.
   */
  interface Props {
    /** The viewer. Owned by `LogArchiveModals`, which also owns the list beside it. */
    log: RoomChatArchiveLog;
    /** `O(17, isPresenter ? 17 : -1)` — Unarchive is the presenter's, the rest is not. */
    isPresenter: boolean;
    /** Restore this archive. The same confirm and the same send as the list's own button. */
    onrestore: () => void;
  }

  const { log, isPresenter, onrestore }: Props = $props();

  /**
   * `downloadLog()` — build the file here, because a Blob and an anchor need a document.
   *
   * The text is the class's, so what gets written is testable without a DOM; this is the four lines
   * that cannot be. `revokeObjectURL` is ours: upstream never releases the URL, so every download in
   * a session leaks its blob until the tab closes.
   */
  function download(): void {
    const url = URL.createObjectURL(
      new Blob([log.downloadText()], { type: 'text/plain;charset=utf-8' })
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = log.downloadName();
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
</script>

<div class="log-header-container bg-secondary text-white">
  <div class="d-flex align-items-center justify-content-between my-1 log-header">
    <button type="button" class="btn btn-light me-2" onclick={() => log.back()}>
      <i class="fas fa-arrow-left"></i> Back
    </button>
    <div class="flex-fill">
      <div class="input-group">
        <input
          type="text"
          id="search-term"
          aria-describedby="search-addon"
          placeholder="Enter search term"
          class="form-control"
          bind:value={
            () => log.term,
            (value) => {
              log.term = value;
            }
          }
          onkeydown={(event) => {
            /*
              Upstream reads `13 === e.keyCode` on `keyup`. `keyCode` is deprecated and `key` is the
              standard, and `keydown` is where `preventDefault` still stops the form — on `keyup` the
              default has already happened, which is why upstream's own call there does nothing.
            */
            if (event.key !== 'Enter') return;
            event.preventDefault();
            log.search();
          }}
        />
        {#if log.searching}
          <!--
            `id="search-addon"` ON BOTH, exactly as consts 24 and 25 carry it.

            Two elements with one id is invalid HTML and it is what the reference ships, so
            `aria-describedby` on the input resolves to whichever the browser finds first — the clear
            control while it is showing, the search control otherwise. This file recorded a
            divergence here until 2026-09-01 ("only the search span keeps the id"); the decision is
            to match the dump, and an id is pure data with no accessibility cost either way.

            The ELEMENT is still a `<button>` rather than the reference's `<span>`, and that is the
            one carve-out this repository's own rule already names, in `ScreenTabs.svelte`: *a
            captured value is reproduced unless reproducing it locks a real person out.* A span with
            a click handler is reachable by mouse and by nothing else.
          -->
          <button
            type="button"
            id="search-addon"
            class="input-group-text btn btn-ligth"
            aria-label="Clear search"
            onclick={() => log.clearInput()}
          >
            <i class="fas fa-times"></i>
          </button>
        {/if}
        <button
          type="button"
          id="search-addon"
          class="input-group-text btn btn-ligth"
          aria-label="Search this log"
          onclick={() => log.search()}
        >
          <i class="fas fa-search"></i>
        </button>
      </div>
    </div>
  </div>
</div>
<div class="log-body">
  <div class="my-2">
    <button type="button" class="btn btn-light btn-sm" onclick={download}>
      <i class="fas fa-download"></i> Download Log
    </button>
    {#if isPresenter}
      <button type="button" class="btn btn-secondary btn-sm mx-1" onclick={onrestore}>
        <i class="fas fa-box-open"></i> Unarchive
      </button>
    {/if}
  </div>
  {#if log.error}
    <div class="text-warning py-2">{log.error}</div>
  {:else if log.loading}
    <!--
      `O(10, o.showLogs && o.loading ? 10 : -1)` — template `Fxe`, const 6 `[1,"text-center","my-4"]`
      and const 16 `[1,"ml-2","fas","fa-spinner","fa-spin"]`, transcribed. It is the same block
      `ModalHost.svelte` already carries twice, for `app-all-user-pmmodal` and the advanced search;
      this one had drifted to `mt-2` and a `…` character, which is a third spelling of one idiom.

      `ml-2` is Bootstrap 4 and this project is on 5, where it is `ms-2`. It is transcribed as
      captured for the same reason `btn-ligth` is kept above: what the reference ships is the
      specification, and a class silently "corrected" here is a difference the next reader cannot
      find when a stylesheet starts keying on the captured name.

      **OURS: the chrome above stays on screen while this renders.** Upstream's `Fxe` is a SIBLING
      of the viewer, not a branch inside it, so its Back button disappears for the whole fetch and a
      presenter who opened a slow log has no way out but the modal's Close.
    -->
    <div class="text-center my-4">
      <h5><i class="ml-2 fas fa-spinner fa-spin"></i> Loading...</h5>
    </div>
  {:else}
    {#if log.truncated}
      <!--
        OURS, and it is the honest half of putting a limit on the read. `alert-toolbar-search-scope.ts`
        argues at length that a filter over a window nobody was told about is worse than no filter:
        the search below runs over what arrived, so when that is not the whole archive it has to say
        so, or a presenter concludes a message is not in the log when it simply was not fetched.
      -->
      <div class="text-warning my-2">
        This log is longer than one read. You are seeing its oldest {log.messages.length} messages, and
        the search covers only those.
      </div>
    {/if}
    {#if log.visible.length > 0}
      <div class="log-messages">
        {#each log.visible as message (message.id)}
          <CompactMessageRow
            message={{
              _id: String(message.id),
              n: message.senderName,
              txt: message.body,
              t: message.createdAt.getTime(),
              isA: message.isAdmin
            }}
          />
        {/each}
      </div>
    {:else}
      <div class="mt-3">No logs.</div>
    {/if}
    {#if log.archive}
      <!-- OURS: the list names each archive by date, and the viewer had nothing saying which one is open. -->
      <div class="text-muted my-2">
        {log.archive.channel} &middot; archived {shortWhen.format(new Date(log.archive.archivedAt))}
      </div>
    {/if}
  {/if}
</div>

<style>
  /*
    The component's own `styles:[…]`, transcribed from the same declaration as the markup above
    (bundle byte 2,307,166). They are Angular COMPONENT styles, which is why none of them is in
    `captured-runtime-components.css`: that sheet is generated from a runtime capture of the global
    stylesheet, and these never reached it. Without them every class name above would be a class with
    no CSS.

    `.list-group`, `.list-group-item` and the two `.modal-dialog` rules from that same block are NOT
    here: they belong to the LIST view and the dialog, which are `ChatArchivePane` and `Modal`.
  */
  .log-header,
  .log-body {
    width: 100%;
    margin: 0 auto;
  }

  .log-header-container {
    padding: 10px;
  }

  .log-body {
    text-align: center;
  }

  .log-messages {
    max-height: calc(100vh - 350px);
    overflow-y: auto;
  }
</style>
