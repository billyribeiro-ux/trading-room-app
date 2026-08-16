import { isHttpError } from '@sveltejs/kit';

import {
  type PastedImageSubmission,
  type PostAlertSubmission,
  composePastedImageAlert,
  composeUploadedAlert,
  postOnXIntent
} from '$lib/post-alert-behavior';
import { stripHtmlToText } from '$lib/chat-plain-text';
import type { AlertTab, ChatTab, MessageActionItem, ModalName } from '$lib/types';

import type { MenuName } from './menus.svelte';

import { EXTRA_COMPOSER, type RoomChat } from './chat.svelte';
import type { RoomDialogs } from './dialogs.svelte';

/** The three wire commands this class sends, injected so it needs no route import. */
export interface ComposerCommands {
  send: (payload: { body: string; bodyHtml?: string; room: ChatTab }) => Promise<unknown>;
  uploadImage: (payload: { file: File; originalName: string }) => Promise<string>;
  postAlert: (payload: {
    kind: AlertTab;
    body: string;
    targetUrl: string | null;
    nonTradeAlert: boolean;
  }) => Promise<unknown>;
}

/*
  Everything that LEAVES this browser as content: a chat message, a rich-text message, an image, a
  GIF, an alert.

  Phase 5 slice 10. Twenty-five declarations and functions, 339 lines. They belong together because
  they funnel: five entry points — plain composer, extra column, rich text, image upload, GIF —
  all end at `sendBody`, and the alert paths share `#uploadOneImage` with the image one.

  ## `sendBody` is the single refusal path, and that is why they are one class

  Every sender used to have its own `try`/`catch` and its own wording. One of them forgot to
  return `false`, so an optimistic clear ran on a refused send and the typed message was lost with
  no error shown. One funnel, one refusal, one place to get it right.

  ## The upload has TWO backends and the fallback is not an accident

  `#uploadOneImage` posts to the CDN when `PUBLIC_PTR_UPLOAD_SERVER` and the key are configured,
  and otherwise to `composer-image.remote.ts`. The remote path is deliberately NOT the Files pane's
  `uploadFile`: that one is presenter-only and refused every member while their own upload button
  sat there enabled.

  ## `canUseRTE` is a getter, not a `$derived` field

  It reads `#session()` and `#isPresenter()`, both assigned by the constructor. A `$derived`
  class field initialises in declaration order, before those assignments — the decision
  `RoomFiles.filesHidden` records.

  ## What it does NOT own

  **The composition rules.** `composeUploadedAlert`, `composePastedImageAlert` and
  `postOnXIntent` are transcriptions in `$lib/post-alert-behavior`, tested there against the capture's
  wording. This class calls them.

  **Who may post.** Every command re-checks on the server. What moved is which control is drawn and
  what it says when refused.

  **`editMessage`.** The rich-text editor can be opened on an existing message, and editing one is
  the message-action path's job. It is injected, which is also what keeps slice 8 free to move it.
*/
export class RoomComposer {
  readonly #dialogs: RoomDialogs;
  readonly #chat: RoomChat;
  readonly #commands: ComposerCommands;
  readonly #session: () => { sessData?: { enableRTE?: boolean } | null; sessionHandle: string };
  readonly #prefs: { readonly enableRTE: boolean };
  readonly #isPresenter: () => boolean;
  readonly #openModal: (name: Exclude<ModalName, null>) => void;
  readonly #closeModal: () => void;
  readonly #closeMenu: (name: MenuName, open: boolean) => void;
  readonly #editMessage: (
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    body: string,
    bodyHtml?: string
  ) => Promise<boolean>;
  readonly #onSent: () => Promise<void>;
  readonly #uploadServer: string;
  readonly #uploadKey: string;

  #tweetWindow: Window | null;
  #sendingGif;
  #pendingGifUrl;
  #rteDraft;
  #rteIsEditing;
  #rteEditTarget: MessageActionItem | null;

  constructor(options: {
    dialogs: RoomDialogs;
    chat: RoomChat;
    commands: ComposerCommands;
    session: () => { sessData?: { enableRTE?: boolean } | null; sessionHandle: string };
    prefs: { readonly enableRTE: boolean };
    isPresenter: () => boolean;
    openModal: (name: Exclude<ModalName, null>) => void;
    closeModal: () => void;
    /** `menus.set` — typed as the real union, so a typo cannot reach it as a plain string. */
    closeMenu: (name: MenuName, open: boolean) => void;
    /** The message-action path's, injected so slice 8 stays free to move it. */
    editMessage: (
      kind: 'alert' | 'chat',
      item: MessageActionItem,
      body: string,
      bodyHtml?: string
    ) => Promise<boolean>;
    onSent: () => Promise<void>;
    /** `PUBLIC_PTR_UPLOAD_SERVER` and its key; empty means fall back to the remote command. */
    uploadServer: string;
    uploadKey: string;
  }) {
    this.#dialogs = options.dialogs;
    this.#chat = options.chat;
    this.#commands = options.commands;
    this.#session = options.session;
    this.#prefs = options.prefs;
    this.#isPresenter = options.isPresenter;
    this.#openModal = options.openModal;
    this.#closeModal = options.closeModal;
    this.#closeMenu = options.closeMenu;
    this.#editMessage = options.editMessage;
    this.#onSent = options.onSent;
    this.#uploadServer = options.uploadServer;
    this.#uploadKey = options.uploadKey;

    this.#tweetWindow = null;

    this.#sendingGif = $state(false);

    this.#pendingGifUrl = $state<string | null>(null);

    /** The message being composed in the editor, as HTML. */
    this.#rteDraft = $state('');

    /** `Save` rather than `Send`, and an edit rather than a post. */
    this.#rteIsEditing = $state(false);

    /**
     * The message being edited, when editing. Null for a new message.
     *
     * `$state.raw`, not `$state`: this is a message row that is only ever REPLACED, never mutated
     * field by field, so a deep proxy over it would cost a proxy read on every property access and
     * buy nothing. Reassignment still triggers, which is the only reactivity this needs.
     */
    this.#rteEditTarget = $state.raw<MessageActionItem | null>(null);
  }

  /**
   * The chat rich text editor's gate.
   *
   * `sessData.enableRTE && preferences.enableRTE && isPresenter`, which is the reference's own
   * expression and appears THREE times in it: on the composer button
   * (`O(5, …prefs.enableRTE && …prefs.enableRTE && …isPresenter ? 5 : -1)`), inside `loadRTE()`, which will not
   * construct the editor without it, and inside `retriveRTEContent()`, which returns an empty
   * string so a click that reached the send anyway cannot post through a disabled editor. All
   * three consumers here read THIS, so the three cannot disagree.
   *
   * ## One deliberate narrowing, and it is a narrowing
   *
   * The reference's EDIT entry point asks a different question —
   * `sessData.enableRTE && preferences.enableRTE && containsHtml(msg.txt)`, with no presenter term.
   * A member who owns a rich message therefore gets the editor opened for them, types into it,
   * presses Save, and `retriveRTEContent()` refuses because THAT check does require presenter: the
   * editor reports "Empty message. Please type a message..." and their edit is lost. Reproducing a
   * control that cannot ever complete is not reproducing a feature, so the edit branch below asks
   * this same full question. Strictly fewer people reach the editor than upstream, and everyone
   * who reaches it can finish.
   *
   * ## A getter, not a `$derived` field
   *
   * It reads `#session()` and `#isPresenter()`, both assigned by the constructor, and a derived
   * class field initialises before that happens.
   */
  get canUseRTE(): boolean {
    return (
      this.#session().sessData?.enableRTE === true && this.#prefs.enableRTE && this.#isPresenter()
    );
  }

  /**
   * The poll modal posts its results as a plain text alert.
   *
   * Named for its consumer rather than exposing `#persistAlert`: the private one takes five
   * positional arguments that only make sense together, and a caller reaching it directly would be
   * free to combine them in ways no control offers.
   */
  postPollResults(body: string): Promise<boolean> {
    return this.#persistAlert('text', body, null, false, false);
  }

  get sendingGif(): boolean {
    return this.#sendingGif;
  }

  get pendingGifUrl(): string | null {
    return this.#pendingGifUrl;
  }

  get rteDraft(): string {
    return this.#rteDraft;
  }

  set rteDraft(next: string) {
    this.#rteDraft = next;
  }

  get rteIsEditing(): boolean {
    return this.#rteIsEditing;
  }

  /**
   * Open the rich-text editor ON an existing message.
   *
   * A receiver rather than three setters, because the three fields are one state: a draft with no
   * target is a new message, a target with no draft is an editor showing nothing, and
   * `sendRTE` branches on the target. A caller holding setters can produce either.
   */
  editInRTE(item: MessageActionItem, html: string): void {
    this.#rteIsEditing = true;
    this.#rteEditTarget = item;
    this.#rteDraft = html;
    this.#openModal('rich-text');
  }

  async send() {
    const body = this.#chat.composer.trim();
    if (!body) return;

    if (await this.sendBody(body)) this.#chat.clear('textAreaTxt');
  }

  /**
   * @param bodyHtml Rich text from the editor, when the message was written with it.
   *
   * Sent as a SEPARATE field rather than folded into `body`, because which kind of message this is
   * has to be a fact the row carries — see `chat-rich-text-contract.test.ts`. The server sanitises
   * it and derives its own `body` from the result, so what arrives here as plain text is the
   * optimistic copy and never the stored one.
   */
  async sendBody(body: string, bodyHtml?: string, room: ChatTab = this.#chat.tab) {
    const trimmedBody = body.trim();
    if (!trimmedBody) return false;

    try {
      await this.#commands.send({ body: trimmedBody, bodyHtml, room });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Message not sent.';
      return false;
    }
    await this.#onSent();
    return true;
  }

  /**
   * Text typed in the plain composer, as HTML for the editor.
   *
   * The reference hands its composer's value straight to `summernote('code', …)`, which parses it
   * as markup. Ours escapes it, and that is not a deviation from the feature: `#textAreaTxt` is a
   * `<textarea>`, so its value is TEXT, and rendering text as markup is a category error whoever
   * typed it. Somebody who types a less-than and switches to the editor should see the character
   * they typed, exactly as `chat-rich-text-contract` requires of the renderer.
   *
   * The escaping is the platform's — assign to `textContent`, read back `innerHTML` — rather than a
   * hand-rolled replace over three characters that always turns out to be four.
   */
  #textToEditorHtml(text: string) {
    const holder = document.createElement('div');
    holder.textContent = text;
    return holder.innerHTML;
  }

  /**
   * `openRTEModal()` — the composer's `fa-font` button.
   *
   * ```js
   * openRTEModal() {
   *   this.appService.guiEventBus.emit("doRTEModal", {
   *     channel: this.channel, txt: $("#textAreaTxt")?.val()?.toString()?.trim() || "" });
   *   $("#textAreaTxt")?.val("");
   * }
   * ```
   *
   * Both halves are load-bearing: the composer's text comes WITH you into the editor, and the
   * composer is left empty so the same words cannot be sent twice from two places.
   */
  openRTE() {
    this.#closeMenu('emoji', false);
    this.#closeMenu('giphy', false);
    this.#rteIsEditing = false;
    this.#rteEditTarget = null;
    // One step, so a half-written message cannot exist in the modal AND behind it — which is a
    // message sent twice.
    this.#rteDraft = this.#textToEditorHtml(this.#chat.take('textAreaTxt'));
    this.#openModal('rich-text');
  }

  /**
   * The editor's Send / Save.
   *
   * ```js
   * sendMessage() {
   *   let e = this.retriveRTEContent();
   *   if (!e || "" === e.trim()) return P("Empty message. Please type a message..."), !1;
   *   this.isEditing ? (sendServerCommand("editChatMessage", {msgID: this.msg._id, newMsg: e}), …)
   *                  : (sendGrpChat(this.channel, e),
   *                     guiEventBus.emit("scrollChatLogToBottom", {force:!0, repeat:!1}));
   *   this.destroyRTE(); $("#rteModal").modal("hide");
   * }
   * ```
   *
   * `retriveRTEContent()` is the gate asked a second time, and it is reproduced rather than
   * skipped: with the gate shut it returns an empty string, so this refuses in the same words.
   *
   * THE EMPTINESS TEST IS THE SERVER'S, not the reference's. Upstream compares against four
   * literal strings, so `<b></b>` — formatting with nothing in it, which is what you get by
   * pressing Bold and then Send — passes, and is then refused by the server with a 400 the modal
   * has nowhere to show. Asking the same question `isEmptyChatHtml` asks (tags stripped, `&nbsp;`
   * treated as the space it looks like) means the person is TOLD, in the reference's own words,
   * rather than left in front of a button that appears to do nothing.
   */
  async sendRTE() {
    const html = this.canUseRTE ? this.#rteDraft.trim() : '';
    const text = stripHtmlToText(html);
    if (!text) {
      this.#dialogs.alert = 'Empty message. Please type a message...';
      return;
    }
    const target = this.#rteEditTarget;
    const succeeded = target
      ? await this.#editMessage('chat', target, text, html)
      : await this.sendBody(text, html);
    if (!succeeded) return;
    this.#rteDraft = '';
    this.#rteIsEditing = false;
    this.#rteEditTarget = null;
    this.#closeModal();
    /*
      NOT scrolled here, and the omission is the point. The reference follows its send with
      `scrollChatLogToBottom {force:!0}`; this room reaches the same place through the autoscroll
      effect above, whose `shouldAutoScrollForMessage` returns true when
      `senderId === connectedUserId` — your own message always wins, whatever you were reading.
      Adding a second scroll would be a duplicate writer of somebody else's scroll position, which
      is how the alerts scroller went wrong once already.
    */
  }

  /** The extra column's composer, sending into the channel that column is showing. */
  async sendExtra() {
    const body = this.#chat.extraComposer.trim();
    if (!body) return;
    if (await this.sendBody(body, undefined, this.#chat.extraTab)) this.#chat.clear(EXTRA_COMPOSER);
  }

  /**
   * The extra column's rich-text button — `openRTEModal()` on `app-extra-chat`, which reads
   * `#textAreaTxtExtra` rather than `#textAreaTxt` and clears that one.
   */
  openExtraRTE() {
    this.#rteIsEditing = false;
    this.#rteEditTarget = null;
    this.#rteDraft = this.#textToEditorHtml(this.#chat.take(EXTRA_COMPOSER));
    this.#openModal('rich-text');
  }

  openImageUpload() {
    this.#closeMenu('emoji', false);
    this.#closeMenu('giphy', false);
    this.#openModal('image-upload');
  }

  /**
   * Upload one image and return the URL to put in the message body.
   *
   * The capture posts to an external CDN, `Client-ID`-authenticated, and reads `data.link` back:
   *
   * ```js
   * fetch(`${uploadServer}/image/${sessionHandle}`, { method:'POST',
   *   headers:{ Authorization:`Client-ID ${uploadKey}` }, body: form })  // -> { data: { link } }
   * ```
   *
   * `PUBLIC_PTR_UPLOAD_SERVER` and `PUBLIC_PTR_CDN_UPLOAD_KEY` are both empty here - we do not have
   * that service - and the code threw "Missing captured upload configuration.", which is where
   * posting an alert with an image died. Rather than fail, it falls back to the room's OWN upload,
   * which stores the bytes and hands back a real `/uploads/<uuid>` URL. Same contract: a URL that
   * resolves to the image the user picked.
   *
   * The captured path is kept and still wins when the environment provides it.
   */
  async #uploadOneImage(file: File): Promise<string> {
    const uploadServer = this.#uploadServer ?? '';
    const uploadKey = this.#uploadKey ?? '';

    if (uploadServer && uploadKey) {
      const upload = new FormData();
      upload.append('image', file);
      upload.append('name', file.name);
      const response = await fetch(`${uploadServer}/image/${this.#session().sessionHandle}`, {
        method: 'POST',
        headers: { Authorization: `Client-ID ${uploadKey}` },
        body: upload
      });
      if (!response.ok) throw new Error(`Image upload failed with ${response.status}.`);
      const payload = (await response.json()) as { data?: { link?: string } };
      const link = payload.data?.link;
      if (!link) throw new Error('Image upload response did not include data.link.');
      return link;
    }

    /*
      `composer-image.remote.ts`, NOT the Files pane's `uploadFile` — that one is presenter-only and
      refused every member while their own upload button sat there enabled. The `File` goes as
      itself; that module cites the two functions in Kit that reduce and revive it.

      Re-thrown, not caught: `uploadComposerImages` already turns a failure into the dialog, so
      swallowing here would post a message with an image that never uploaded.
    */
    try {
      return await this.#commands.uploadImage({ file, originalName: file.name });
    } catch (cause) {
      // `{ cause }` because the rejection is the only record of WHY — an `HttpError` re-thrown as a
      // bare `Error` keeps the sentence and loses the status the server actually answered with.
      throw new Error(isHttpError(cause) ? cause.body.message : 'Upload failed.', { cause });
    }
  }

  async uploadImages(files: File[], message: string) {
    this.#closeModal();
    if (files.length === 0) return;

    const uploadedUrls: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        this.#dialogs.alert = `Uploading ${index}/${files.length}: ${file.name}. Please wait...`;
        uploadedUrls.push(await this.#uploadOneImage(file));
      }

      const body = `${uploadedUrls.join(' ')}${message ? ` ${message}` : ''}`;
      this.#dialogs.alert = null;
      await this.sendBody(body);
    } catch (error) {
      console.error(error);
      this.#dialogs.alert = 'Upload Failed...';
    }
  }

  async uploadAlertFiles(files: readonly File[]) {
    const uploadedUrls: string[] = [];
    for (const file of files) uploadedUrls.push(await this.#uploadOneImage(file));
    return uploadedUrls;
  }

  #postOnX(body: string) {
    if (!body) return;
    const intent = postOnXIntent(body);
    if (this.#tweetWindow && !this.#tweetWindow.closed) {
      this.#tweetWindow.focus();
      this.#tweetWindow.location.href = intent;
      return;
    }
    this.#tweetWindow = window.open(
      intent,
      'TweetWindow',
      'width=800,height=800,scrollbars=yes,resizable=yes'
    );
  }

  async #persistAlert(
    kind: AlertTab,
    body: string,
    targetUrl: string | null,
    nonTradeAlert: boolean,
    dontPush: boolean
  ) {
    // `dontPush` is NOT sent: the action received it and never read it, and `post-alert.remote.ts`
    // refuses it rather than accept a field nothing consumes. The parameter stays; the caller
    // computes it, and the push suppression it names has no consumer in this room yet.
    void dontPush;
    try {
      await this.#commands.postAlert({ kind, body, targetUrl, nonTradeAlert });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Alert not posted.';
      return false;
    }
    await this.#onSent();
    return true;
  }

  async postAlert(submission: PostAlertSubmission) {
    let body: string;
    let targetUrl: string | null;

    if (submission.composition.status === 'upload') {
      try {
        const uploadedUrls = await this.uploadAlertFiles(submission.files);
        body = composeUploadedAlert(
          submission.composition.bodyBeforeUploads,
          uploadedUrls,
          submission.legalDisclosure,
          submission.legalDisclosureText
        );
        targetUrl = uploadedUrls[0] ?? null;
      } catch (error) {
        console.error(error);
        this.#dialogs.alert = 'Upload Failed...';
        return false;
      }
    } else {
      body = submission.composition.body;
      targetUrl = null;
    }

    if (submission.postOnX) this.#postOnX(body);
    return this.#persistAlert(
      submission.composition.kind,
      body,
      targetUrl,
      submission.nonTradeAlert,
      submission.dontPush
    );
  }

  async postPastedImage(submission: PastedImageSubmission) {
    try {
      const [uploadedUrl] = await this.uploadAlertFiles([submission.file]);
      if (!uploadedUrl) throw new Error('Image upload response did not include data.link.');
      const body = composePastedImageAlert(
        submission.alertText,
        uploadedUrl,
        submission.legalDisclosure,
        submission.legalDisclosureText
      );
      if (submission.postOnX) this.#postOnX(body);
      return this.#persistAlert(
        'media',
        body,
        uploadedUrl,
        submission.nonTradeAlert,
        submission.dontPush
      );
    } catch (error) {
      console.error(error);
      this.#dialogs.alert = 'Upload Failed...';
      return false;
    }
  }

  selectGif(_title: string, url: string) {
    if (this.#sendingGif) return;
    this.#closeMenu('giphy', false);
    this.#sendingGif = true;
    this.#pendingGifUrl = url;
  }

  cancelGif() {
    this.#pendingGifUrl = null;
    this.#sendingGif = false;
  }

  async confirmGif() {
    const url = this.#pendingGifUrl;
    this.#pendingGifUrl = null;
    if (url) await this.sendBody(url);
    this.#sendingGif = false;
  }
}
