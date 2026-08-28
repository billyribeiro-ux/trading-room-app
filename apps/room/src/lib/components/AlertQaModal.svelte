<script lang="ts">
  import { ngbTooltip, ngbTooltipWith } from '#lib/ngb-tooltip.js';
  import { alertDateFormatter } from '#lib/message-formatters.js';
  import { appendMention } from '#lib/mention-insert.js';
  import type { RoomMessageChrome } from '#lib/room-message-chrome.js';
  import type {
    MessageAction,
    MessageActionItem,
    MessageReactionPayload,
    MessageReactions,
    TradeCopyPayload
  } from '#lib/types.js';
  import EmojiPicker from './EmojiPicker.svelte';
  import Modal from './Modal.svelte';
  import RoomMessage from './RoomMessage.svelte';

  /**
   * `app-alert-qa-modal` — the Q&A thread on one alert.
   *
   * ## Why it is its own component
   *
   * It was ~160 lines of `ModalHost.svelte` plus eight pieces of state and three functions, and on
   * 2026-08-28 it grew a menu that acts. `source-size-contract.test.ts` refused the raise, which is
   * exactly what that ratchet is for: the answer to a file outgrowing its ceiling is to take a
   * self-contained piece out of it, not to move the number.
   *
   * This is the self-contained piece. Everything below belongs to one modal and nothing else in the
   * host reads any of it.
   *
   * ## The entries are ALERTS, and that is the reference's own choice
   *
   * The captured modal's constructor sets `this.isQAMsg = !0, this.logType = "alerts"` (bundle byte
   * 2,334,347) and passes both to every entry along with the parent alert's id (2,332,907). So a
   * thread entry renders through the same `app-st-message` the room uses, as an ALERT that knows it
   * is inside this modal — which is what `enableQAReactions` gates, and what three other menu
   * entries turn on as a side effect. `message-behavior.ts` names those three and says why they are
   * not drawn.
   *
   * `alertLabels` is deliberately not passed: the body pipe receives `e.isQAMsg ? null :
   * alertLabels`, so a hash inside a question stays text.
   */
  let {
    open,
    /** The ALERT the thread belongs to. Its id is what selects the questions below. */
    targetMessage,
    alertQuestions = [],
    messageChrome,
    isPresenter,
    onclose,
    onQuestionSend,
    onQaAction
  }: {
    open: boolean;
    /*
      The narrow shape `ModalHost` holds, not `MessageActionItem`: the header reproduces the alert
      card and reads exactly these five fields. Widening it here would be claiming a dependency this
      modal does not have.
    */
    targetMessage: {
      id: number;
      senderName: string;
      body: string;
      senderAvatarUrl?: string;
      createdAt?: Date | string;
      evidenceTimestampText?: string;
    } | null;
    alertQuestions?: readonly {
      id: number;
      alertId: number;
      senderId: number;
      body: string;
      createdAt: Date | string;
      senderName: string;
      senderEmailHash: string;
      senderAvatarUrl: string;
      senderRole: string;
      /**
       * The row's own reactions, validated on the SERVER by `parseReactions` before they travel —
       * the same shape and the same route every other rendered message takes.
       */
      reactions: MessageReactions;
    }[];
    messageChrome: RoomMessageChrome;
    /** Drives the composer's placeholder and the image button, which is `canPostImages` upstream. */
    isPresenter: boolean;
    onclose: () => void;
    onQuestionSend: (body: string) => Promise<boolean>;
    /**
     * What a Q&A entry's menu asks for. `mention` never arrives — this component owns the thread's
     * composer, so it inserts that one itself.
     */
    onQaAction: (
      action: MessageAction,
      item: MessageActionItem,
      payload?: MouseEvent | MessageReactionPayload | TradeCopyPayload
    ) => void;
  } = $props();

  let qaComposer = $state('');
  let qaEmojiOpen = $state(false);
  let qaMenuQuestionId = $state<number | null>(null);
  const qaQuestions = $derived(
    alertQuestions.filter((question) => question.alertId === targetMessage?.id)
  );
  const qaTimeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  // Captured alerts carry the timestamp exactly as it was rendered; database rows are formatted.
  /*
    The tooltip beside the visible time, which the reference BINDS rather than writes:
    `xn("ngbTooltip", Ct(27, 24, e.msg.t, "short"))` against a visible `hh:mm a`. Angular's
    `date:'short'` for en-US is `M/d/yy, h:mm a`, which is exactly what `alertDateFormatter` already
    produces — reused rather than re-derived, because a second formatter for the same shape is how
    two of them drift apart.

    Empty when there is no timestamp to format: `ngbTooltipWith` renders nothing for an empty string,
    which matches a reference binding that evaluates to nothing.
  */
  const qaAlertTooltip = $derived.by(() => {
    if (!targetMessage) return '';
    return 'createdAt' in targetMessage && targetMessage.createdAt
      ? alertDateFormatter.format(new Date(targetMessage.createdAt as string | Date))
      : '';
  });
  const qaAlertTimestamp = $derived.by(() => {
    if (!targetMessage) return '';
    if ('evidenceTimestampText' in targetMessage && targetMessage.evidenceTimestampText) {
      return targetMessage.evidenceTimestampText;
    }
    return 'createdAt' in targetMessage && targetMessage.createdAt
      ? qaTimeFormatter.format(new Date(targetMessage.createdAt as string | Date))
      : '';
  });

  async function sendQuestion() {
    const body = qaComposer.trim();
    if (!body) return;
    if (await onQuestionSend(body)) {
      qaComposer = '';
      qaEmojiOpen = false;
    }
  }

  /**
   * What a Q&A entry's kebab menu does — the thread's half of it.
   *
   * TWO things are decided here and everything else is forwarded, and the split follows what each
   * action acts on:
   *
   * * **`mention`** never leaves this component. Upstream routes it by the same rule —
   *   `doMention(e) { guiEventBus.emit(this.isQAMsg ? "doQAMention" : …) }` — and the Q&A modal
   *   subscribes to `doQAMention` itself, because the composer it writes into is its own
   *   (`#textAreaQATxt`, bundle byte 2,334,700). Routing it through the page would have inserted the
   *   name into the chat column behind the modal.
   * * **the open menu** is this component's state, not the log's, so it closes here. `reaction` is
   *   excluded exactly as the log's dispatcher excludes it: the picker opens FROM the menu, so
   *   closing on the click that opens it would close the picker with it.
   *
   * Everything else — delete, react, user info, private chat, mute, copy, copy-trade — is the same
   * act from either surface and goes to the one dispatcher that owns it.
   */
  function runQaAction(
    action: MessageAction,
    item: MessageActionItem,
    payload?: MouseEvent | MessageReactionPayload | TradeCopyPayload
  ) {
    if (action !== 'reaction') qaMenuQuestionId = null;
    if (action === 'mention') {
      qaComposer = appendMention(qaComposer, item.senderName);
      return;
    }
    onQaAction(action, item, payload);
  }

  // Mirrors the reply composer: Enter sends, Shift+Enter is ignored, Alt+Enter inserts a newline.
  // The captured textarea had no handler at all, so pressing Enter did nothing.
  function handleQaKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    // Shift+Enter and Alt+Enter insert a line break: fall through so the textarea does it
    // natively, which puts the break at the caret and keeps undo history intact. Calling
    // preventDefault() before this check swallowed the keystroke and produced no newline at all.
    if (event.shiftKey || event.altKey) return;
    event.preventDefault();
    void sendQuestion();
  }
</script>

<app-alert-qa-modal>
  <Modal
    id="alertQAModal"
    {open}
    ariaLabelledby="alertQALabel"
    rootClass="fade modal"
    rootRole={null}
    rootAttributes={{ 'data-keyboard': 'false', 'data-backdrop': 'static' }}
    dialogRole={null}
    {onclose}
    headerClass="align-items-start"
    footerClass="flex-nowrap"
    bodyStyle="max-height: 70vh;"
  >
    {#snippet header()}
      <div class="flex-fill">
        <h5 id="alertQALabel" class="modal-title">Q&amp;A for Alert:</h5>
        <div class="admin-alert mt-2">
          <div
            {...{ clas: 'd-flex flex-column  align-items-center w-100' } as Record<string, string>}
          >
            <div class="mr-1 d-flex flex-row-reverse">
              <div
                class="d-flex flex-row-reverse justify-content-center align-items-start flex-nowrap mt-1"
              >
                <div class="avatar pl-1">
                  <img
                    alt="qaMsg.avt"
                    src={targetMessage?.senderAvatarUrl ??
                      'https://secure.gravatar.com/avatar/?d=mm&s=50'}
                    loading="lazy"
                    width="50"
                    height="50"
                  />
                </div>
              </div>
              <div class="w-100">
                <div class="d-flex justify-content-between align-items-center w-100">
                  <span
                    {...{ placement: 'top' } as Record<string, string>}
                    {@attach ngbTooltipWith(qaAlertTooltip)}
                    class="created-at mr-2">{qaAlertTimestamp}</span
                  >
                  <div class="d-flex align-items-center justify-content-between flex-nowrap">
                    <strong class="username mx-1">{targetMessage?.senderName ?? ''}</strong>
                  </div>
                </div>
                <div class="msg-left text-formated preText ml-2 mr-2 p-0">
                  {targetMessage?.body ?? ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/snippet}
    {#if qaQuestions.length === 0}
      <div class="my-2">There are no questions.</div>
    {:else}
      <!--
        The captured modal body renders each question through the same <app-st-message> component
        the room uses, as `msg-box pb-1 msg-box-adm` in its reversed layout - not a bespoke list.
      -->
      {#each qaQuestions as question (question.id)}
        <RoomMessage
          item={{
            id: question.id,
            senderId: question.senderId,
            senderName: question.senderName,
            senderEmailHash: question.senderEmailHash,
            senderAvatarUrl: question.senderAvatarUrl,
            body: question.body,
            createdAt: new Date(question.createdAt),
            // Follows the sender, not the viewer. The captured reader-side modal renders another
            // reader's question as plain `msg-box pb-1` in the forward layout and the presenter's
            // answer as `msg-box pb-1 msg-box-adm` reversed; the compiled source picks its toast
            // wording the same way (`const f = s.isA ? 'answer' : 'question'`). Hardcoding true
            // made every entry, including a reader's own question, render as a presenter's.
            isAdmin: question.senderRole === 'staff' || question.senderRole === 'admin',
            // Validated on the server before it travelled - see `loadQuestionsForAlerts`.
            reactions: question.reactions,
            // The captured question body carries `questionColor`. RoomMessage otherwise infers that
            // from the text containing a "?", which would drop the colour for a question phrased
            // without one - and inside this modal every entry is a question by definition.
            evidenceQuestion: true
          }}
          {...messageChrome}
          kind="alert"
          isQaMessage={true}
          menuOpen={qaMenuQuestionId === question.id}
          showDateSeparator={false}
          ontoggle={(id) => (qaMenuQuestionId = qaMenuQuestionId === id ? null : id)}
          onaction={runQaAction}
        />
      {/each}
    {/if}
    {#snippet footer()}
      <div id="textAreaHolder" class="d-flex align-items-center textSendDiv flex-fill">
        <div class="flex-fill d-flex mx-0">
          <div class="px-0 flex-fill">
            <textarea
              name="txt-area"
              id="textAreaQATxt"
              rows="1"
              spellcheck="true"
              class="txt-area form-control border-0"
              placeholder={isPresenter ? 'Type your answer here...' : 'Type your question here...'}
              bind:value={qaComposer}
              onkeydown={handleQaKeydown}></textarea>
          </div>
          <div
            class="justify-content-center d-flex flex-row align-items-center justify-content-center p-0 m-0 text-center textAreaBtnsCol"
          >
            <span
              {...{
                placement: 'auto',
                container: 'body',
                autoclose: 'outside',
                popoverclass: 'popOverDiv'
              } as Record<string, string>}
              class="textAreaBtns"
              aria-describedby={qaEmojiOpen ? 'ngb-popover-qa-emoji' : undefined}
              onclick={() => (qaEmojiOpen = !qaEmojiOpen)}
            >
              <i
                {...{ placement: 'left', ngbtooltip: 'Add Emojis' } as Record<string, string>}
                {@attach ngbTooltip}
                class="far fa-smile"
              ></i>
            </span>
            {#if qaEmojiOpen}
              <EmojiPicker
                popoverId="ngb-popover-qa-emoji"
                onselect={(glyph) => (qaComposer += glyph)}
              />
            {/if}
            <!--
              The compiled component gates this node on `canPostImages`
              (`O(23, o.canPostImages ? 23 : -1)` in app-alert-qa-modal.full.js), which is why the
              captured reader-side footer carries only the emoji button.
            -->
            {#if isPresenter}
              <span class="textAreaBtns">
                <i
                  {...{
                    ngbtooltip: 'Upload an Image',
                    placement: 'left'
                  } as Record<string, string>}
                  {@attach ngbTooltip}
                  class="fas fa-image"
                ></i>
              </span>
            {/if}
          </div>
        </div>
      </div>
    {/snippet}
  </Modal>
</app-alert-qa-modal>
