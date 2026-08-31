<script lang="ts">
  import { composerEnterAction } from '#lib/chat-composer-enter.js';
  import { ngbTooltip } from '#lib/ngb-tooltip.js';
  import { pastedImageFrom } from '#lib/pasted-image.js';
  import EmojiPicker from './EmojiPicker.svelte';

  /**
   * `#textAreaQATxt` — the Q&A thread's own composer, and the modal footer that holds it.
   *
   * ## Why it is its own component
   *
   * `AlertQaModal.svelte` reached its `source-size-contract` ceiling on 2026-08-31 and the ratchet's
   * rule is to extract rather than raise the number. This is the second natural seam: upstream the
   * footer is `d(15,"div",13)` through `H(23,l3e,…)` — one subtree with one field, one picker and
   * one button, reading nothing the thread above it reads.
   *
   * It owns the picker's open state and nothing else. `composer` is bound because the modal both
   * clears it when it opens on a new alert (`QAM-02`) and writes into it when a thread entry's
   * kebab asks for a mention — upstream's `doQAMention` subscription, which the modal keeps because
   * it is the thing subscribed.
   */
  let {
    composer = $bindable(''),
    /**
     * Drives the placeholder, and the image button below.
     *
     * The placeholder is BOUND upstream, not written: const 17 ends `3,"keyup","paste","placeholder"`
     * and the template supplies `o.appService.globals.isPresenter ? "Type your answer here..." :
     * "Type your question here..."` at byte 2,344,220. Same two strings, same condition.
     */
    isPresenter,
    canPostImages,
    onimageupload,
    onimagepaste,
    /** Resolves true when the question was accepted, which is when the box is emptied. */
    onsend
  }: {
    composer: string;
    isPresenter: boolean;
    /**
     * `QAM-05` — the image button's REAL gate.
     *
     * `canPostImages` is set once in `ngOnInit` at byte **2,334,626** as
     * `(this.isPresenter || sessData.userUploads) && (this.canPostImages = !0)`, and the button is
     * `O(23, o.canPostImages ? 23 : -1)`. This node used to be gated on `isPresenter`, which is
     * NARROWER: a room with member uploads on offers this to members upstream and offered it to
     * nobody but presenters here.
     *
     * A separate prop from `isPresenter` rather than a re-derivation, because they are two
     * different questions and the placeholder below still asks the first one. The page computes
     * both, which is where every authority answer in this room is decided.
     */
    canPostImages: boolean;
    /** `imgUpload()` — byte 2,337,470. Answers the thread with an image; see `QAM-05`. */
    onimageupload: () => void;
    /**
     * `QAM-06` — a screenshot pasted into this box. `onImagePaste`, byte 2,339,887.
     *
     * The DRAFT travels with the file, because upstream's handler reads its own box:
     * `a = yi("#textAreaQATxt").val().trim()`. Lifting `composer` out of this component so a
     * grandparent could read it would move state upward to serve one handler; handing the value
     * over at the moment of the paste is the same information without the relocation, and it is
     * what `AlertChatArea` already does for the inline alert box's `oninlinealertimage`.
     */
    onimagepaste: (file: File, draft: string) => void;
    onsend: (body: string) => Promise<boolean>;
  } = $props();

  let emojiOpen = $state(false);

  async function send() {
    const body = composer.trim();
    if (!body) return;
    if (await onsend(body)) {
      composer = '';
      /*
        `this.showEmojiChooser = !1` is the FIRST act of the reference's send branch (byte
        2,336,560), before `sendMessage()` — the picker is an absolutely positioned popover over the
        message it was used to compose, so leaving it up covers the entry that just arrived.
      */
      emojiOpen = false;
    }
  }

  /**
   * Enter sends; Shift+Enter and Alt+Enter insert a line break.
   *
   * `QAM-04` — the comment this replaced read *"The captured textarea had no handler at all, so
   * pressing Enter did nothing."* **That is false, and it was measured false on 2026-08-31.** Const
   * 17 of the modal's own table, decoded at byte **2,342,103**, ends `3,"keyup","paste","placeholder"`
   * — three bindings, not zero — and the template attaches the first two at byte **2,343,759**:
   * `x("keyup", … o.onKey(a))("paste", … o.onImagePaste(a))`. `onKey` is at byte **2,336,560** and
   * is the same three-way Enter branch every composer in the application carries.
   *
   * So the BEHAVIOUR was right all along and the justification under it was invented. That is worse
   * than a missing comment, because the next reader takes it as licence: a handler introduced with
   * "the capture had none" is a handler anybody may redesign. Recorded rather than deleted, so the
   * correction reaches whoever read the old sentence.
   *
   * The branch itself, both offsets and the two deliberate divergences from it (`keydown` rather
   * than `keyup`; letting the browser insert the break rather than appending `"\n"` to the whole
   * value) are in `#lib/chat-composer-enter.ts`, which exists because this composer and the extra
   * chat column's disagreed about the same captured rule in opposite directions.
   */
  function handleQaKeydown(event: KeyboardEvent) {
    if (composerEnterAction(event) !== 'send') return;
    event.preventDefault();
    void send();
  }

  /**
   * `QAM-06` — const 17 declares `paste` (`3,"keyup","paste","placeholder"`, byte 2,342,103) and
   * byte 2,343,759 binds it to `onImagePaste`. This box had no paste handler, so a screenshot
   * pasted into a Q&A answer did nothing.
   *
   * `pastedImageFrom` is the shared rule and is used rather than a fourth copy of the loop — the
   * reference's four `onImagePaste` implementations are the same loop, reassigning on every
   * `image/*` with no `break`, so the LAST image wins.
   *
   * Gated on `canPostImages`, which upstream's Q&A handler does not check either — the same
   * deliberate divergence `PrivateChatComposer` records and for the same reason: the button beside
   * this box is gated on it, and two controls on one component disagreeing about one permission is
   * the shape `CLAUDE.md` refuses. The server re-checks regardless.
   *
   * The default is NOT prevented: a paste of plain text still lands in the textarea.
   */
  function handleQaPaste(event: ClipboardEvent): void {
    if (!canPostImages) return;
    const image = pastedImageFrom(event.clipboardData?.items);
    if (image) onimagepaste(image, composer);
  }
</script>

<!--
  `id="textAreaHolder"` — const 14, `["id","textAreaHolder",1,"d-flex","align-items-center",
  "textSendDiv","flex-fill"]`, decoded at byte 2,341,450. The same id `app-chat` and `app-extra-chat`
  use, which is the reference's own duplication and which `#lib/extra-chat-surface.ts` measures: the
  `#textAreaHolder` rule family in `app.css` is what styles this field, and a suffixed id silently
  loses all of it.
-->
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
        bind:value={composer}
        onpaste={handleQaPaste}
        onkeydown={handleQaKeydown}></textarea>
    </div>
    <div
      class="justify-content-center d-flex flex-row align-items-center justify-content-center p-0 m-0 text-center textAreaBtnsCol"
    >
      <!-- Const 19 — the popover placement and its escape rule, verbatim. -->
      <span
        {...{
          placement: 'auto',
          container: 'body',
          autoclose: 'outside',
          popoverclass: 'popOverDiv'
        } as Record<string, string>}
        class="textAreaBtns"
        aria-describedby={emojiOpen ? 'ngb-popover-qa-emoji' : undefined}
        onclick={() => (emojiOpen = !emojiOpen)}
      >
        <i
          {...{ placement: 'left', ngbtooltip: 'Add Emojis' } as Record<string, string>}
          {@attach ngbTooltip}
          class="far fa-smile"
        ></i>
      </span>
      {#if emojiOpen}
        <EmojiPicker popoverId="ngb-popover-qa-emoji" onselect={(glyph) => (composer += glyph)} />
      {/if}
      <!--
        The compiled component gates this node on `canPostImages` (`O(23, o.canPostImages ? 23 : -1)`
        at byte 2,344,277), which is why the captured reader-side footer carries only the emoji
        button.

        `QAM-05` — TWO things about this button were wrong, and both are fixed.

        **It did not act.** Const 36 of the modal's table (byte 2,341,450) is
        `[1,"textAreaBtns",3,"click"]` — a click binding — and `l3e` at byte 2,333,483 wires it to
        `imgUpload()`. This span carried no handler at all, so a presenter clicking the image icon in
        the Q&A footer got nothing: the shape `CLAUDE.md` names outright, a control whose only effect
        is to exist.

        **Its gate was the wrong value.** `canPostImages` is set once in `ngOnInit` at byte 2,334,626
        as `(this.isPresenter || sessData.userUploads) && (this.canPostImages = !0)`, so a room with
        member uploads on offers this to members; `isPresenter` narrowed it to presenters only.

        `QAM-06` — const 17 (byte 2,342,103) also declares `paste`, bound at byte 2,343,759 to
        `onImagePaste` (byte 2,339,887). The textarea above binds it now.

        ## The register's prescribed fix was WRONG, and it is worth saying where

        `QAM-05` proposed `onimageupload={() => composer.openImageUpload()}` — "the same path both
        chat composers already use". **That path posts to CHAT.** `doImggurUpload` on `app-alert-qa`
        (byte 2,338,987) ends in `sendAlertQAReply(qaMsg._id, …)` and then
        `yi("#alertQAModal").modal("hide")`. Taking the prescription literally would have put a
        presenter's answer to one member's question into the room's public chat. Both handlers reach
        `RoomMessageActions` instead, which is the class that already owns `sendAlertQuestion`; it
        borrows only the room's raw uploader, exactly as the private chat and both trade-alert panes
        do.
      -->
      {#if canPostImages}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="textAreaBtns" onclick={onimageupload}>
          <i
            {...{ ngbtooltip: 'Upload an Image', placement: 'left' } as Record<string, string>}
            {@attach ngbTooltip}
            class="fas fa-image"
          ></i>
        </span>
      {/if}
    </div>
  </div>
</div>
