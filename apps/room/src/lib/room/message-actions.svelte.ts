import { isHttpError } from '@sveltejs/kit';

import { toggleReaction } from '#lib/reaction-toggle.js';
import type {
  MessageAction,
  MessageActionItem,
  MessageReactionPayload,
  ModalName,
  ModalTargetUser
} from '#lib/types.js';

import type { RoomChat } from './chat.svelte';
import type { RoomComposer } from './composer.svelte';
import type { RoomDialogs } from './dialogs.svelte';
import type { EvidencePatch } from './feeds.svelte';
import type { RoomToasts } from './toasts.svelte';

/** The one wire command every operation here goes through. */
export type MessageOperation =
  | { kind: 'alert' | 'chat'; id: number; operation: 'delete' | 'markAnswered' | 'showMsgToAll' }
  | { kind: 'alert' | 'chat'; id: number; operation: 'mute24'; targetUserId: number }
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
  readonly #replyMessage: (payload: { body: string; messageId: number }) => Promise<void>;
  readonly #openModal: (name: Exclude<ModalName, null>) => void;
  readonly #closeMessageMenu: () => void;
  readonly #selectUser: (user: ModalTargetUser) => void;
  readonly #patchEvidence: (item: MessageActionItem, patch: EvidencePatch) => void;
  readonly #openPrivateChat: (peerId: number) => void;
  readonly #openImage: (event: MouseEvent | undefined, url: string) => void;
  readonly #clearUnreadQa: (id: number) => void;
  readonly #focusComposer: () => void;
  readonly #onChanged: () => Promise<void>;

  #selectedMessage: MessageActionItem | null;

  constructor(options: {
    dialogs: RoomDialogs;
    toasts: RoomToasts;
    chat: RoomChat;
    composer: RoomComposer;
    session: () => { user: { id: number; role: string; emailHash: string } };
    sendOperation: (payload: MessageOperation) => Promise<unknown>;
    askQuestion: (payload: { body: string; alertId: number }) => Promise<void>;
    replyMessage: (payload: { body: string; messageId: number }) => Promise<void>;
    openModal: (name: Exclude<ModalName, null>) => void;
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
  }) {
    this.#dialogs = options.dialogs;
    this.#toasts = options.toasts;
    this.#chat = options.chat;
    this.#composer = options.composer;
    this.#session = options.session;
    this.#sendOperation = options.sendOperation;
    this.#askQuestion = options.askQuestion;
    this.#replyMessage = options.replyMessage;
    this.#openModal = options.openModal;
    this.#closeMessageMenu = options.closeMessageMenu;
    this.#selectUser = options.selectUser;
    this.#patchEvidence = options.patchEvidence;
    this.#openPrivateChat = options.openPrivateChat;
    this.#openImage = options.openImage;
    this.#clearUnreadQa = options.clearUnreadQa;
    this.#focusComposer = options.focusComposer;
    this.#onChanged = options.onChanged;

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
    operation: 'delete' | 'markAnswered' | 'mute24' | 'showMsgToAll'
  ) {
    /*
      `targetUserId` rides ONLY on `mute24` now. The action took it on every operation and read it on
      one, so a delete carried a field nothing looked at; `z.discriminatedUnion` refuses it on the
      other three, which is what makes the shape honest.

      A rejection is the refusal. The old `response.ok` reported "the request arrived" and not "the
      operation happened" — SvelteKit put a `fail` in the BODY with a 200 status — so anything
      undoing an optimistic update had to read the result itself.
    */
    try {
      await this.#sendOperation(
        operation === 'mute24'
          ? { kind, id: item.id, operation, targetUserId: item.senderId }
          : { kind, id: item.id, operation }
      );
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'That did not work.';
      return false;
    }
    if (operation === 'delete' || operation === 'markAnswered') await this.#onChanged();
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

  handle(
    kind: 'alert' | 'chat',
    action: MessageAction,
    item: MessageActionItem,
    payload?: MouseEvent | MessageReactionPayload,
    /** True when the click came from the extra chat column — upstream's `extraChatMsg`. */
    fromExtraColumn = false
  ) {
    if (action !== 'reaction') this.#closeMessageMenu();
    this.#selectedMessage = item;
    this.#selectUser({
      id: item.senderId,
      nick: item.senderName,
      emailHash: item.senderEmailHash,
      pic: item.senderAvatarUrl,
      status: item.senderStatus ?? 'offline',
      ...(item.senderStatus && item.senderStatus !== 'offline'
        ? { userXrefID: String(item.senderId), _id: String(item.senderId) }
        : {})
    });

    if (action === 'user') this.#openModal('user');
    if (action === 'mention') {
      this.mention(item.senderName, this.#chat.mentionTargetIsExtra(fromExtraColumn));
    }
    if (action === 'reply') this.#openModal('reply');
    if (action === 'report') this.#openModal('report');
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
    if (action === 'delete') {
      const event = payload instanceof MouseEvent ? payload : undefined;
      const deleteMessage = () => {
        // Captured items used to stop here, hidden in this browser's memory and nowhere else - so
        // a presenter deleting an alert watched it vanish while every member kept being served it
        // from the fixture on every poll, forever. The local hide stays as the optimistic update,
        // because the server round-trip and its invalidate take a moment and the row should not
        // linger under the cursor; the server call is what makes it stick for the room.
        if (item.evidenceKey) this.#patchEvidence(item, { hidden: true });
        void this.#runOperation(kind, item, 'delete').then((succeeded) => {
          // A member may only delete what the capture attributes to them, and the server is what
          // decides that. Put a refused item back rather than leaving it hidden for this viewer
          // alone - that is the same one-sided disappearance this change exists to remove.
          if (!succeeded && item.evidenceKey) this.#patchEvidence(item, { hidden: false });
        });
      };
      if (event?.shiftKey) {
        deleteMessage();
      } else {
        const noun = kind === 'alert' ? 'alert' : 'message';
        this.#dialogs.confirmation = {
          message:
            this.#session().user.role === 'staff' || this.#session().user.role === 'admin'
              ? `Are you sure you want to delete this ${noun} by ${item.senderName}. text: ${item.body}`
              : `Are you sure you want to delete your message: ${item.body}`,
          onconfirm: () => {
            this.#dialogs.confirmation = null;
            deleteMessage();
          }
        };
      }
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
          void this.#runOperation(kind, item, 'mute24').then((success) => {
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
    if (action === 'copy' && typeof navigator !== 'undefined') {
      const container = document.createElement('div');
      container.innerHTML = item.body;
      const plainText = container.textContent ?? '';
      void navigator.clipboard.writeText(plainText).then(() => {
        this.#toasts.info('Copied to clipboard.');
      });
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
