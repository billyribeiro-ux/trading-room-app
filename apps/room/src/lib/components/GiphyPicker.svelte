<script lang="ts">
  interface GiphyImage {
    url: string;
  }

  interface GiphyResult {
    id: string;
    title: string;
    images: {
      downsized_large: GiphyImage;
      original: GiphyImage;
    };
  }

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
     * (offsets 1,425,716, 2,197,828 and 2,372,175). This is one shared component serving all of
     * them, and it hardcoded `select it` — so the note surface said the wrong word, and the audit
     * filed it as "a shared-component compromise, not a transcription error".
     *
     * A compromise is what it was, and it was not a necessary one: the difference is a prop. The
     * default is the majority string so the three surfaces that were already right stay right
     * without being touched, and the note surface passes the one the capture gives it.
     *
     * The words are not interchangeable and that is why upstream varies them. Everywhere else the
     * double-click SELECTS a GIF the member then confirms and sends; in a note it goes straight into
     * the document. `insert it` describes a different consequence, and the surface where the
     * consequence is different is the one that says it.
     */
    hint?: string;
  }

  let {
    apiKey,
    popoverId,
    onclose,
    onselect,
    hint = '*Double click an image to select it'
  }: Props = $props();
  let query = $state('');
  let results = $state.raw<GiphyResult[]>([]);

  async function search() {
    const url = new URL('https://api.giphy.com/v1/gifs/search');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('rating', 'pg');

    try {
      const response = await fetch(url);
      const payload = (await response.json()) as { data?: GiphyResult[] };
      results = payload.data ?? [];
    } catch (error) {
      console.error(error);
    }
  }

  function clearSearch() {
    query = '';
    results = [];
  }

  function portalPopover(node: HTMLElement) {
    const place = () => {
      const trigger = document.querySelector<HTMLElement>(`[aria-describedby="${node.id}"]`);
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const devicePixelRatio = window.devicePixelRatio || 1;
      const roundToDevicePixel = (value: number) =>
        Math.round(value * devicePixelRatio) / devicePixelRatio;
      const x = roundToDevicePixel(
        Math.max(
          0,
          Math.min(window.innerWidth - 400, triggerRect.left + triggerRect.width / 2 - 200)
        )
      );
      const y = roundToDevicePixel(triggerRect.top - 8 - document.documentElement.clientHeight);
      node.style.transform = `translate3d(${x}px, ${y}px, 0px)`;
    };

    document.body.append(node);
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    const resizeObserver = new ResizeObserver(place);
    const trigger = document.querySelector<HTMLElement>(`[aria-describedby="${node.id}"]`);
    if (trigger) resizeObserver.observe(trigger);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      node.remove();
    };
  }
</script>

<svelte:element
  this={"ngb-popover-window"}
  {@attach portalPopover}
  id={popoverId}
  role="tooltip"
  class="popOverDiv popover fade show bs-popover-top"
  data-popper-placement="top"
  style="position: absolute; inset: auto auto 0px 0px; margin: 0px;"
>
  <div class="popover-arrow" data-popper-arrow=""></div>
  <div class="popover-body">
    <div class="giphy-search">
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
                class="form-control border"
                bind:value={query}
              />
              <!--
                ── THE SEARCH BUTTON, `d(12,"span",88)` AT BYTE 1,467,345 ──────────────────────

                ```js
                d(12,"span",88), x("click", () => searchGiphy()), T(13,"i",89),   //  89 fa-search
                d(14,"span",88), x("click", () => clearSearchGiphy()), T(15,"i",90)  // 90 fa-times
                ```

                Const 88 is `[1,"input-group-text","text-dark",3,"click"]` and BOTH spans use it —
                they are a pair, and only the second one was here. A search could therefore be
                started only by pressing Enter in the field, with a visible affordance sitting beside
                it that did the opposite.

                TWO WORDS DIVERGE FROM THE CAPTURE, and they diverge from it in the sibling below
                too rather than being introduced here: `text-white` for `text-dark`, and the icon
                carries `fa-2x`. The reference's picker is a light modal; ours is a dark popover —
                `btn-close-white` on the header button above is the same decision, made when this
                component was written. Matching the capture on this one span would have put dark text
                on a dark ground, so it matches its own sibling instead, and the pair stays a pair.

                `role="button"` and the keydown are ours as well, for the same reason they are on the
                sibling: the capture puts a click handler on a bare `<span>`, which no keyboard can
                reach. Not a `<button>`, because `input-group-text` is what gives the two their shape
                inside the group and a button would have to un-style itself back to it.
              -->
              <span
                class="input-group-text text-white"
                role="button"
                tabindex="0"
                aria-label="Search Giphy"
                onclick={() => void search()}
                onkeydown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') void search();
                }}
              >
                <i class="fa fa-2x fa-search"></i>
              </span>
              <span
                class="input-group-text text-white"
                role="button"
                tabindex="0"
                aria-label="Clear the Giphy search"
                onclick={clearSearch}
                onkeydown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') clearSearch();
                }}
              >
                <i class="fa fa-2x fa-times"></i>
              </span>
            </div>
          </div>
        </form>
      </div>
      <ul class="search-results">
        {#each results as result (result.id)}
          <li class="gif-result">
            <img
              src={result.images.downsized_large.url}
              alt={result.title}
              ondblclick={() => onselect(result.title, result.images.original.url)}
            />
          </li>
        {/each}
      </ul>
    </div>
  </div>
</svelte:element>
