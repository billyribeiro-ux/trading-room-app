<script lang="ts">
  import { untrack } from 'svelte';

  import { composerEnterAction, composerEnterPrevents } from '#lib/chat-composer-enter.js';
  import EmojiPicker from '#lib/components/EmojiPicker.svelte';
  import GiphyPicker from '#lib/components/GiphyPicker.svelte';
  import { ngbTooltip } from '#lib/ngb-tooltip.js';
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
    onselectgif,
    onemoji
  }: Props = $props();

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

  **`keyup` is the capture's event and `onkeydown` is ours** — the divergence `CarouselDialog.svelte`
  already argued and recorded, and the one `AlertChatArea.svelte:985` makes for the same textarea
  shape: `preventDefault()` on `keyup` runs after the browser has already inserted the newline, so
  the branch below could not swallow anything. Every composer in this room binds `keydown`.

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
        onfocus={() => onfocus()}
        onkeydown={(event) => {
          /*
            The three-way branch lives in `chat-composer-enter.ts`, decoded from all six `onKey`
            implementations in the bundle. Shift+Enter SWALLOWS — it does not insert a newline, which
            is what this composer used to do and what no composer in the capture does.
          */
          const action = composerEnterAction(event);
          if (composerEnterPrevents(action)) event.preventDefault();
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
