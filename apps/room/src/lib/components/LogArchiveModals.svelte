<script lang="ts">
  import Modal from './Modal.svelte';
  import ChatArchiveLogPane from './ChatArchiveLogPane.svelte';
  import ChatArchivePane from './ChatArchivePane.svelte';
  import { RoomChatArchive } from '#lib/room/chat-archive.svelte.js';
  import { RoomChatArchiveLog } from '#lib/room/chat-archive-log.svelte.js';
  import { chatArchivePort } from '#lib/room/chat-archive-port.js';
  import { readChatArchiveLog } from '../../routes/chat-archive.remote';
  import type { ModalName } from '#lib/types.js';

  /**
   * The two LOG ARCHIVE modals — `app-chat-logs-modal` and `app-alert-logs-modal`.
   *
   * ## Why they are one component and not two
   *
   * They are the same surface twice: upstream's two components differ only in the word "chat" or
   * "alerts" and the `type` on the wire. Keeping them adjacent is what makes the asymmetry below
   * visible instead of buried fifty lines apart in a six-thousand-line file.
   *
   * ## The asymmetry, and why the alerts half is still a placeholder
   *
   * The chat archive is BUILT. The alerts archive is not, and it is not a matter of doing the same
   * work again: `archiveChatDate` on the alerts side is gated on a PASSWORD —
   *
   * ```js
   * this.appService.globals.sessData.deleteAlertPW
   *   ? bootbox.prompt({ title:"Please enter the password to delete this alert:", …,
   *       callback: i => i.trim() === sessData.deleteAlertPW ? send(…) : bootbox.alert("Wrong password!") })
   *   : send(…)
   * ```
   *
   * (bundle byte 2,048,903) — and `deleteAlertPW` is one of the SEVEN credential-shaped settings
   * that may never reach this room. `room-config-boundary.test.ts` refuses it, and
   * `setting-coverage-contract.test.ts` records that the reference performs that comparison
   * client-side five times over.
   *
   * **THAT DOOR NOW EXISTS, 2026-08-30 — `internal/room-alert-delete-auth/[code]`**, built for
   * `TODO.md` row AL so that deleting ONE alert asks the password. So the blocker this paragraph
   * recorded is gone and what is left is the sweep itself: an `archiveLogs` command for alerts,
   * gated on `requireAlertDeleteAccess` exactly as the per-alert delete now is. The placeholder is
   * pinned here beside the finished half so it stays visible as work rather than looking done.
   */
  interface Props {
    name: ModalName;
    onclose: () => void;
    onAlert: (message: string) => void;
    onConfirm: (message: string, onconfirm: () => void) => void;
    /**
     * `O(17, e.appService.globals.isPresenter ? 17 : -1)` — Unarchive inside the log viewer.
     *
     * A PROP and not a re-derivation. Every authority answer in this room is decided on the page and
     * passed down, and the server re-checks: `readChatArchiveLog` and `unarchiveChatLogCommand` are
     * both `presenterRoom()`, so this decides what is DRAWN and nothing else.
     */
    isPresenter: boolean;
  }

  const { name, onclose, onAlert, onConfirm, isPresenter }: Props = $props();

  /**
   * THE HOLDER IS CONSTRUCTED HERE, and the ratchet is what argued for it.
   *
   * The first wiring threaded a 37th state class from `create-room` through `+page.svelte` and
   * `RoomOverlays` to `ModalHost` to here. `source-size-contract.test.ts` refused it at all three —
   * every one of those files was at its ceiling, and its instruction is to extract rather than
   * raise. Three files growing to pass one object to one modal is exactly the growth it exists to
   * stop, and following it produced the better arrangement: the only component that uses this owns
   * it, and nothing between the page and here knows it exists.
   *
   * `RoomChatArchive` stays a CLASS rather than dissolving into `$state` here, because the confirm
   * strings, the `isNaN` guard and the failure handling are behaviour worth testing without a DOM —
   * which its own test does, with three stubs and no server.
   */
  const archive = new RoomChatArchive(
    /*
      Wrapped in closures rather than handed over by reference. `onAlert` and `onConfirm` are props,
      so capturing them here would freeze the values this component was created with — the compiler
      says so in as many words (`state_referenced_locally`), and the parent replacing either would
      leave this raising dialogs through the old ones. Same reason `dialogs.confirm` is always
      wrapped rather than passed: a value captured out of reactive state stops tracking it.
    */
    {
      alert: (message) => onAlert(message),
      confirm: (message, onconfirm) => onConfirm(message, onconfirm)
    },
    chatArchivePort,
    () => channel
  );

  /**
   * Which channel the sweep acts on.
   *
   * Defaults to the FIRST channel the server named, never to a hardcoded `'main'`: a room that
   * configured its columns differently would otherwise be offered a sweep of a channel it does not
   * have, and the server would refuse it. `''` until the first load answers, which is why the
   * buttons below are disabled while it is empty.
   */
  let channel = $state('');

  /**
   * The log VIEWER — `toggleShowLogs`, the other half of this modal. See `chat-archive-log.svelte.ts`.
   *
   * One remote function rather than a port object, because it makes one call. Constructed here for
   * the same reason `archive` is: the only component that uses it owns it, and nothing between the
   * page and here knows it exists.
   */
  const log = new RoomChatArchiveLog((archiveId) => readChatArchiveLog({ archiveId }));

  $effect(() => {
    if (name !== 'chat-logs') return;
    void archive.reload();
  });

  /*
    Closing the modal returns it to the LIST.

    Upstream does this from the other side — `guiEventBus.subscribe("doAlertsLogsModal", () => {
    this.showLogs = !1; this.clearInput() })`, byte 2,311,000 — because its modal is opened by an
    event rather than by a name. Here the name IS the state, so the same rule reads as: while this
    modal is not showing, there is no log open. Without it, reopening the archive browser lands
    straight back inside whichever log was last read, which is not where the Close button suggested
    it was going.
  */
  $effect(() => {
    if (name !== 'chat-logs') log.back();
  });
</script>

<app-chat-logs-modal>
  <Modal
    id="chat-logs-modal"
    open={name === 'chat-logs'}
    ariaLabelledby="chat-logs-modal"
    title="Chat Logs"
    {onclose}
    footerClass="text-center"
  >
    <!--
      Was a hardcoded "There are no archived chats at this time" and a `Reload Log List` button with
      no `onclick` — a control whose only effect was being drawn. See `ChatArchivePane.svelte`.
    -->
    {#if log.archive || log.loading || log.error}
      <!--
        `O(9, o.showLogs ? -1 : 9)` and its three siblings: the list and the viewer are ALTERNATIVES,
        never both. `log.archive` alone is not the gate — a read in flight has no archive yet, and
        falling back to the list for the length of a round trip would flash the view the presenter
        just left.
      -->
      <ChatArchiveLogPane
        {log}
        {isPresenter}
        onrestore={() => {
          const open = log.archive;
          if (!open) return;
          /*
            The list's own `restore`, so there is one confirm string and one send. It reloads the
            list on success, and this returns to it — restoring the archive you are reading leaves
            nothing to read.
          */
          archive.restore(open);
          log.back();
        }}
      />
    {:else}
      <ChatArchivePane
        archives={archive.archives}
        channels={archive.channels}
        bind:channel
        loading={archive.loading}
        error={archive.error}
        onreload={() => void archive.reload()}
        onarchiveall={() => archive.archiveAll()}
        onarchiveolder={(value) => archive.archiveOlderThan(value)}
        onrestore={(entry) => archive.restore(entry)}
        onopen={(entry) => void log.open(entry)}
      />
    {/if}
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-chat-logs-modal>
<app-alert-logs-modal>
  <Modal
    id="alerts-logs-modal"
    open={name === 'alert-logs'}
    ariaLabelledby="alerts-logs-modal"
    title="Alerts Logs"
    {onclose}
    footerClass="text-center"
  >
    <div>
      <button type="button" class="btn btn-primary my-2">Reload Log List</button>
      <div class="list-group">
        <h5 class="mt-2">There are no archived alerts at this time</h5>
      </div>
    </div>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal>
</app-alert-logs-modal>
