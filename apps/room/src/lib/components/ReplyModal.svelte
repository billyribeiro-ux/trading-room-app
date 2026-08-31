<script lang="ts">
  import EmojiPicker from '#lib/components/EmojiPicker.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import { ngbTooltip } from '#lib/ngb-tooltip.js';
  import { pastedImageFrom } from '#lib/pasted-image.js';

  /**
   * `app-reply-modal` — the public reply to one message, and everything the reference binds to it.
   *
   * ## Why it is its own component
   *
   * `ModalHost.svelte` reached 6,997 lines against a ceiling of 6,918 when `RPL-01`…`RPL-03` landed,
   * and `source-size-contract`'s rule is *extract rather than raise*. This is a natural seam and the
   * same one `AlertQaModal`, `CloseSessionPane` and `LogArchiveModals` were taken along: upstream it
   * is a whole component (`selectors:[["app-reply-modal"]]`, byte **2,324,180**, 23 declarations and
   * 4 variables), it owns one composer and one picker, and it reads nothing the host reads.
   *
   * ## The three defects it was carrying, all fixed here
   *
   * - **`RPL-01`** the image button was UNGATED. Upstream is `O(19, o.canPostImages ? 19 : -1)`,
   *   with `canPostImages` set once in `ngOnInit` (byte **2,319,080**) as
   *   `(isPresenter || sessData.userUploads) && (canPostImages = !0)` — a permission, not a role, so
   *   a room with member uploads on offers this to members.
   * - **`RPL-02`** it had no handler. Const 21 is `[1,"textAreaBtns",3,"click"]` and `$xe` (byte
   *   **2,318,013**) wires it to `imgUpload()`. The icon was drawn for everyone and did nothing for
   *   anyone — the control-with-no-effect the root standard names outright.
   * - **`RPL-03`** the textarea had no `paste` binding. Const 13 ends `3,"keyup","paste"` and the
   *   template binds `("paste", … o.onImagePaste(a))` (handler at byte **2,323,300**).
   *
   * Where the image GOES is not this component's business and is deliberately not here: it is
   * `RoomMessageActions.replyImage`, whose `post` is `sendReplyMessage`. `QAM-05`'s prescribed fix
   * for the twin of this control was the chat composer's path, which would have posted a reply into
   * the room's public feed; that mistake is one injected function away either way.
   */
  let {
    /** Which modal the host is showing. This one renders for `'reply'`. */
    name,
    /** The message being replied to — its sender's name and body fill the header. */
    targetMessage,
    /**
     * `(isPresenter || sessData.userUploads)`, decided on the page. `RPL-01`'s real gate.
     *
     * A permission rather than a role, and a prop rather than a re-derivation: the page computes it,
     * which is where every authority answer in this room is decided.
     */
    canPostImages,
    /** `imgUpload()` — opens the file picker. See `RPL-02`. */
    onReplyImageUpload,
    /** `onImagePaste(e)` — the file, and this box's own trimmed draft. See `RPL-03`. */
    onReplyImagePaste,
    /** Resolves true when the reply was accepted, which is when the modal closes. */
    onReplySend,
    onclose
  }: {
    name: string | null;
    targetMessage: { senderName?: string; body?: string } | null;
    canPostImages: boolean;
    onReplyImageUpload: () => void;
    onReplyImagePaste: (file: File, draft: string) => void;
    onReplySend: (body: string) => Promise<boolean>;
    onclose: () => void;
  } = $props();

  let replyComposer = $state('');
  let replyEmojiOpen = $state(false);

  async function sendReply() {
    const body = replyComposer.trim();
    if (!body) return;
    /* `closeReply` clears both — a sender that also cleared would be a second answer to one thing. */
    if (await onReplySend(body)) closeReply();
  }

  /**
   * `RPL-01`…`RPL-03` — the draft does not survive this modal closing, by ANY route.
   *
   * Upstream clears the box inside the send itself — `i && (imggurUploadTxt += " " + i,
   * go("#textAreaReplyTxt").val(""))` at byte 2,322,349 — and then hides the modal. Clearing on
   * CLOSE reaches the same state through one line instead of four, and covers the routes the
   * reference gets for free by destroying its component: the Close button, the backdrop, a plain
   * send, and the image send that hides the modal from inside `PendingImagePost`.
   *
   * The alternative — clearing only where upstream clears — leaves a draft behind on every other
   * exit, so the next person to reply to a DIFFERENT message opens the box holding what they typed
   * at the last one.
   */
  function closeReply() {
    replyComposer = '';
    replyEmojiOpen = false;
    onclose();
  }

  /**
   * `RPL-03` — a screenshot pasted into the reply box.
   *
   * `pastedImageFrom` is the shared rule rather than a fifth copy of the loop: the reference's
   * handlers all reassign on every `image/*` with no `break`, so the LAST image wins.
   *
   * Gated on `canPostImages`, which upstream's own paste handler does NOT check — the same
   * deliberate divergence `AlertQaComposer` records, and for the same reason: the button beside this
   * box is gated on it, and two controls on one surface disagreeing about one permission is the
   * shape the root standard refuses. The server re-checks regardless.
   *
   * The default is NOT prevented: a paste of plain text still lands in the textarea.
   */
  function handleReplyPaste(event: ClipboardEvent): void {
    if (!canPostImages) return;
    const image = pastedImageFrom(event.clipboardData?.items);
    if (image) onReplyImagePaste(image, replyComposer);
  }

  /*
    Same defect as the Q&A composer had, and the same fix: `preventDefault()` ran before the modifier
    check, so Shift+Enter was swallowed instead of inserting a line break.
  */
  function handleReplyKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.altKey) return;
    event.preventDefault();
    void sendReply();
  }
</script>

<app-reply-modal>
  <Modal
    id="replyModal"
    open={name === 'reply'}
    ariaLabelledby="replyLabel"
    rootRole={null}
    dialogRole={null}
    title=":"
    titleId="replyLabel"
    titleClass="modal-title"
    onclose={closeReply}
  >
    {#snippet header()}
      <h5 id="replyLabel" class="modal-title">
        <span class="do-private-reply"
          ><strong>{targetMessage?.senderName ?? ''}:</strong>
          <div>{targetMessage?.body ?? ''}</div></span
        >
      </h5>
    {/snippet}
    <div class="flex-fill d-flex mx-0">
      <div class="px-0 flex-fill">
        <textarea
          name="txt-area"
          id="textAreaReplyTxt"
          rows="1"
          spellcheck="true"
          placeholder="Type your message here.."
          class="txt-area form-control border-0"
          bind:value={replyComposer}
          onpaste={handleReplyPaste}
          onkeydown={handleReplyKeydown}></textarea>
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
          aria-describedby={replyEmojiOpen ? 'ngb-popover-reply-emoji' : undefined}
          onclick={() => (replyEmojiOpen = !replyEmojiOpen)}
        >
          <i
            {...{ placement: 'left', ngbtooltip: 'Add Emojis' } as Record<string, string>}
            {@attach ngbTooltip}
            class="far fa-smile"
          ></i>
        </span>
        {#if replyEmojiOpen}
          <EmojiPicker
            popoverId="ngb-popover-reply-emoji"
            onselect={(glyph) => (replyComposer += glyph)}
          />
        {/if}
        <!--
          `RPL-01` and `RPL-02` — TWO defects on one span, and both are fixed here.

          **It was UNGATED.** Upstream instantiates it under `O(19, o.canPostImages ? 19 : -1)`,
          and `canPostImages` is set once in `ngOnInit` at byte 2,319,080 as
          `(this.isPresenter || sessData.userUploads) && (this.canPostImages = !0)`. This room drew
          it for every viewer, including one in a room where uploads are off.

          **It did not act.** Const 21 is `[1,"textAreaBtns",3,"click"]` — a click binding — and
          `$xe` at byte 2,318,013 wires it to `imgUpload()`. This span carried no handler, so the
          icon was there for everybody and did nothing for anybody.

          `{#if}` and not `hidden`, because `-1` is instantiate-nothing: an upload control that
          ships hidden has already told a member the room has uploads.
        -->
        {#if canPostImages}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span class="textAreaBtns" onclick={onReplyImageUpload}>
            <i
              {...{ ngbtooltip: 'Upload an Image', placement: 'left' } as Record<string, string>}
              {@attach ngbTooltip}
              class="fas fa-image"
            ></i>
          </span>
        {/if}
      </div>
    </div>
    {#snippet footer()}
      <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
        Close
      </button>
    {/snippet}
  </Modal></app-reply-modal
>
