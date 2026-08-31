<script lang="ts">
  import { composerEnterAction } from '#lib/chat-composer-enter.js';
  import { ngbTooltip } from '#lib/ngb-tooltip.js';
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
    /** Resolves true when the question was accepted, which is when the box is emptied. */
    onsend
  }: {
    composer: string;
    isPresenter: boolean;
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

        `QAM-05` — TWO things about this button are wrong, and both are BLOCKED on the call site
        rather than on this file.

        **It does not act.** Const 36 of the modal's table (byte 2,341,450) is
        `[1,"textAreaBtns",3,"click"]` — a click binding — and `l3e` at byte 2,333,483 wires it to
        `imgUpload()`. This span carries no handler at all, so a presenter clicking the image icon in
        the Q&A footer gets nothing. That is the shape `CLAUDE.md` names outright: a control whose
        only effect is to exist.

        **Its gate is the wrong value.** `canPostImages` is set once in `ngOnInit` at byte 2,334,626
        as `(this.isPresenter || sessData.userUploads) && (this.canPostImages = !0)`, so a room with
        member uploads on offers this to members. `isPresenter` narrows it to presenters only.

        `QAM-06` — const 17 (byte 2,342,103) also declares `paste`, bound at byte 2,343,759 to
        `onImagePaste` (byte 2,339,887), so upstream a screenshot pasted into this box uploads and
        posts. There is no paste handler here.

        All three need one thing this component is not given: a way to reach the upload path.
        `ModalHost` renders the modal at :5636 and none of its props is an image handler, while
        `composer.openImageUpload()` — the path the two chat composers use — is on the page beside
        it. The exact one-line change is named in the audit register. Building the call locally
        instead would put a second upload implementation inside a modal, which is how two of them
        drift.
      -->
      {#if isPresenter}
        <span class="textAreaBtns">
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
