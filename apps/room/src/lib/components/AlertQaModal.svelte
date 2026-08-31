<script lang="ts">
  import { tick } from 'svelte';

  import { sameCalendarDay } from '#lib/message-formatters.js';
  import { appendMention } from '#lib/mention-insert.js';
  import type { RoomMessageChrome } from '#lib/room-message-chrome.js';
  import type { ChatDisplayMode } from '#lib/chat-display-mode.js';
  import type {
    MessageAction,
    MessageActionEvent,
    MessageActionItem,
    MessageReactions
  } from '#lib/types.js';
  import AlertQaAlertCard from './AlertQaAlertCard.svelte';
  import AlertQaComposer from './AlertQaComposer.svelte';
  import Modal from './Modal.svelte';
  import RoomMessage from './RoomMessage.svelte';
  import { presenterColorsFor, type PresenterColorMap } from '#lib/presenter-colors.js';

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
    presenterColors,
    displayMode,
    isPresenter,
    canPostImages,
    onimageupload,
    onimagepaste,
    chatGif,
    copyTrades,
    onAlertBodyAction,
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
    /**
     * Every presenter's message colours for this room, keyed by the sender's email hash.
     *
     * The thread renders through the same `app-st-message` the room does, and the reference applies
     * `presenterSettings[msg.avt]` inside that component with no exception for the modal — so a
     * presenter's ANSWER in this thread carries their colours here too. `followedUsers` is a
     * different case and is still not passed: this component has never had it, and adding it would
     * be a behaviour change with no evidence asked for.
     */
    presenterColors: PresenterColorMap;
    /**
     * The thread renders in the ALERTS mode, not a mode of its own.
     *
     * Upstream's Q&A modal calls `loadAlertsMode()` — byte 2,335,599, the same function the alerts
     * log calls — rather than having a third preference key. Reproduced: a key of its own would let
     * the thread drift from the log it belongs to.
     */
    displayMode: ChatDisplayMode;
    /**
     * Drives the composer's placeholder — `o.appService.globals.isPresenter ? "Type your answer
     * here..." : "Type your question here..."`, byte 2,344,220.
     *
     * It used to drive the image button too, and that was `QAM-05`'s second half: the reference
     * gates that button on `canPostImages`, which is `(isPresenter || sessData.userUploads)`. Two
     * questions, two props.
     */
    isPresenter: boolean;
    /** `QAM-05` — `(isPresenter || sessData.userUploads)`, byte 2,334,626. Forwarded, not derived. */
    canPostImages: boolean;
    /** `imgUpload()` — the Q&A thread's OWN upload path; see `RoomMessageActions`. */
    onimageupload: () => void;
    /** `QAM-06` — a screenshot pasted into the Q&A composer, with that box's own draft. */
    onimagepaste: (file: File, draft: string) => void;
    /** `QAM-10` — `preferences.chatGif`, forwarded to the header card's piped body. */
    chatGif: boolean;
    /** `QAM-10` — `sessData.copyTrades`, the reference's own template discriminator. */
    copyTrades: boolean;
    /**
     * `QAM-10` — a click inside the header card's body: an image, a link, a copied trade.
     *
     * It acts on the ALERT, not on a thread entry, which is why it is a separate callback from
     * `onQaAction` beside it. The page holds the full `MessageActionItem` and dispatches there; this
     * modal only knows that a click happened.
     */
    onAlertBodyAction: (action: MessageAction, payload?: MessageActionEvent) => void;
    onclose: () => void;
    onQuestionSend: (body: string) => Promise<boolean>;
    /**
     * What a Q&A entry's menu asks for. `mention` never arrives — this component owns the thread's
     * composer, so it inserts that one itself.
     */
    onQaAction: (
      action: MessageAction,
      item: MessageActionItem,
      payload?: MessageActionEvent
    ) => void;
  } = $props();

  let qaComposer = $state('');
  let qaMenuQuestionId = $state<number | null>(null);
  const qaQuestions = $derived(
    alertQuestions.filter((question) => question.alertId === targetMessage?.id)
  );

  /**
   * `QAM-01` — the date separator between entries, which the reference passes as `prevD`.
   *
   * `("prevD", i > 0 ? o.msgs[i-1].t : 0)` at byte 2,332,963 (`i3e`, the regular renderer) and
   * again at 2,333,284 (`s3e`, the compact one). `app-st-message` turns it into the flag its own
   * template gates the separator on:
   *
   * ```js
   * this.prevD && (this.prevD = new Date(this.prevD), this.msg.t = new Date(this.msg.t),
   *                this.isND = this.msg.t.getDay() != this.prevD.getDay())
   * ```
   *
   * at byte 1,346,064, read by `O(2, o.isND ? 2 : -1)` at 1,361,572. `showDateSeparator={false}`
   * was hardcoded here, so a thread that ran past midnight — which an alert's Q&A routinely does,
   * since the alert stays open for as long as the position does — showed one unbroken run of times
   * with no day boundary anywhere.
   *
   * `sameCalendarDay` and not `getDay()`: upstream compares the DAY OF THE WEEK, so two messages
   * exactly seven days apart compare equal and the separator is skipped. That is a defect and this
   * repository already decided against reproducing it — the same helper draws the separator in both
   * chat columns, and `message-formatters.ts:118` compares year, month and date.
   *
   * `index > 0` reproduces the `i > 0 ? … : 0` half exactly: the first entry has no predecessor, so
   * `prevD` is `0`, so `this.prevD &&` is false, so `isND` stays at its `!1` initial value.
   */
  function showsDateSeparator(index: number) {
    if (index === 0) return false;
    return !sameCalendarDay(
      new Date(qaQuestions[index].createdAt),
      new Date(qaQuestions[index - 1].createdAt)
    );
  }
  /* `| null` — what `bind:this` writes on teardown; every read below guards for it. */
  let host = $state<HTMLElement | null>(null);

  /**
   * `QAM-03` — the thread opens on its NEWEST entry, which is what `scrollToBottomQA` does.
   *
   * ```js
   * scrollToBottomQA(){const e=this;try{setTimeout(()=>{
   *   e.qaContainer.nativeElement.scrollTop=e.qaContainer.nativeElement.scrollHeight},500)}catch{}}
   * ```
   *
   * at byte 2,335,916, called from three places: on `openAlertQAModal` once the thread is assigned
   * (2,334,927 and the lines after it), from `ngAfterViewInit`, and at the end of `sendMessage`.
   * `qaContainer` is the `.modal-body` itself — reference index 0 in the consts table, attached by
   * `d(9,"div",10,0)` where const 10 is `[1,"modal-body"]`.
   *
   * The container really does scroll: `#alertQAModal .modal-body` is
   * `min-height:330px; max-height:70vh; height:100%; overflow-y:auto` in the component's own
   * stylesheet at byte 2,344,478, transcribed into
   * `captured-runtime-components.css:5400`. Without this, opening the Q&A on an alert with a long
   * thread showed the OLDEST question and the answer everyone came for was below the fold.
   *
   * ## Why an effect, and why it reads a count
   *
   * The trigger is the modal being shown and the thread growing — both arrive as props, neither is
   * a user gesture in this component — and the product is a scroll position, which is the first
   * thing Svelte's docs name effects for. `qaQuestions.length` is read so a question ARRIVING
   * re-runs it, which is the `sendMessage` call site above; the send itself is deliberately not a
   * second trigger, because the optimistic path and the server echo would then scroll twice.
   *
   * `tick()` rather than the reference's `setTimeout(…, 500)`: the wait exists because Bootstrap's
   * `.modal("show")` animates, and what is actually being waited for is the body having a layout to
   * measure. `Modal` sets `display: block` in the same flush that flips `open`, so one microtask
   * after the DOM update is exactly that moment and half a second of nothing is not needed.
   */
  $effect(() => {
    if (!open) return;
    /* Read reactively: a new question must re-run this, not just the modal opening. */
    const count = qaQuestions.length;
    const body = host?.querySelector('.modal-body');
    if (count === 0 || !(body instanceof HTMLElement)) return;
    void tick().then(() => {
      body.scrollTop = body.scrollHeight;
    });
  });

  /**
   * `QAM-02` — the composer is emptied when the modal is opened, and it was not.
   *
   * `i && (yi("#alertQAModal").modal("show"), this.modalId = e._id, yi("#textAreaQATxt").val(""))`
   * at byte 2,334,927 — the `openModal` half of the `openAlertQAModal` subscription, so the clear
   * happens on an OPEN and not on the thread refreshes that follow it.
   *
   * `Modal` keeps this component mounted and toggles `display`, so `qaComposer` survived every
   * close. Half a question typed against alert A, abandoned, then Q&A opened on alert B, and the
   * fragment was sitting in the box addressed to the wrong alert — one Enter away from being posted
   * there. That is the reason this is a defect rather than a tidiness point.
   *
   * A PLAIN FIELD and not `$state`: nothing renders from it, and an effect that reads its own
   * marker reactively re-runs on the write that was meant to end it. `arrivals.ts` records the same
   * reasoning for the same shape.
   */
  let openedAlertId: number | null = null;

  $effect(() => {
    if (!open) {
      openedAlertId = null;
      return;
    }
    const id = targetMessage?.id ?? null;
    if (openedAlertId === id) return;
    openedAlertId = id;
    qaComposer = '';
  });

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
    payload?: MessageActionEvent
  ) {
    if (action !== 'reaction') qaMenuQuestionId = null;
    if (action === 'mention') {
      qaComposer = appendMention(qaComposer, item.senderName);
      return;
    }
    onQaAction(action, item, payload);
  }
</script>

<!--
  `QAM-12` — the reference's root class is BOUND, and the binding is deliberately not reproduced.

  `Rh("modal fade ", o.qaMsg._id, "")` at byte 2,344,038 concatenates the ALERT'S OWN ID onto the
  class list, so the dialog wears a class named after a database row. Its one reader is four
  hundred bytes away at 2,334,927:

  ```js
  yi(`.${e._id}`).on("hidden.bs.modal",()=>{e.hasOwnProperty("unreadQA")&&delete e.unreadQA})
  ```

  — a jQuery selector finding this dialog by that class in order to hang a Bootstrap
  `hidden.bs.modal` listener on it. MEASURED AND REFUSED, and the refusal is safe because **the
  effect that listener has is already built**: `RoomModals.closeActive` (`room/modals.svelte.ts:167`)
  clears `unreadQaAlertIds` for the selected alert on the way out and quotes this very line as its
  reason. Nothing in this room dispatches `hidden.bs.modal` — the only two occurrences of the string
  in `src/` are that comment and this one — so the class would be a selector target for a listener
  that does not exist. A class with no rule and no reader is the "no `.flipped` class with no CSS"
  case, and this one would additionally be unstable — a different string on every alert.

  `"fade modal"` against the reference's `"modal fade "` is order alone, which CSS does not read.
-->
<app-alert-qa-modal bind:this={host}>
  <!--
    `QAM-07` — `bodyStyle="max-height: 70vh;"` was here and is gone.

    It restated one declaration of a four-declaration rule this repository already carries:
    `#alertQAModal .modal-body{min-height:330px;max-height:70vh;height:100%;overflow-y:auto}` is the
    component's own stylesheet at byte 2,344,478, transcribed at
    `captured-runtime-components.css:5400-5405`. An inline copy of one of the four wins the cascade
    for that one and says nothing about the other three, so a reader comparing the modal to the
    capture found the height in two places and the overflow in neither of them — and the inline copy
    is the one that goes stale, because it is not what `pnpm css:sync-captured` regenerates.
  -->
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
  >
    {#snippet header()}
      <AlertQaAlertCard alert={targetMessage} {chatGif} {copyTrades} onaction={onAlertBodyAction} />
    {/snippet}
    {#if qaQuestions.length === 0}
      <div class="my-2">There are no questions.</div>
    {:else}
      <!--
        The captured modal body renders each question through the same <app-st-message> component
        the room uses, as `msg-box pb-1 msg-box-adm` in its reversed layout - not a bespoke list.

        `QAM-13` — and the choice between `app-st-message` and `app-st-compactmessage` is the
        display mode's: `a3e` at byte 2,333,453 is `O(0, "r" == g().displayMode ? 0 : 1)` over two
        loops that differ only in the element they instantiate. ALREADY BUILT, one level down:
        `RoomMessage.svelte:578` branches on `displayMode === 'c'` and renders
        `app-st-compactmessage` itself, so the branch the reference draws here is drawn there for
        all three surfaces that render a message. Recorded rather than duplicated.
      -->
      {#each qaQuestions as question, index (question.id)}
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
          presenterStyle={presenterColorsFor(presenterColors, question.senderEmailHash)}
          {displayMode}
          kind="alert"
          isQaMessage={true}
          menuOpen={qaMenuQuestionId === question.id}
          showDateSeparator={showsDateSeparator(index)}
          ontoggle={(id) => (qaMenuQuestionId = qaMenuQuestionId === id ? null : id)}
          onaction={runQaAction}
        />
      {/each}
    {/if}
    {#snippet footer()}
      <AlertQaComposer
        bind:composer={qaComposer}
        {isPresenter}
        {canPostImages}
        {onimageupload}
        {onimagepaste}
        onsend={onQuestionSend}
      />
    {/snippet}
  </Modal>
</app-alert-qa-modal>
