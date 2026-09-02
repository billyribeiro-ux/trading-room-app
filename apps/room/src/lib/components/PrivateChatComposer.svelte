<script lang="ts">
  import { untrack } from 'svelte';

  import { composerEnterAction, composerEnterPrevents } from '#lib/chat-composer-enter.js';
  import EmojiPicker from '#lib/components/EmojiPicker.svelte';
  import GiphyPicker from '#lib/components/GiphyPicker.svelte';
  import { ngbTooltip } from '#lib/ngb-tooltip.js';
  import { pastedImageFrom } from '#lib/pasted-image.js';
  import { autoExpandPrivateComposer } from '#lib/private-composer-auto-expand.js';

  /*
    ── THE PRIVATE-CHAT COMPOSER — `pEe`, reference byte 2,198,563 ─────────────────────────────

    A component of its own rather than more of `PrivateChatPanel.svelte`, and the reason is the size
    ratchet: G1's button column put that file past its ceiling, and `source-size-contract`'s rule is
    that ceilings only go down and a slice comes out instead.

    A good seam, and the same one `CarouselDialog` was earlier today: nothing here knows about tabs,
    threads, paging, search or the roster. It is handed a draft and the four things a draft can
    become.

    `autoExpand` is the one thing that reaches OUTSIDE this component, and it does so because the
    reference does — see `private-composer-auto-expand.ts`, which now carries it and its reasons.
  */

  interface Props {
    /** The message being typed. Bound, because the textarea and `onemoji` both write it. */
    draft: string;
    /** `canPostImages` — gates the upload and GIF buttons, and deliberately not the emoji one. */
    readonly canPostImages: boolean;
    /** `webinarMode` — the notice, its label and its transcribed tooltip. */
    readonly webinarMode: boolean;
    /** The Giphy key, or empty when the room has none. */
    readonly giphyApiKey: string;
    readonly onsend: () => void;
    /**
     * `onTextareaFocus()` — the member is looking at the composer, G27.
     *
     * Upstream's method does two things and only one crosses: it stops the tab-title flash, and it
     * attaches the `input` listener `autoExpand` needs — which this component binds declaratively.
     */
    readonly onfocus: () => void;
    readonly onimageupload: () => void;
    /**
     * `PCC-06` — the viewer pasted an image into this box.
     *
     * The composer const carries `paste` in its binding section
     * (`…,3,"keyup","paste","focus"`) and `x("paste", o => onImagePaste(o))` binds it; this
     * component had `oninput`, `onfocus` and `onkeydown` and no `onpaste` at all, so a pasted
     * screenshot did nothing.
     *
     * A callback rather than the upload, for the reason every other action here is one: the
     * confirmation dialog, the upload endpoint and the send belong to `PrivateChat`, and this
     * component would have to be handed three more things to do the job in place.
     */
    readonly onimagepaste: (file: File) => void;
    readonly onselectgif: (title: string, url: string) => void;
    readonly onemoji: (glyph: string) => void;
  }

  let {
    draft = $bindable(),
    canPostImages,
    webinarMode,
    giphyApiKey,
    onsend,
    onfocus,
    onimageupload,
    onimagepaste,
    onselectgif,
    onemoji
  }: Props = $props();

  /**
   * `PCC-06` — which image a paste carries, and the one place this room decides it.
   *
   * `pastedImageFrom` is the shared rule and it is used rather than a second loop, because the
   * reference's two `onImagePaste` implementations ARE the same loop: both walk
   * `clipboardData.items` reassigning on every `image/*`, so **the LAST image wins**. The audit row
   * that filed `PCC-06` said "the first", read the bundle again, and the register now says last.
   *
   * ## The gate is a DELIBERATE DIVERGENCE, and it fails closed
   *
   * Upstream's PM handler at byte 2,212,274 has **no `canPostImages` guard** — the chat composer's
   * copy opens with `if(!this.canPostImages)return!1` and this one does not. It is gated here
   * anyway, for a reason that is about this room rather than about the capture: `canPostImages`
   * already decides whether the upload and GIF buttons render at all, so a paste that uploaded in a
   * room where those buttons are hidden would offer through the keyboard exactly the capability the
   * buttons deny. Two controls on one component disagreeing about one permission is the shape
   * `CLAUDE.md` refuses.
   *
   * It is not the enforcement either way — `composer-image.remote.ts` re-checks on the server, which
   * is the check that counts. This is the message.
   *
   * The default is deliberately NOT prevented. A paste of plain text still lands in the textarea;
   * only an image is intercepted, which is what all four of this room's other composers do.
   */
  function handlePaste(event: ClipboardEvent): void {
    if (!canPostImages) return;
    const image = pastedImageFrom(event.clipboardData?.items);
    if (image) onimagepaste(image);
  }

  /**
   * Which popover is open — G1.
   *
   * ONE value rather than two booleans, because the reference closes the other whenever it opens one
   * (`toggleEmojiPanel` and `toggleGiphyPanel` are mutually exclusive in every composer in the
   * bundle) and two flags can represent a state that cannot happen.
   */
  let composerPopover = $state<'emoji' | 'giphy' | null>(null);

  let textarea = $state<HTMLTextAreaElement | null>(null);

  function autoExpand(): void {
    if (textarea) autoExpandPrivateComposer(textarea);
  }

  /*
    Re-run when the draft changes from ANYWHERE — an emoji inserted, a send that cleared it, a GIF
    URL put in and sent — not only on `oninput`, which is the half the reference gets for free by
    calling `autoExpand` from each of those places.

    `untrack` around the call so reading `textarea` inside it does not make this effect depend on the
    element as well as on the text.
  */
  $effect(() => {
    void draft;
    untrack(autoExpand);
  });
</script>

<!--
  G21 — the composer's own consts. Every value quoted below is decoded by BRACKET-WALKING
  `consts:[[` at byte 2,214,572 to 2,219,021 (79 entries) and is asserted against the pinned bundle
  by `private-chat-composer-v4-contract.test.ts` rather than restated here as prose, because a
  transcription written into a comment is a number nothing checks.

  Four attributes were small inventions before this: two dots where the capture has three, `w-100`
  for `form-control`, no `name`, no `spellcheck`. `form-control` is the one that is not cosmetic —
  it gives the box its border, padding and focus ring, and `w-100` only made it wide.

  The FLEX ROW was on the wrong element too: the capture's holder carries no flex classes at all.

  **`keyup` is the capture's event and it is now ours too — PCC-07, 2026-09-02.**

  The divergence recorded here was: *"`preventDefault()` on `keyup` runs after the browser has
  already inserted the newline, so the branch below could not swallow anything."* Every word of that
  is true. It was read as a reason to bind `keydown` instead; it is the reason the reference's
  Shift+Enter LEAVES a newline in this box, and binding `keydown` is what made ours swallow one.

  The rest of the branch is unaffected, and that was worth measuring rather than assuming: plain
  Enter's newline is `.trim()`ed away by `sendMessage` (byte 2,208,062), so the send arm is
  indistinguishable either way. See `chat-composer-enter.ts` for the const-table measurement that
  settles all six composers — the handlers are identical and the BINDINGS are not.

  **`paste` is the capture's third binding and this composer has none** — see PCC-06 in
  `docs/decoded/room-surface-audit-2026-08-30.md`, which is BLOCKED on one line in the panel.
-->
<div class="textSendDiv" id="textAreaHolderPM">
  <div class="d-flex mx-0">
    <!--
      ── THE WEBINAR NOTICE — `lEe`, and it is FIRST ────────────────────────────────────────

      `H(2,lEe,5,0,"div",53)` sits at index 2 of `div.d-flex.mx-0` — BEFORE `d(3,"div",54)`, the
      textarea's wrapper — and `lEe` itself is pinned in the contract test. Three things were wrong
      here and each is visible:

      * **the two words were missing.** `v(1," Webinar Mode ")` is the notice's whole point; without
        it a member in webinar mode saw a bare question mark and a tooltip nobody hovers.
      * **it was rendered inside `textAreaBtnsCol`, after the textarea.** The capture puts it at the
        head of the row, and const 53's own rule — `.webinarMode { background: #aaa; color: #000;
        width: 100% }`, byte 2,220,062 — is a full-width banner, which is not a thing that belongs
        in a three-icon button column.
      * **`ml-2` and the tooltip belong to the WRAPPING SPAN, not the icon.** Const 61 is
        `["placement","top","ngbTooltip","…",1,"ml-2"]` and const 62 is `[1,"fas",
        "fa-question-circle"]` — the icon carries no margin and no tooltip of its own.

      `T(4,"i")` is the reference's own trailing empty `<i>`: no const, no class, no content. It is
      not transcribed, because an element with no attributes and no children renders nothing and
      copying it would be copying a typo. Recorded here so the next reader does not file it as a gap.

      The tooltip is verbatim, including the reference's own missing apostrophe in "everyones" and
      its trailing ellipsis.
    -->
    {#if webinarMode}
      <div class="px-1 webinarMode">
        {' Webinar Mode '}
        <span
          {...{
            placement: 'top',
            ngbtooltip:
              'In webinar mode users only see their own chat messages, while Presenters see everyones messages...'
          } as Record<string, string>}
          {@attach ngbTooltip}
          class="ml-2"
        >
          <i class="fas fa-question-circle"></i>
        </span>
      </div>
    {/if}
    <div class="flex-fill px-0">
      <textarea
        name="txt-area"
        id="textAreaTxtPM"
        rows="1"
        spellcheck="true"
        class="txt-area form-control"
        placeholder="Type your message here..."
        bind:value={draft}
        bind:this={textarea}
        oninput={autoExpand}
        onpaste={handlePaste}
        onfocus={() => onfocus()}
        onkeyup={(event) => {
          /*
            PCC-07 — `keyup`, which is the ONLY event const 55 binds (byte 2,217,289,
            `3,"keyup","paste","focus"`). This was `keydown`, and the difference is not the timing.

            The three-way branch lives in `chat-composer-enter.ts`, and `'keyup-only'` is the input
            it was missing: on a keyup the browser has already inserted the newline and
            `preventDefault()` cannot take it back. So Shift+Enter LEAVES a newline here, where two
            of the six composers — the only two the reference also binds `keydown.enter` on — kill
            it on the way down. That module's table now carries both readings and the bytes for each.

            What this fixes: Shift+Enter in the private composer swallowed a line break the reference
            keeps. The other two arms are unchanged in effect — plain Enter's newline is `.trim()`ed
            away by the send (byte 2,208,062), and Alt+Enter's `+ "\n"` lands on top of the
            browser's, which is upstream's own double and is now reproduced.
          */
          const action = composerEnterAction(event, 'keyup-only');
          if (composerEnterPrevents(action, 'keyup-only')) event.preventDefault();
          if (action === 'newline') {
            draft += '\n';
            return;
          }
          if (action !== 'send') return;
          /* `this.showEmojiChooser = !1` is the first thing the send arm does, before `sendMessage`. */
          composerPopover = null;
          onsend();
        }}></textarea>
    </div>
    <!--
      ── THE BUTTON COLUMN — G1 ──────────────────────────────────────────────────────────────

      `d(5,"div",56)` opens `textAreaBtnsCol`; the emoji span is const 57 with icon 58, and the two
      gated buttons arrive as embedded views whose ANCHOR consts (59, 60) are not the consts of the
      spans they create (63, 65). Reading the anchor is how the GIF span's attributes were once
      described as "57's popover attributes plus a font-size", which const 60 refutes by value: it
      carries a tooltip 57 has not, `placement: "top-right"` where 57 says `auto`, and
      `triggers: "manual"`. All six are asserted in the contract test.

      **THE WHOLE COLUMN WAS ABSENT.** The private composer was a textarea and nothing else, so a
      private conversation could carry no emoji, no image and no GIF — every one of which the main
      chat composer beside it has had since it was written.

      The emoji button is NOT gated on `canPostImages` and the other two are, which is the capture's
      split and the sensible one: an emoji is text.

      **`openRTEModal` is deliberately absent**, as `AlertChatArea` already records: the reference
      puts it on exactly two composers and private chat is not one of them.
    -->
    <div
      class="justify-content-center align-items-center d-flex flex-row p-0 m-0 text-center textAreaBtnsCol"
    >
      <!--
        `role="button"` and the keydown are OURS, on both popover spans. The capture puts a click
        handler on a bare `<span>`, which no keyboard can reach — the same divergence `GiphyPicker`
        already makes for its own, and for the same reason. Not a `<button>`, because `textAreaBtns`
        is what gives these their shape in the column and a button would have to un-style itself
        back to it.

        eslint cannot see the gap here: the spread means Svelte does not know statically that there
        is no role, so `a11y_click_events_have_key_events` never fires and an ignore for it is an
        ignore for nothing. That is worth knowing rather than suppressing — the linter's silence on
        these two spans is not evidence they are reachable.
      -->
      <span
        {...{
          placement: 'auto',
          container: 'body',
          autoclose: 'outside',
          popoverclass: 'popOverDiv'
        } as Record<string, string>}
        class="textAreaBtns"
        role="button"
        tabindex="0"
        aria-label="Add Emojis"
        aria-describedby={composerPopover === 'emoji' ? 'ngb-popover-pm-emoji' : undefined}
        onclick={() => (composerPopover = composerPopover === 'emoji' ? null : 'emoji')}
        onkeydown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          composerPopover = composerPopover === 'emoji' ? null : 'emoji';
        }}
      >
        <i
          {...{ placement: 'left', ngbtooltip: 'Add Emojis' } as Record<string, string>}
          {@attach ngbTooltip}
          class="far fa-smile"
        ></i>
      </span>
      {#if composerPopover === 'emoji'}
        <!--
          The panel STAYS OPEN across a selection, which is the capture's `autoClose: "outside"` on
          const 57 read together with `selectEmoji` at byte 2,208,868:

          ```js
          selectEmoji(e){ let i = Ao("#textAreaTxtPM").val() + e.emoji.native;
                          Ao("#textAreaTxtPM").val(i), this.selectedEmoji = e.emoji }
          ```

          — it appends and touches `showEmojiChooser` not at all. Only the send arm of `onKey` closes
          it. This closed after every glyph, so picking three emoji meant three round trips through a
          popover that has a search box and nine category tabs.
        -->
        <EmojiPicker popoverId="ngb-popover-pm-emoji" onselect={(glyph) => onemoji(glyph)} />
      {/if}
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
        <span
          {...{
            ngbtooltip: 'Search for GIFs',
            placement: 'top-right',
            container: 'body',
            autoclose: 'outside',
            popoverclass: 'popOverDiv',
            triggers: 'manual'
          } as Record<string, string>}
          {@attach ngbTooltip}
          class="textAreaBtns"
          style="font-size: 12px;"
          role="button"
          tabindex="0"
          aria-label="Search for GIFs"
          aria-describedby={composerPopover === 'giphy' ? 'ngb-popover-pm-giphy' : undefined}
          onclick={() => (composerPopover = composerPopover === 'giphy' ? null : 'giphy')}
          onkeydown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            composerPopover = composerPopover === 'giphy' ? null : 'giphy';
          }}
        >
          <span>GIF</span>
        </span>
        {#if composerPopover === 'giphy' && giphyApiKey}
          <!--
            `panelHeight` and `searchButton` are this surface's own captured values, and both differ
            from the three other hosts that share this component — see GIF-01 and GIF-02.
          -->
          <GiphyPicker
            apiKey={giphyApiKey}
            popoverId="ngb-popover-pm-giphy"
            panelHeight="400px"
            searchButton={false}
            onclose={() => (composerPopover = null)}
            onselect={(title, url) => {
              onselectgif(title, url);
              composerPopover = null;
            }}
          />
        {/if}
      {/if}
    </div>
  </div>
</div>
