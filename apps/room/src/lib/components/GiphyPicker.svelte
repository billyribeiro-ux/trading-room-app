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
  }

  let { apiKey, popoverId, onclose, onselect }: Props = $props();
  let query = $state('');
  let results = $state<GiphyResult[]>([]);

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
        <h6>*Double click an image to select it</h6>
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
              <span
                class="input-group-text text-white"
                role="button"
                tabindex="0"
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
