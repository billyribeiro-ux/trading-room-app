/**
 * One image, uploaded and posted somewhere — the lifecycle four surfaces share and each used to own.
 *
 * ## Why this exists, and it is the ratchet's doing
 *
 * `QAM-05`/`QAM-06` built the Q&A thread's image path on 2026-08-31. `RPL-01`…`RPL-03` needed the
 * same thing for the reply modal that afternoon, and writing it out again put
 * `message-actions.svelte.ts` at 1,025 lines against a ceiling of 874 — a 151-line raise, of which
 * about 110 lines were the second copy.
 *
 * `source-size-contract`'s rule is *extract rather than raise*, and here it is plainly right: the two
 * blocks differed in exactly one expression each. Two near-identical lifecycles maintained side by
 * side is how the pair drifts, and the drift would be silent — an image posted to the wrong
 * conversation looks like a working feature to everything except the person who receives it.
 *
 * ## What is SHARED and what is not
 *
 * Shared: the three pieces of state, the object-URL discipline, the upload, the failure message, and
 * the ORDER of the composed body. The reference builds it the same way at all four sites —
 *
 * ```js
 * s.imggurUploadTxt += … F;                         // the link FIRST
 * i && (s.imggurUploadTxt += " " + i, …)            // then the message, space-separated
 * ```
 *
 * Not shared, and deliberately injected: WHERE it goes. `doImggurUpload` dispatches on a feature
 * name deny-by-default (byte 1,992,037) and each site ends somewhere different —
 * `sendAlertQAReply`, `sendChatReply`, `sendPrivChat`, `sendGrpChat`. `QAM-05`'s prescribed fix was
 * "the same path both chat composers already use", and taking it literally would have put a
 * presenter's private answer into public chat. A shared lifecycle with an injected destination is
 * the shape that keeps those four apart; a shared HANDLER is the shape that mixes them.
 */

/** One pasted image awaiting confirmation, and the object URL its preview is showing. */
export interface PendingImage {
  file: File;
  previewUrl: string;
}

export class PendingImagePost {
  /**
   * `imgUpload()` — whether the file-picker dialog is on screen.
   *
   * Separate from `#pasted` rather than one nullable mode, because they are reached by different
   * gestures and the reference keeps them apart: the upload dialog has NO message box (only the
   * paste confirmation does), which is why `complete` sends an empty message and `confirm` does not.
   */
  #uploadOpen = $state(false);
  #pasted = $state.raw<PendingImage | null>(null);
  #message = $state('');

  readonly #upload: (file: File) => Promise<string | undefined>;
  readonly #post: (body: string) => Promise<boolean>;
  readonly #afterSend: () => void;
  readonly #fail: (message: string) => void;

  constructor(options: {
    /** The room's raw uploader. Resolves the stored URL, or undefined when the server gave none. */
    upload: (file: File) => Promise<string | undefined>;
    /** WHERE this image goes. Resolves whether it travelled. See the note above on why injected. */
    post: (body: string) => Promise<boolean>;
    /** `$("#…Modal").modal("hide")` — run only after a successful send, as upstream does. */
    afterSend: () => void;
    /** `bootbox.alert("Upload Failed...")`, verbatim, and it is the caller's dialog host. */
    fail: (message: string) => void;
  }) {
    this.#upload = options.upload;
    this.#post = options.post;
    this.#afterSend = options.afterSend;
    this.#fail = options.fail;
  }

  get uploadOpen(): boolean {
    return this.#uploadOpen;
  }

  get pasted(): PendingImage | null {
    return this.#pasted;
  }

  /** The message travelling with the paste — the confirmation dialog's own textarea. */
  get message(): string {
    return this.#message;
  }

  set message(next: string) {
    this.#message = next;
  }

  beginUpload(): void {
    this.#uploadOpen = true;
  }

  cancelUpload(): void {
    this.#uploadOpen = false;
  }

  /**
   * The picker returned — ONE file, as the reference's own dialog allows, and NO message.
   *
   * `doImggurUpload` is called with `i` defaulting to `null` on this path, so the
   * `i && (… val(""))` branch never runs and no composer is cleared.
   */
  async complete(files: readonly File[]): Promise<boolean> {
    this.#uploadOpen = false;
    const [file] = files;
    if (!file) return false;
    return this.#send(file, '');
  }

  /**
   * `onImagePaste(e)` — the LAST `image/*` item wins.
   *
   * All four of the reference's handlers reassign on every match with no `break`; the loop itself is
   * `#lib/pasted-image.ts`, held once rather than four times, and the caller passes what it found.
   *
   * The DRAFT arrives with the file because upstream's handlers read their own box
   * (`val().trim()`), and trimming here rather than at each call site keeps that one rule in one
   * place.
   */
  begin(file: File, draft: string): void {
    this.cancel();
    this.#pasted = { file, previewUrl: URL.createObjectURL(file) };
    this.#message = draft.trim();
  }

  cancel(): void {
    const pending = this.#pasted;
    this.#pasted = null;
    this.#message = '';
    /* An object URL that outlives its dialog is a leak the browser cannot collect. */
    if (pending) URL.revokeObjectURL(pending.previewUrl);
  }

  /**
   * Confirm the paste. Resolves TRUE when a MESSAGE travelled with the image.
   *
   * That is the answer callers need, not "did it send": upstream clears the composer inside
   * `i && (…)`, so the clear belongs to the message rather than to the send.
   *
   * The pending paste is taken and cleared BEFORE the await, so somebody who starts typing during a
   * slow upload keeps what they typed — the rule `composer.svelte.ts` argues, and the reason the
   * composed text is not routed back through the box on its way out.
   */
  async confirm(): Promise<boolean> {
    const pending = this.#pasted;
    if (!pending) return false;
    const message = this.#message.trim();
    this.#pasted = null;
    this.#message = '';
    URL.revokeObjectURL(pending.previewUrl);
    if (!(await this.#send(pending.file, message))) return false;
    return message.length > 0;
  }

  /** Upload, then post. Returns whether the post travelled. */
  async #send(file: File, message: string): Promise<boolean> {
    let url: string | undefined;
    try {
      url = await this.#upload(file);
    } catch (cause) {
      console.error(cause);
      this.#fail('Upload Failed...');
      return false;
    }
    if (!url) {
      this.#fail('Upload Failed...');
      return false;
    }

    /* The link FIRST, then the message space-separated — `imggurUploadTxt += " " + i`. */
    if (!(await this.#post(message ? `${url} ${message}` : url))) return false;
    this.#afterSend();
    return true;
  }
}
