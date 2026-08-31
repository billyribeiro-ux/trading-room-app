import { isHttpError } from '@sveltejs/kit';

import { NO_REPORTS_FOUND } from '#lib/message-behavior.js';
import { toggleReaction } from '#lib/reaction-toggle.js';
import type {
  MessageAction,
  MessageActionItem,
  MessageReactionPayload,
  TradeCopyPayload,
  ModalName,
  ModalTargetUser
} from '#lib/types.js';

import type { RoomChat } from './chat.svelte';
import type { RoomComposer } from './composer.svelte';
import type { RoomDialogs } from './dialogs.svelte';
import type { EvidencePatch } from './feeds.svelte';
import { RoomMessageDeletion, type AlertDeleteCheck } from './message-delete';
import { modalTargetFromMessage } from './modal-target';
import type { RoomToasts } from './toasts.svelte';

/** The one wire command every operation here goes through. */
export type MessageOperation =
  | { kind: 'alert' | 'chat'; id: number; operation: 'delete' | 'markAnswered' | 'showMsgToAll' }
  /* No coordinate: it mutes a USER. See the union member in `message-actions.remote.ts`. */
  | { operation: 'mute24'; targetUserId: number }
  | {
      kind: 'alert' | 'chat';
      id: number;
      operation: 'edit';
      newBody: string;
      newBodyHtml?: string;
    }
  | {
      kind: 'alert' | 'chat';
      id: number;
      operation: 'reaction';
      reactionKey: string;
      reactionEmoji: string;
    };

/*
  What a click on a MESSAGE can do — delete it, edit it, react to it, report it, mute its sender,
  open a private chat with them.

  Phase 5 slice 8, and it went LAST of the domain slices deliberately. `handleMessageAction` is a
  dispatcher over fourteen actions, and when this phase began it reached into rich-text composer
  state, the private-chat panel, the evidence overlay, the modal shell and the mention router — all
  of them page-level then, all of them their own class now. Extracting it first would have meant a
  dozen injected callbacks rewritten three times as those slices landed. Waiting cost nothing and
  the constructor is a list of collaborators rather than a list of workarounds.

  ## One operation, one refusal, four optimistic paths

  `#runOperation` is the single wire call. Four actions apply an OPTIMISTIC change first — delete
  hides, markAnswered ticks, edit rewrites the body, reaction toggles the pill — and every one of
  them puts the row back when the server refuses. That pairing is the reason they are one class:
  each optimistic write has exactly one undo and they must not drift apart.

  ## The refusal is a REJECTION, not a status

  A form action answered `response.ok === false` with a `fail` in the body and a 200 status, which
  every call site was free to ignore — and one did. A remote command rejects, so a refusal has to be
  caught to be dropped.

  ## What it does NOT decide

  **The four reaction rules.** `toggleReaction` in `#lib/reaction-toggle.js` is the same function the
  SERVER applies, called here for the optimistic half so the two cannot disagree.

  **Who may act.** Every operation re-checks on the server. What moved is which control is drawn and
  what it asks before sending.

  **Whether an edit is rich.** `RoomComposer` owns the editor and `canUseRTE`; this class asks it.
*/
export class RoomMessageActions {
  readonly #dialogs: RoomDialogs;
  readonly #toasts: RoomToasts;
  readonly #chat: RoomChat;
  readonly #composer: RoomComposer;
  readonly #session: () => { user: { id: number; role: string; emailHash: string } };
  readonly #sendOperation: (payload: MessageOperation) => Promise<unknown>;
  readonly #askQuestion: (payload: { body: string; alertId: number }) => Promise<void>;
  readonly #reactToQuestion: (payload: {
    questionId: number;
    reactionKey: string;
    reactionEmoji: string;
  }) => Promise<void>;
  readonly #editQuestion: (payload: { questionId: number; body: string }) => Promise<void>;
  readonly #replyMessage: (payload: { body: string; messageId: number }) => Promise<void>;
  readonly #openModal: (name: Exclude<ModalName, null>) => void;
  /**
   * `QAM-05` — closing the Q&A modal, which ONLY the image path does.
   *
   * `doImggurUpload` on `app-alert-qa` ends `…sendAlertQAReply(qaMsg._id, imggurUploadTxt),
   * imggurUploadTxt="", yi("#alertQAModal").modal("hide")` at byte 2,338,987, where the TEXT reply
   * beside it (`sendMessage`, byte 2,337,247) clears the box and calls `scrollToBottomQA()` and does
   * not hide anything. That asymmetry is upstream's and is reproduced rather than smoothed.
   */
  readonly #closeModal: () => void;
  readonly #closeMessageMenu: () => void;
  readonly #selectUser: (user: ModalTargetUser) => void;
  readonly #patchEvidence: (item: MessageActionItem, patch: EvidencePatch) => void;
  readonly #openPrivateChat: (peerId: number) => void;
  readonly #openImage: (event: MouseEvent | undefined, url: string) => void;
  readonly #clearUnreadQa: (id: number) => void;
  readonly #focusComposer: () => void;
  readonly #onChanged: () => Promise<void>;

  /**
   * The delete branch, which is a collaborator rather than a region — see the `action === 'delete'`
   * arm of {@link handle} for what moved and why, and `room/message-delete.ts` for the door it
   * brought with it.
   *
   * **`#deleteQuestion` HAS NO FIELD ABOVE, and that is not an omission.** It is forwarded straight
   * from the constructor into this collaborator, which is now its only caller, so a field here would
   * be one nothing reads. The option is still accepted, and a reader who goes looking for the wire
   * should find it there rather than conclude it was dropped.
   */
  readonly #deletion: RoomMessageDeletion;

  /**
   * Whether the user modal currently on screen was opened from the EXTRA chat column.
   *
   * Upstream this lives ON the modal component, set by the `doUserInfoExtra` subscriber. It is here
   * because the modal in this room is a rendering of state the room owns, and a component field
   * that survives the modal closing is the shape that goes stale. See {@link mentionFromUserModal}.
   */
  #userInfoFromExtraColumn = false;

  #selectedMessage: MessageActionItem | null;

  constructor(options: {
    dialogs: RoomDialogs;
    toasts: RoomToasts;
    chat: RoomChat;
    composer: RoomComposer;
    session: () => { user: { id: number; role: string; emailHash: string } };
    sendOperation: (payload: MessageOperation) => Promise<unknown>;
    askQuestion: (payload: { body: string; alertId: number }) => Promise<void>;
    /**
     * The two commands that act on a Q&A THREAD ENTRY, which is a question and not a message.
     *
     * Separate from `sendOperation` because they address a different thing: `alert_questions` rows
     * have their own ids and their own room column, and `messageAction`'s `{ kind, id }` target has
     * no third value that would mean "question". See `routes/alert-questions.remote.ts`.
     */
    reactToQuestion: (payload: {
      questionId: number;
      reactionKey: string;
      reactionEmoji: string;
    }) => Promise<void>;
    deleteQuestion: (payload: { questionId: number }) => Promise<void>;
    /** `editQAMessage` — a presenter corrects one thread entry. Presenter-gated on the server. */
    editQuestion: (payload: { questionId: number; body: string }) => Promise<void>;
    replyMessage: (payload: { body: string; messageId: number }) => Promise<void>;
    openModal: (name: Exclude<ModalName, null>) => void;
    /** `$("#alertQAModal").modal("hide")` — see the field. */
    closeModal: () => void;
    closeMessageMenu: () => void;
    /** `RoomUserActions` owns who is selected; this tells it who was clicked. */
    selectUser: (user: ModalTargetUser) => void;
    /** `RoomFeeds` owns the optimistic overlay; this is the only writer outside it. */
    patchEvidence: (item: MessageActionItem, patch: EvidencePatch) => void;
    openPrivateChat: (peerId: number) => void;
    openImage: (event: MouseEvent | undefined, url: string) => void;
    clearUnreadQa: (id: number) => void;
    /** The caret, which belongs to the element and so stays with the page. */
    focusComposer: () => void;
    onChanged: () => Promise<void>;
    /**
     * The `deleteAlertPW` door, forwarded to `RoomMessageDeletion`. Beside `sendOperation` rather
     * than inside it: it is a question about this room's CONFIGURATION, not a seventh thing
     * `messageAction` can do. See `room/message-delete.ts`.
     */
    checkAlertDeletePassword: AlertDeleteCheck;
  }) {
    this.#dialogs = options.dialogs;
    this.#toasts = options.toasts;
    this.#chat = options.chat;
    this.#composer = options.composer;
    this.#session = options.session;
    this.#sendOperation = options.sendOperation;
    this.#askQuestion = options.askQuestion;
    this.#reactToQuestion = options.reactToQuestion;
    this.#editQuestion = options.editQuestion;
    this.#replyMessage = options.replyMessage;
    this.#openModal = options.openModal;
    this.#closeModal = options.closeModal;
    this.#closeMessageMenu = options.closeMessageMenu;
    this.#selectUser = options.selectUser;
    this.#patchEvidence = options.patchEvidence;
    this.#openPrivateChat = options.openPrivateChat;
    this.#openImage = options.openImage;
    this.#clearUnreadQa = options.clearUnreadQa;
    this.#focusComposer = options.focusComposer;
    this.#onChanged = options.onChanged;

    this.#deletion = new RoomMessageDeletion({
      dialogs: options.dialogs,
      session: options.session,
      // The shared wire call and its one refusal path, handed over rather than copied.
      runDelete: (kind, item) => this.#runOperation(kind, item, 'delete'),
      deleteQuestion: options.deleteQuestion,
      patchEvidence: options.patchEvidence,
      onChanged: options.onChanged,
      checkAlertDeletePassword: options.checkAlertDeletePassword
    });

    this.#selectedMessage = $state<MessageActionItem | null>(null);
  }

  /**
   * The two sends that act on the modal's selected message.
   *
   * One helper behind both, because they differed only in the command called — two copies of a
   * refusal path is how one of them ends up refetching anyway. Arrow FIELDS rather than methods, as
   * they were on the page: both are handed to a modal as props, and a plain method would lose
   * `this` on the way.
   */
  sendAlertQuestion = (body: string) =>
    this.#sendAgainstSelected(
      (alertId) => this.#askQuestion({ body, alertId }),
      'Question not sent.'
    );

  sendReplyMessage = (body: string) =>
    this.#sendAgainstSelected(
      (messageId) => this.#replyMessage({ body, messageId }),
      'Reply not sent.'
    );

  /**
   * ── `QAM-05` / `QAM-06` — an image answered into a Q&A thread ───────────────────────────────
   *
   * ## The register's prescribed one-line fix was WRONG, and the bundle is what says so
   *
   * `QAM-05` proposed `onimageupload={() => composer.openImageUpload()}` — *"the same path both
   * chat composers already use"*. That path posts to CHAT. `doImggurUpload` on `app-alert-qa`
   * (byte **2,338,987**) does not:
   *
   * ```js
   * s.imggurUploadTxt += s.imggurUploadTxt && s.imggurUploadTxt.length>0 ? " "+F : F,
   * o||(i&&(s.imggurUploadTxt+=" "+i, yi("#textAreaQATxt").val("")),
   *     s.appService.sendAlertQAReply(s.qaMsg._id, s.imggurUploadTxt),
   *     s.imggurUploadTxt="", yi("#alertQAModal").modal("hide")), r(_)
   * ```
   *
   * It ends in **`sendAlertQAReply`**, against `qaMsg._id`. Taking the prescription literally would
   * have put a presenter's answer to one member's question into the room's public chat — which is
   * exactly the failure `RoomOverlays` already records for the swing form (*"routing the swing
   * upload through the composer's handler would post the image into chat instead"*), with a worse
   * blast radius. The row is corrected in the register.
   *
   * So these live HERE, on the class that already owns `sendAlertQuestion` and the selected alert,
   * and they borrow only the room's raw uploader (`composer.uploadAlertFiles`) — the same seam
   * `RoomPrivateChat` and both trade-alert panes use. Nothing about the chat POST path is reused.
   *
   * ## Three details that are upstream's and read backwards
   *
   * **The modal HIDES afterwards, and only on this path.** `sendMessage` for a text reply (byte
   * **2,337,247**) clears the box and calls `scrollToBottomQA()`; it hides nothing. Only the image
   * branch calls `modal("hide")`.
   *
   * **The URL goes FIRST**, with the typed message appended — `imggurUploadTxt += " " + i` after
   * the link, not before it.
   *
   * **The box is cleared only when a message travels** (`i && (… , val(""))`), so a draft begun
   * during a slow upload survives.
   */
  #qaImageUpload = $state(false);
  #qaPastedImage = $state.raw<{ file: File; previewUrl: string } | null>(null);
  #qaPastedImageMessage = $state('');

  /** Whether the Q&A composer's upload dialog is on screen — `imgUpload()`, byte 2,337,470. */
  get qaImageUpload(): boolean {
    return this.#qaImageUpload;
  }

  /** The screenshot pasted into the Q&A composer, awaiting its confirmation. */
  get qaPastedImage(): { file: File; previewUrl: string } | null {
    return this.#qaPastedImage;
  }

  /** The message travelling with it — the dialog's `msg-text-qa` textarea. */
  get qaPastedImageMessage(): string {
    return this.#qaPastedImageMessage;
  }

  set qaPastedImageMessage(next: string) {
    this.#qaPastedImageMessage = next;
  }

  beginQaImageUpload(): void {
    this.#qaImageUpload = true;
  }

  cancelQaImageUpload(): void {
    this.#qaImageUpload = false;
  }

  /**
   * `imgUpload()` completed — ONE file, as the reference's own dialog allows.
   *
   * No message travels on this path: the reference's upload dialog has no message box (only the
   * PASTE confirmation does), so `doImggurUpload` is called with `i` defaulting to `null` and the
   * `i && (… val(""))` branch never runs. The composer is therefore NOT cleared here, which is why
   * this does not simply call `#sendQaImage` with an empty string and hope.
   */
  async completeQaImageUpload(files: readonly File[]): Promise<void> {
    this.#qaImageUpload = false;
    const [file] = files;
    if (!file) return;
    await this.#sendQaImage(file, '');
  }

  /** `onImagePaste(e)` on the Q&A composer — byte 2,339,887. The LAST image item wins. */
  beginQaImagePaste(file: File, draft: string): void {
    this.cancelQaImagePaste();
    this.#qaPastedImage = { file, previewUrl: URL.createObjectURL(file) };
    /* `a = yi("#textAreaQATxt").val().trim()` — this composer's own box, trimmed. */
    this.#qaPastedImageMessage = draft.trim();
  }

  cancelQaImagePaste(): void {
    const pending = this.#qaPastedImage;
    this.#qaPastedImage = null;
    this.#qaPastedImageMessage = '';
    if (pending) URL.revokeObjectURL(pending.previewUrl);
  }

  async confirmQaImagePaste(): Promise<void> {
    const pending = this.#qaPastedImage;
    if (!pending) return;
    const message = this.#qaPastedImageMessage.trim();
    this.#qaPastedImage = null;
    this.#qaPastedImageMessage = '';
    URL.revokeObjectURL(pending.previewUrl);
    await this.#sendQaImage(pending.file, message);
  }

  /**
   * Upload one file and answer the thread with it. Returns whether the reply travelled.
   *
   * The pending paste is taken and cleared by the caller BEFORE this awaits, so a presenter who
   * starts typing during a slow upload keeps what they typed — the same rule `composer.svelte.ts`
   * argues, and the reason the composed text is not routed through the box on its way out.
   */
  async #sendQaImage(file: File, message: string): Promise<boolean> {
    let url: string | undefined;
    try {
      [url] = await this.#composer.uploadAlertFiles([file]);
    } catch (cause) {
      console.error(cause);
      this.#dialogs.alert = 'Upload Failed...';
      return false;
    }
    if (!url) {
      this.#dialogs.alert = 'Upload Failed...';
      return false;
    }

    /* `imggurUploadTxt += " " + i` AFTER the link, not before it. */
    if (!(await this.sendAlertQuestion(message ? `${url} ${message}` : url))) return false;
    /* `yi("#alertQAModal").modal("hide")` — the image path only. */
    this.#closeModal();
    return true;
  }

  /** Which message the modals act on, or null when none has been clicked. */
  get selected(): MessageActionItem | null {
    return this.#selectedMessage;
  }

  /** `RoomPrivateChat` clears this when its panel closes. */
  clearSelected(): void {
    this.#selectedMessage = null;
  }

  async #runOperation(
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    operation: 'delete' | 'markAnswered' | 'showMsgToAll'
  ) {
    /*
      `mute24` left this helper on 2026-08-28 and took its `targetUserId` with it: it is the one
      operation that does not act on the row, and the coordinate it was carrying was never read. The
      Q&A thread is what made that visible — a question is neither an alert nor a chat message, so
      muting its author through here meant labelling a question id as one of the two.

      A rejection is the refusal. The old `response.ok` reported "the request arrived" and not "the
      operation happened" — SvelteKit put a `fail` in the BODY with a 200 status — so anything
      undoing an optimistic update had to read the result itself.
    */
    try {
      await this.#sendOperation({ kind, id: item.id, operation });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'That did not work.';
      return false;
    }
    if (operation === 'delete' || operation === 'markAnswered') await this.#onChanged();
    return true;
  }

  /** `mute24` — the one operation with no row coordinate. */
  async #muteSenderFor24Hours(item: MessageActionItem) {
    try {
      await this.#sendOperation({ operation: 'mute24', targetUserId: item.senderId });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'That did not work.';
      return false;
    }
    return true;
  }

  /**
   * @param newBodyHtml Rich text from the editor, when the edit was made with it.
   *
   * `editChatMessage` with `newMsg` set to the editor's content, which is what the reference sends
   * from `sendMessage()` while `isEditing`. As on the post path, the server sanitises it and
   * derives the plain body itself.
   */
  async editMessage(
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    newBody: string,
    newBodyHtml?: string
  ) {
    try {
      await this.#sendOperation({ kind, id: item.id, operation: 'edit', newBody, newBodyHtml });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'That edit did not save.';
      return false;
    }
    await this.#onChanged();
    return true;
  }

  async #toggleReaction(
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    reaction: MessageReactionPayload
  ) {
    try {
      await this.#sendOperation({
        kind,
        id: item.id,
        operation: 'reaction',
        reactionKey: reaction.key,
        reactionEmoji: reaction.emoji
      });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'That reaction did not save.';
      return false;
    }
    await this.#onChanged();
    return true;
  }

  #toggleEvidenceReaction(item: MessageActionItem, reactionPayload: MessageReactionPayload) {
    // The same four rules the server applies, from the same function — see `#lib/reaction-toggle.js`.
    const reactions = toggleReaction(
      item.reactions ?? {},
      reactionPayload.key,
      reactionPayload.emoji,
      this.#session().user.emailHash
    );
    this.#patchEvidence(item, { reactions });
  }

  /**
   * The two sends that act on the modal's selected message. One helper because they differed only in
   * the command called — two copies of a refusal path is how one of them ends up refetching anyway.
   */
  async #sendAgainstSelected(
    send: (id: number) => Promise<void>,
    failure: string
  ): Promise<boolean> {
    if (!this.#selectedMessage) return false;
    try {
      await send(this.#selectedMessage.id);
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : failure;
      return false;
    }
    await this.#onChanged();
    return true;
  }

  /**
   * `doMention` / `doMentionExtra` — the SAME insert, into whichever composer is the target.
   *
   * ```js
   * doMention(e) {
   *   guiEventBus.emit(
   *     this.isQAMsg ? "doQAMention"
   *     : preferences.extraChatColumn && (this.extraChatMsg || "textAreaTxtExtra" === globals.chatInputFocus)
   *       ? "doMentionExtra" : "doMention", e)
   * }
   * ```
   *
   * Two ways to reach the extra column, and both matter: the message you clicked was IN that column
   * (`extraChatMsg`, true for every row it renders), or you were last typing there
   * (`chat.focus`). Without the second, clicking a name in the main log while composing in the
   * extra column would insert into the pane you are not looking at.
   *
   * The extra column's insert is upstream's own, and it differs by a space:
   * `i.length ? val(i + ' @' + e + ' ') : val('@' + e + ' ')`.
   */
  mention(name: string, toExtraColumn = false) {
    // The insert is the class's; the caret is this file's, because the element is.
    if (!this.#chat.mention(name, toExtraColumn)) return;
    this.#focusComposer();
  }

  /**
   * ── RM-20 — THE USER MODAL'S @Mention BUTTON REMEMBERS WHICH COLUMN OPENED IT ─────────────────
   *
   * `doUserInfo` on a message emits a SECOND event beside `doUserInfo` (byte 1,352,030):
   *
   * ```js
   * doUserInfo(e, i) {
   *   this.appService.getUserInfo(e, i), this.appService.guiEventBus.emit("doUserInfo", e),
   *   this.appService.globals.preferences.extraChatColumn &&
   *     (this.extraChatMsg || "textAreaTxtExtra" === this.appService.globals.chatInputFocus) &&
   *     this.appService.guiEventBus.emit("doUserInfoExtra", this.extraChatMsg)
   * }
   * ```
   *
   * and the ONLY subscriber is the user modal, which stores it (byte 2,074,524):
   *
   * ```js
   * this.appService.guiEventBus.subscribe("doUserInfoExtra", e => { this.extraChatMsg = e })
   * ```
   *
   * so that its own `doMention` (byte 2,077,087) can route the same three-term way the message's
   * kebab does. Without it, opening a member's card from the extra column and pressing @Mention
   * inserts into the composer you are not looking at.
   *
   * ## ONE DIVERGENCE, and it removes a staleness rather than adding one
   *
   * Upstream only EMITS when `extraChatColumn && (extraChatMsg || focus === 'textAreaTxtExtra')`, so
   * opening a card from the main log while the main composer has focus emits nothing and the modal
   * keeps whatever the last extra-column open left behind. The flag is then true for a card that was
   * not opened from that column. This records it on every open, which gives the same answer in every
   * case except that one — and in that one it gives the right answer instead of the last one.
   *
   * `mentionTargetIsExtra` is still what decides, so the `focus === EXTRA_COMPOSER` half is not
   * duplicated here; this supplies only the half the modal cannot know.
   */
  mentionFromUserModal(name: string) {
    this.mention(name, this.#chat.mentionTargetIsExtra(this.#userInfoFromExtraColumn));
  }

  /**
   * @param surface Which list the row was clicked in.
   *
   * `'log'` is the alerts or chat column; `'qa'` is `AlertQaModal`'s thread, where the row
   * is an `alert_questions` entry rendered as `kind="alert"` because that is what the reference does
   * (`this.isQAMsg = !0, this.logType = "alerts"`, bundle byte 2,334,347).
   *
   * TWO branches read it — `delete`, which forwards it to `RoomMessageDeletion`, and `reaction` —
   * because those are the two that WRITE, and a question is addressed by its own id rather than by
   * `{ kind, id }`. Everything else acts on the SENDER or on the text, which is the same act from
   * either surface, and is deliberately shared: a second dispatcher for the thread would be five
   * copies of a rule to keep in step.
   *
   * `mention` is NOT here. It belongs to whichever composer is on screen, and the thread's composer
   * lives inside the modal — so `AlertQaModal` handles that one itself and forwards the rest, exactly
   * as the reference routes `doQAMention` to a subscriber inside its own modal.
   */
  handle(
    kind: 'alert' | 'chat',
    action: MessageAction,
    item: MessageActionItem,
    payload?: MouseEvent | MessageReactionPayload | TradeCopyPayload,
    /** True when the click came from the extra chat column — upstream's `extraChatMsg`. */
    fromExtraColumn = false,
    surface: 'log' | 'qa' = 'log'
  ) {
    /*
      NEITHER OF THESE MAY RUN FOR A Q&A ENTRY, and both would have been silent corruption.

      `#selectedMessage` is the ALERT the Q&A thread belongs to — `sendAlertQuestion` sends its id as
      the `alertId`, and `AlertQaModal` renders it as the thread's header. Overwriting it with the
      question that was clicked would have repointed the composer at a row in the wrong table, and
      swapped the header for one of its own replies.

      `#closeMessageMenu` closes the LOG's open menu. The thread keeps its own open row in
      `AlertQaModal`, which closes it before forwarding.
    */
    if (surface !== 'qa') {
      if (action !== 'reaction') this.#closeMessageMenu();
      this.#selectedMessage = item;
    }
    this.#selectUser(modalTargetFromMessage(item));

    if (action === 'user') {
      /* RM-20 — `doUserInfoExtra`, recorded for the modal's own @Mention button. */
      this.#userInfoFromExtraColumn = fromExtraColumn;
      this.#openModal('user');
    }
    if (action === 'mention') {
      this.mention(item.senderName, this.#chat.mentionTargetIsExtra(fromExtraColumn));
    }
    if (action === 'reply') this.#openModal('reply');
    if (action === 'report') {
      /*
        RPT-08. Upstream refuses at the ENTRY POINT, and this is it: the only call to
        `#openModal('report')` in the repository, so this guard is the whole guard. The argument and
        the reference bytes are at `NO_REPORTS_FOUND` in `lib/message-behavior.ts`, beside the
        string, rather than restated here.
      */
      if (item.id) this.#openModal('report');
      else this.#dialogs.alert = NO_REPORTS_FOUND;
    }
    if (action === 'question') {
      // `openAlertQAModal` clears the marker as it opens:
      //   e.hasOwnProperty('unreadQA') && delete e.unreadQA
      this.#clearUnreadQa(item.id);
      this.#openModal('qa');
    }
    /*
      `startPrivChat`, verbatim:

        guiEventBus.subscribe('startPrivChat', i =>
          i.user._id != globals.user.id
            ? (privChatInited || (privChatInited = !0, initPMDrag()),
               privChatVisible = !0,
               guiEventBus.emit('PCfocusOnUser', {uid: i.uid, isInit: i.isInit, user: i.user}))
            : bootbox.alert('Chatting with yourself again?'))

      Picking "Private Chat" on your OWN message does not open a panel in the capture - it shows
      that alert and stops. The server refuses it too, but by then the panel has already opened on
      an empty conversation with yourself, which is not what the original does.
    */
    if (action === 'private') {
      if (item.senderId === this.#session().user.id) {
        this.#dialogs.alert = 'Chatting with yourself again?';
        return;
      }
      // `PCfocusOnUser` — show the panel AND open straight onto that person's thread, which is
      // one receiver rather than two calls a caller could make half of.
      this.#openPrivateChat(item.senderId);
    }
    if (action === 'image' && item.targetUrl) {
      this.#openImage(payload instanceof MouseEvent ? payload : undefined, item.targetUrl);
    }
    /*
      DELETION LEFT THIS CLASS ON 2026-08-30, for `room/message-delete.ts` — the confirm-copy
      ternary, the Q&A special case and the optimistic hide, which are the three candidates
      `TODO.md` row AL named, plus the `deleteAlertPW` prompt they were blocking. That module's
      header carries the whole argument; this dispatcher keeps `#runOperation`, because a delete is
      still one of the six operations sharing one wire call and one refusal path.
    */
    if (action === 'delete') {
      this.#deletion.request(
        kind,
        item,
        payload instanceof MouseEvent ? payload : undefined,
        surface
      );
    }
    if (action === 'mute') {
      if (item.senderId <= 0) {
        this.#dialogs.alert = 'Could not retrieve user info.';
        return;
      }
      this.#dialogs.confirmation = {
        message: 'Are you sure you want to mute this user for 24 hours?',
        onconfirm: () => {
          this.#dialogs.confirmation = null;
          void this.#muteSenderFor24Hours(item).then((success) => {
            if (success) this.#dialogs.alert = 'User chat muted.';
          });
        }
      };
    }
    if (action === 'show-all') {
      void this.#runOperation(kind, item, 'showMsgToAll');
    }
    if (action === 'answered') {
      // Optimistic for the captured case, then persisted - the same shape the delete uses. Marking
      // answered in this browser alone left the ✅ invisible to everyone else, which is the whole
      // point of the marker.
      if (item.evidenceKey) this.#patchEvidence(item, { answered: true });
      void this.#runOperation(kind, item, 'markAnswered').then((succeeded) => {
        if (!succeeded && item.evidenceKey) this.#patchEvidence(item, { answered: false });
      });
    }
    /*
      ── RM-19: WE DELIBERATELY DO NOT REPRODUCE THE MUTATION ──────────────────────────────────

      ```js
      copyMessage() {                                              // byte 1,355,969
        this.msg.txt = sf(this.msg.txt).result,
        navigator.clipboard.writeText(this.msg.txt),
        this.alertsService.info("Copied to clipboard.")
      }
      ```

      `this.msg.txt = …` writes the stripped text back onto the MESSAGE, so copying a message
      silently rewrites the one on screen: formatting, links and ticker colouring vanish from the
      log for everyone looking at that browser, and nothing put them back. The clipboard is correct
      either way — `sf(...).result` is the same plain text this produces.

      So the strip happens into a DETACHED element and the message is left alone. Recorded rather
      than silently improved: this is a place where matching the reference would mean reproducing a
      defect, and the next person comparing the two should find the reason here rather than assume
      the line was missed.

      `textContent` on a detached `<div>` and not a regex, because the body is HTML the server
      sanitised — entity decoding and tag stripping in one step, by the parser that will render it.
    */
    if (action === 'copy' && typeof navigator !== 'undefined') {
      const container = document.createElement('div');
      container.innerHTML = item.body;
      const plainText = container.textContent ?? '';
      void navigator.clipboard.writeText(plainText).then(() => {
        this.#toasts.info('Copied to clipboard.');
      });
    }
    /*
      "Copy trades" — ONE `[{( … )}]` order, not the message.

      `doTradeCopy` (bundle byte 1,414,924's neighbour) reads `document.getElementById(id).textContent`
      and writes that. Here the segment that was clicked sends its own text, so nothing has to find
      an element by id to learn what it just rendered — same result, one fewer thing that can go
      stale between the DOM and the model.

      THE MESSAGE IS THE REFERENCE'S OWN and is different from `copy`'s: *"Order copied to
      clipboard."* A member copying an order and being told "Copied to clipboard." would not know
      whether they got the order or the whole alert.
    */
    if (action === 'copy-trade' && typeof navigator !== 'undefined') {
      const text = (payload as TradeCopyPayload | undefined)?.text ?? '';
      if (text) {
        void navigator.clipboard.writeText(text).then(() => {
          this.#toasts.info('Order copied to clipboard.');
        });
      }
    }
    if (action === 'edit') {
      /*
        ```js
        editMessage() {
          if ("chat" === this.logType) {
            if (sessData.enableRTE && preferences.enableRTE && containsHtml(this.msg.txt))
              return void guiEventBus.emit("doRTEModalEdit", {msg: this.msg});
            bootbox.prompt({title: "Edit chat message:", inputType: "textarea", …})
        ```

        A rich message is edited richly; everything else keeps the plain prompt below, which is the
        reference's own fallback and was already built here.

        THE ONE DIFFERENCE, and it is the column. Upstream asks `containsHtml(msg.txt)` — it sniffs
        the stored text for markup, because a message there is one string and nothing records how
        it was written. This room records it: `bodyHtml` is a nullable column, set only by the
        sanitiser on the way in. So somebody who TYPED a less-than in the plain composer gets the
        plain prompt and sees the characters they typed, rather than an editor that treats their
        sentence as tags. Same rule the renderer follows, for the same reason.
      */
      if (kind === 'chat' && this.#composer.canUseRTE && item.bodyHtml) {
        this.#composer.editInRTE(item, item.bodyHtml);
        return;
      }

      if (surface === 'qa') {
        /*
          The reference composes ONE title for both surfaces and picks the noun by surface —
          byte 1,351,806: `Edit ${this.isQAMsg ? "qa message" : "alert"} by <strong>${this.msg.n}:</strong>`.
          So "qa message" is the capture's own wording, not a label invented to fill the branch. The
          `<strong>` is dropped for the reason the alert title beside it drops it: this room's dialog
          primitive renders text, and a prompt that showed literal tags would be worse than plain.

          Addressed by the question's own id, like `deleteQuestion` and `reactToQuestion` — the
          divergence all three share is recorded at `editQuestion`.

          No optimistic patch and no `#patchEvidence`, unlike the alert branch below: a thread entry
          is never a captured fixture row (`askQuestion` writes a real row even for a captured
          alert), so there is nothing local to roll back, and `#onChanged` refetches the thread the
          same way the delete and the reaction do.
        */
        this.#dialogs.prompt = {
          title: `Edit qa message by ${item.senderName}:`,
          value: item.body,
          onconfirm: (value) => {
            const body = value.trim();
            if (!body) return;
            this.#dialogs.prompt = null;
            void this.#editQuestion({ questionId: item.id, body })
              .then(() => this.#onChanged())
              .catch((cause: unknown) => {
                this.#dialogs.alert = isHttpError(cause)
                  ? cause.body.message
                  : 'That did not work.';
              });
          }
        };
        return;
      }

      this.#dialogs.prompt = {
        title: kind === 'chat' ? 'Edit chat message:' : `Edit alert by ${item.senderName}:`,
        value: item.body,
        onconfirm: (value) => {
          const newBody = value.trim();
          if (!newBody) return;
          this.#dialogs.prompt = null;
          const previousBody = item.body;
          if (item.evidenceKey) this.#patchEvidence(item, { body: newBody });
          void this.editMessage(kind, item, newBody).then((succeeded) => {
            if (!succeeded && item.evidenceKey) this.#patchEvidence(item, { body: previousBody });
          });
        }
      };
    }
    if (action === 'reaction' && payload && !(payload instanceof MouseEvent) && 'key' in payload) {
      /*
        Same divergence as the delete — now in `RoomMessageDeletion.#send`, which reads `surface`
        for exactly this — and the same reason: a question is addressed by its own id. The reference
        cannot do that — `manageChatReactions(this.isQAMsg ? this.qaMsgID : this.msg._id, …,
        this.msgIndex)` sends the PARENT alert and an ORDINAL, because its thread entries live
        inside the alert document and have no identity. An ordinal moves when a neighbour is
        deleted; an id does not.
      */
      if (surface === 'qa') {
        const reactionPayload = payload;
        void this.#reactToQuestion({
          questionId: item.id,
          reactionKey: reactionPayload.key,
          reactionEmoji: reactionPayload.emoji
        })
          .then(() => this.#onChanged())
          .catch((cause: unknown) => {
            this.#dialogs.alert = isHttpError(cause)
              ? cause.body.message
              : 'That reaction did not save.';
          });
        return;
      }
      // Optimistic locally so the pill responds under the cursor, then persisted. The server does
      // the same toggle against the stored override, so it - not this browser - decides the result.
      const previousReactions = item.evidenceKey ? structuredClone(item.reactions ?? {}) : null;
      if (item.evidenceKey) this.#toggleEvidenceReaction(item, payload);
      void this.#toggleReaction(kind, item, payload).then((succeeded) => {
        if (!succeeded && previousReactions) {
          this.#patchEvidence(item, { reactions: previousReactions });
        }
        window.setTimeout(() => {
          this.#closeMessageMenu();
        }, 500);
      });
    }
  }
}
