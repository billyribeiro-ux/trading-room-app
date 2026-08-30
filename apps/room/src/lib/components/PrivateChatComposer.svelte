<script lang="ts">
  import { untrack } from 'svelte';

  import EmojiPicker from '#lib/components/EmojiPicker.svelte';
  import GiphyPicker from '#lib/components/GiphyPicker.svelte';
  import { ngbTooltip } from '#lib/ngb-tooltip.js';

  /*
    ── THE PRIVATE-CHAT COMPOSER — `pEe`, reference byte 2,198,563 ─────────────────────────────

    A component of its own rather than more of `PrivateChatPanel.svelte`, and the reason is the size
    ratchet: G1's button column put that file past its ceiling, and `source-size-contract`'s rule is
    that ceilings only go down and a slice comes out instead.

    A good seam, and the same one `CarouselDialog` was earlier today: nothing here knows about tabs,
    threads, paging, search or the roster. It is handed a draft and the four things a draft can
    become.

    `autoExpand` is the one thing that reaches OUTSIDE this component, and it does so because the
    reference does — see its own note.
  */

  interface Props {
    /** The message being typed. Bound, because the textarea and `onemoji` both write it. */
    draft: string;
    /** `canPostImages` — gates the upload and GIF buttons, and deliberately not the emoji one. */
    readonly canPostImages: boolean;
    /** `webinarMode` — the notice and its transcribed tooltip. */
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

  /**
   * `autoExpand(e)` — grow the box to the text, and shrink the LOG by the same amount — G11.
   *
   * ```js
   * autoExpand(e) {                                              // byte 2,203,228
   *   e.style.height = "0";
   *   const i = window.getComputedStyle(e), o = e.scrollHeight + 2 + "px";
   *   i.getPropertyValue("height") !== o && (
   *     e.style.height = o,
   *     this.elementRef.nativeElement.querySelector(".pc-messages").style.height =
   *       `calc(100% - ${o} - 15px)`),
   *   "" === e.value.trim() && (
   *     e.style.height = "23px",
   *     this.elementRef.nativeElement.querySelector(".pc-messages").style.height =
   *       "calc(100% - 50px)")
   * }
   * ```
   *
   * The private composer never expanded at all: a member typing three lines saw one, with the rest
   * scrolled out of a box the captured `.txt-area` rule gives `overflow-y: auto`.
   *
   * **The `+ 2` is the capture's and it is not padding for luck.** `+page.svelte`'s main-composer
   * variant records why: setting the height to exactly `scrollHeight` leaves the content a hair
   * taller than the box it was measured against, so the browser puts a scrollbar inside an empty
   * one-line composer. Those two pixels are the whole reason the original does not have one.
   *
   * **THE SECOND HALF IS WHAT MAKES THIS DIFFERENT FROM THE MAIN COMPOSER'S.** `.pc-messages` is
   * `height: calc(100% - 50px)` — fifty pixels reserved for a one-line composer — so a composer that
   * grows without the log shrinking pushes the log's bottom off the panel, and the newest message
   * disappears exactly when somebody is replying to it. The `- 15px` is the reference's own gap.
   *
   * Reaching out of this component is what upstream does too (`this.elementRef.nativeElement
   * .querySelector`), and it is scoped the same way: `closest('app-privchat')` finds THIS panel's
   * log rather than the first one in the document.
   */
  function autoExpand(): void {
    const element = textarea;
    if (!element) return;
    const log = element.closest('app-privchat')?.querySelector<HTMLElement>('.pc-messages');

    element.style.height = '0';
    const height = `${element.scrollHeight + 2}px`;
    if (window.getComputedStyle(element).getPropertyValue('height') !== height) {
      element.style.height = height;
      if (log) log.style.height = `calc(100% - ${height} - 15px)`;
    }
    if (element.value.trim() === '') {
      element.style.height = '23px';
      if (log) log.style.height = 'calc(100% - 50px)';
    }
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
  G21 — the composer's own consts, at byte 2,217,341:

  ```
  50 ["id","textAreaHolderPM",1,"textSendDiv"]
  52 [1,"d-flex","mx-0"]                        the inner row
  53 [1,"px-1","webinarMode"]                   the webinar notice
  54 [1,"flex-fill","px-0"]                     the textarea's own wrapper
  55 ["name","txt-area","id","textAreaTxtPM","rows","1","spellcheck","true",
      "placeholder","Type your message here...",1,"txt-area","form-control",
      3,"keyup","paste","focus"]
  56 [1,"justify-content-center","align-items-center","d-flex","flex-row","p-0","m-0",
      "text-center","textAreaBtnsCol"]          the button column
  ```

  Four attributes were small inventions before this: two dots where the capture has three, `w-100`
  for `form-control`, no `name`, no `spellcheck`. `form-control` is the one that is not cosmetic —
  it gives the box its border, padding and focus ring, and `w-100` only made it wide.

  The FLEX ROW was on the wrong element too: the capture's holder carries no flex classes at all.
-->
<div class="textSendDiv" id="textAreaHolderPM">
  <div class="d-flex mx-0">
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
          if (event.key !== 'Enter') return;
          event.preventDefault();
          if (event.shiftKey || event.altKey) {
            draft += '\n';
            return;
          }
          onsend();
        }}></textarea>
    </div>
    <!--
      ── THE BUTTON COLUMN — G1 ──────────────────────────────────────────────────────────────

      ```js
      d(5,"div",56)                                   // textAreaBtnsCol
        (6,"span",57), x("click", () => toggleEmojiPanel()), T(7,"i",58),
        H(8, cEe, 2, 0, "span", 59)                   // the image upload
        (9, hEe, 6, 1, "span", 60)                    // the GIF picker
      // …
      O(2, i.webinarMode ? 2 : -1)
      O(8, i.canPostImages ? 8 : -1), O(9, i.canPostImages ? 9 : -1)
      ```

      and the rest of the consts, by value:

      ```
      57 ["placement","auto","container","body","autoClose","outside",
          "popoverClass","popOverDiv",1,"textAreaBtns",3,"click","ngbPopover"]
      58 ["placement","left","ngbTooltip","Add Emojis",1,"far","fa-smile"]
      61 ["placement","top","ngbTooltip","In webinar mode users only see their own chat messages,
          while Presenters see everyones messages...",1,"ml-2"]
      62 [1,"fas","fa-question-circle"]
      63 [1,"textAreaBtns",3,"click"]
      64 ["ngbTooltip","Upload an Image","placement","left",1,"fas","fa-image"]
      65 the GIF span: 57's popover attributes plus 2,"font-size","12px"
      ```

      **THE WHOLE COLUMN WAS ABSENT.** The private composer was a textarea and nothing else, so a
      private conversation could carry no emoji, no image and no GIF — every one of which the main
      chat composer beside it has had since it was written.

      The emoji button is NOT gated on `canPostImages` and the other two are, which is the capture's
      split and the sensible one: an emoji is text.

      **`openRTEModal` is deliberately absent**, as `AlertChatArea` already records: the reference
      puts it on exactly two composers and private chat is not one of them.

      The webinar tooltip is verbatim, including the reference's own missing apostrophe in
      "everyones" and its trailing ellipsis.
    -->
    <div
      class="justify-content-center align-items-center d-flex flex-row p-0 m-0 text-center textAreaBtnsCol"
    >
      {#if webinarMode}
        <span class="px-1 webinarMode">
          <i
            {...{
              placement: 'top',
              ngbtooltip:
                'In webinar mode users only see their own chat messages, while Presenters see everyones messages...'
            } as Record<string, string>}
            {@attach ngbTooltip}
            class="fas fa-question-circle ml-2"
          ></i>
        </span>
      {/if}
      <!--
        `role="button"` and the keydown are OURS, on both popover spans. The capture puts a click
        handler on a bare `<span>`, which no keyboard can reach — the same divergence `GiphyPicker`
        already makes for its own two, and for the same reason. Not a `<button>`, because
        `textAreaBtns` is what gives these their shape in the column and a button would have to
        un-style itself back to it.

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
        <EmojiPicker
          popoverId="ngb-popover-pm-emoji"
          onselect={(glyph) => {
            onemoji(glyph);
            composerPopover = null;
          }}
        />
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
          <GiphyPicker
            apiKey={giphyApiKey}
            popoverId="ngb-popover-pm-giphy"
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
