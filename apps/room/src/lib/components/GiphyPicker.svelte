<script lang="ts">
  import { giphyPopoverPortal } from '#lib/giphy-popover-portal.js';
  import { imageBox, searchGiphy, type GiphyResult } from '#lib/giphy-search.js';

  interface Props {
    apiKey: string;
    popoverId: string;
    onclose: () => void;
    onselect: (title: string, url: string) => void;
    /**
     * The line above the search box — `note-editor-giphy-hint-text`.
     *
     * The bundle carries this string four times and **one of them is different**: `app-note` says
     * `*Double click an image to insert it` at byte 1,467,154, while the other three say `select it`
     * (offsets 1,425,716, 2,197,828 and 2,372,175). This is one shared component serving all four,
     * and it hardcoded `select it` — so the note surface said the wrong word, and the audit filed it
     * as "a shared-component compromise, not a transcription error". A compromise is what it was and
     * it was not a necessary one: the difference is a prop. The default is the majority string so
     * the three surfaces already right stay right untouched, and the note surface passes its own.
     *
     * The words are not interchangeable and that is why upstream varies them. Everywhere else the
     * double-click SELECTS a GIF the member then confirms and sends; in a note it goes straight into
     * the document. `insert it` describes a different consequence, and the surface where the
     * consequence is different is the one that says it.
     */
    hint?: string;
    /**
     * `.giphy-search`'s own height — GIF-01, and the second value that varies by surface.
     *
     * Six hosts declare this rule and one is different: `app-privchat` says `400px` at byte
     * 2,224,360 where `app-chat`, `app-note`, `app-reply-modal` and `app-extra-chat` say `700px`.
     * Each rule is scoped to its own host element and this popover is portaled to `<body>` — see
     * `giphy-popover-portal.ts` — so none of them reaches it, and the unscoped fallback at
     * `app.css:551` paints every surface at the majority value.
     *
     * Inline, so it outranks that class rule from wherever the node ends up. The default is the
     * majority; the private composer passes its own.
     */
    panelHeight?: string;
    /**
     * Whether the magnifier beside the field is rendered — GIF-02.
     *
     * **Three of the four Giphy templates in the bundle have no search button at all.** Each POPOVER
     * variant builds exactly one `input-group-text` span and it is the CLEAR one — `d(13,"span",73)`
     * in `app-privchat`'s `uEe` (byte 2,197,701), `d(13,"span",84)` in `app-chat`'s `r0e`
     * (1,425,589), `d(13,"span",81)` in `app-extra-chat`'s `sMe` (2,372,048). Only `app-note`'s
     * MODAL, `L0e` at 1,467,000, builds two: `d(12,"span",88)` then `d(14,"span",88)`.
     *
     * The default is `true` rather than the majority `false`, and that is a deliberate exception to
     * how `hint` above chose its default: the only other consumer of this component is
     * `notes/NoteEditor.svelte`, which IS the modal variant and is outside this change's scope, so a
     * majority default would have silently taken a control off the one surface whose capture has it.
     */
    searchButton?: boolean;
    /**
     * Which of the reference's TWO Giphy chromes this mount is — GIF-04.
     *
     * The bundle builds this picker four times and they are not one design: three POPOVER hosts
     * (`app-privchat`, `app-chat`, `app-extra-chat`) share one set of consts, and `app-note`'s MODAL
     * has its own. Decoded by value, the three differences are:
     *
     * | | popover ×3 | note modal |
     * | --- | --- | --- |
     * | input | `form-control border` (83/…) | `form-control` (87) |
     * | icon span | `input-group-text text-white` (84/…) | `input-group-text text-dark` (88) |
     * | icons | `fa fa-2x fa-times` (85/…) | `fa fa-search`, `fa fa-times` (89, 90) |
     *
     * They vary together because the GROUNDS differ: a popover paints its own dark panel, and the
     * note modal's body does not. This component hardcoded the popover column, so on the one modal
     * surface the search and clear icons were rendered `text-white` on a light body.
     *
     * ONE prop rather than three, because upstream does not choose these independently — it has two
     * chromes. Three booleans would let a caller build a combination the capture has never had.
     *
     * The default is `'popover'`, the majority, for the reason `hint` gives above: the three surfaces
     * that are already right stay right without being touched, and the one that differs says so.
     */
    variant?: 'popover' | 'modal';
  }

  let {
    variant = 'popover',
    apiKey,
    popoverId,
    onclose,
    onselect,
    hint = '*Double click an image to select it',
    panelHeight = '700px',
    searchButton = true
  }: Props = $props();

  /*
    The three values the two chromes disagree on, derived once — see the `variant` docblock for the
    table they correspond to, and check them against it rather than walking the markup.

    `$derived` in the script rather than `{@const}` in the template: Svelte 5 allows `{@const}` only
    as the immediate child of a block or component, and these sit inside a plain `<div>`. Deriving
    them here is also where a reader looks for "what does this prop change".
  */
  const inputClass = $derived(variant === 'modal' ? 'form-control' : 'form-control border');
  const spanClass = $derived(
    variant === 'modal' ? 'input-group-text text-dark' : 'input-group-text text-white'
  );
  const iconSize = $derived(variant === 'modal' ? 'fa' : 'fa fa-2x');
  let query = $state('');
  let results = $state.raw<GiphyResult[]>([]);

  async function search() {
    try {
      results = await searchGiphy(apiKey, query);
    } catch (error) {
      /*
        `.catch(console.error)` is the reference's own handler (byte 2,213,709) and the shape that
        matters is kept: a failed search leaves the previous grid standing rather than blanking it,
        so a network blip does not read as "no GIFs match that word".
      */
      console.error(error);
    }
  }

  function clearSearch() {
    query = '';
    results = [];
  }
</script>

<svelte:element
  this={"ngb-popover-window"}
  {@attach giphyPopoverPortal}
  id={popoverId}
  role="tooltip"
  class="popOverDiv popover fade show bs-popover-top"
  data-popper-placement="top"
  style="position: absolute; inset: auto auto 0px 0px; margin: 0px;"
>
  <div class="popover-arrow" data-popper-arrow=""></div>
  <div class="popover-body">
    <div class="giphy-search" style:height={panelHeight}>
      <div class="giphy-header">
        <div class="d-flex align-items-center justify-content-between">
          <h4>Giphy Search</h4>
          <button
            type="button"
            aria-label="Close"
            class="btn-close btn-close-white"
            onclick={onclose}
          ></button>
        </div>
        <hr class="giphy-hr" />
        <h6>{hint}</h6>
        <form
          onsubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <div class="form-group">
            <div class="input-group">
              <input
                type="text"
                placeholder="Search for a GIF"
                name="giphy"
                aria-label="Sizing example input"
                aria-describedby="inputGroup-sizing-sm"
                class={inputClass}
                bind:value={query}
              />
              <!--
                ── THE INPUT-GROUP SPANS, AND WHAT THE CAPTURE ACTUALLY SAYS ────────────────────

                An earlier reading of this pair took `app-note`'s modal for the whole story and
                recorded two divergences from it: `text-white` for `text-dark`, and an `fa-2x` the
                capture "does not have". **Decoding the other three tables by value refutes both.**
                `text-white` and `fa-2x` are the POPOVER hosts' own captured values — app-privchat
                73/74, app-chat 84/85 and app-extra-chat 81/82, three identical pairs — while
                `text-dark` with a plain `fa-search`/`fa-times` belongs to the one MODAL, app-note
                88/89/90. So this component matches its capture exactly and always did; what was
                wrong was the note claiming it did not, which is the shape of mistake that gets
                "corrected" back into a real defect later. The input's `border` class splits the same
                way: on all three popover hosts, absent from `app-note`'s const 87. All four const
                pairs are asserted against the pinned bundle in `giphy-picker-v4-contract.test.ts`.

                `role="button"` and the keydown ARE ours, and that part of the note stands: the
                capture puts a click handler on a bare `<span>`, which no keyboard can reach. Not a
                `<button>`, because `input-group-text` is what gives these their shape inside the
                group and a button would have to un-style itself back to it.
              -->
              {#if searchButton}
                <span
                  class={spanClass}
                  role="button"
                  tabindex="0"
                  aria-label="Search Giphy"
                  onclick={() => void search()}
                  onkeydown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') void search();
                  }}
                >
                  <i class="{iconSize} fa-search"></i>
                </span>
              {/if}
              <span
                class={spanClass}
                role="button"
                tabindex="0"
                aria-label="Clear the Giphy search"
                onclick={clearSearch}
                onkeydown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') clearSearch();
                }}
              >
                <i class="{iconSize} fa-times"></i>
              </span>
            </div>
          </div>
        </form>
      </div>
      <ul class="search-results">
        <!--
          KEYED BY `id`, DELIBERATELY, AND IT IS NOT THE REFERENCE'S KEY — GIF-06.

          Angular tracks these by TITLE: `KDe = (t,n) => n.title` for `app-privchat`, `y0e` for
          `app-note`. Titles collide constantly on Giphy — the empty string is a common one — and a
          duplicate key in Svelte is a runtime throw that takes the picker down, where a duplicate
          trackBy in Angular merely reuses a node. So the reference's key is not transcribed and the
          id stands in as the least-colliding field the payload offers.

          It is still EXTERNAL and still not authority: it decides which DOM node is reused, never
          what is sent. What is sent is the URL the member double-clicked, and the server decides
          whether that may be posted.
        -->
        {#each results as result (result.id)}
          {const box = $derived(imageBox(result.images.downsized_large))}
          <li class="gif-result">
            <!--
              `width`/`height` from the payload when it states usable integers, nothing at all when
              it does not. The reference sizes this with `max-width: 100%` and no intrinsic box, so
              the grid reflowed as each GIF decoded; the ratio lets the browser reserve the row
              first. `max-width: 100%` still wins on the rendered width, so these change the
              RESERVATION, not the layout.
            -->
            <img
              src={result.images.downsized_large.url}
              alt={result.title}
              width={box?.width}
              height={box?.height}
              ondblclick={() => onselect(result.title, result.images.original.url)}
            />
          </li>
        {/each}
      </ul>
    </div>
  </div>
</svelte:element>
