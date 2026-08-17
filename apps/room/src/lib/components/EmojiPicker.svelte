<script lang="ts">
  import { EMOJI_DUMP_DATA, type EmojiDumpEntry } from '#lib/emoji-data.js';

  interface Props {
    onselect: (glyph: string) => void;
    onentry?: (entry: EmojiDumpEntry) => void;
    popoverId?: string;
  }

  let { onselect, onentry, popoverId = 'ngb-popover-3' }: Props = $props();

  /*
    Constants read off the deployed picker (docs/source/main.d6d3c112b59b7d0d.js):
    perLine=9, emojiSize=24, totalFrequentLines=4, maxResults=75, NAMESPACE="emoji-mart",
    notFoundEmoji="sleuth_or_spy", emoji="department_store" (the idle preview).
  */
  const NAMESPACE = 'emoji-mart';
  const PER_LINE = 9;
  const EMOJI_SIZE = 24;
  const PREVIEW_SIZE = 38;
  const TOTAL_FREQUENT_LINES = 4;
  const MAX_RESULTS = 75;

  /*
    Upstream sizes the picker at runtime rather than in CSS:

      getWidth() { return this.style?.width ?? this.perLine*(this.emojiSize+12)+12+2+this.measureScrollbar+'px' }

    so the fixed part is 9 * 36 + 14 = 338. `measureScrollbar` is measured from a
    throwaway 100x100 overflow:scroll probe, which is why the same component is 338px in
    the chat-composer capture (first-dump/decoded/01-caps/53-emoji-popover:0, overlay
    scrollbars) and 353px in /emojis (a session with 15px scrollbars). Both numbers are
    this one formula, so it is reproduced rather than either being pinned - hardcoding 338
    clips the ninth column wherever scrollbars take width, and 353 leaves a gutter
    everywhere else.
  */
  const EMOJI_BASE_WIDTH = PER_LINE * (EMOJI_SIZE + 12) + 12 + 2;

  // jR in the bundle: the magnifier, and the ✕ shown while a query is active.
  const SEARCH_ICONS = {
    search:
      'M12.9 14.32a8 8 0 1 1 1.41-1.41l5.35 5.33-1.42 1.42-5.33-5.34zM8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z',
    delete:
      'M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z'
  };

  // NR.DEFAULTS in the bundle - the Frequently Used row before anything is stored.
  const FREQUENTLY_DEFAULTS = [
    '+1',
    'grinning',
    'kissing_heart',
    'heart_eyes',
    'laughing',
    'stuck_out_tongue_winking_eye',
    'sweat_smile',
    'joy',
    'scream',
    'disappointed',
    'unamused',
    'weary',
    'sob',
    'sunglasses',
    'heart',
    'poop'
  ];

  const allEntries: EmojiDumpEntry[] = EMOJI_DUMP_DATA.categories
    .flatMap((category) => category.entries)
    .filter((entry): entry is EmojiDumpEntry => Boolean(entry));
  const entriesById = new Map(allEntries.map((entry) => [entry.id, entry]));

  let query = $state('');
  let selectedCategory = $state(0);
  let skin = $state(1);
  let skinsOpened = $state(false);
  let hovered = $state<EmojiDumpEntry | null>(null);
  let searchResults = $state<EmojiDumpEntry[] | null>(null);
  let frequentIds = $state.raw<string[]>(FREQUENTLY_DEFAULTS.slice(0, PER_LINE));

  let emojiSearchInput: HTMLInputElement | undefined;
  let emojiScrollElement: HTMLElement | undefined;
  const categorySections: Array<HTMLElement | undefined> = [];

  // ---------------------------------------------------------------- sprites

  /*
    Only the size and background-position vary between the dump's sprite cells; the rest
    is the same URL and background-size every time. Kept identical to composeSpriteStyle()
    in scripts/extract-clean-emoji-data.mjs, which asserts that recomposing every captured
    cell reproduces the dump string byte for byte.
  */
  function composeSpriteStyle(size: number, position: string) {
    return (
      `width: ${size}px; height: ${size}px; display: inline-block; ` +
      `background-image: url("${EMOJI_DUMP_DATA.sprite.url}"); background-size: 6100% 6000%; ` +
      `background-position: ${position};`
    );
  }

  // getSpritePosition() in the bundle: 100 / (sheetColumns - 1) on both axes.
  function spritePosition(sheet: [number, number]) {
    const step = 100 / (EMOJI_DUMP_DATA.sprite.columns - 1);
    return `${step * sheet[0]}% ${step * sheet[1]}%`;
  }

  /*
    Skin tone 1 reuses the position captured in the dump verbatim, so the default grid
    stays byte-identical to the capture; tones 2-6 index skinVariations, which is what
    getData(emoji, skin) does upstream.
  */
  function spriteStyleFor(entry: EmojiDumpEntry, size = EMOJI_SIZE) {
    const variation = skin > 1 ? entry.skinSheets[skin - 2] : undefined;
    return composeSpriteStyle(size, variation ? spritePosition(variation) : entry.spritePosition);
  }

  // ---------------------------------------------------------------- search

  /*
    buildSearch() verbatim: short_names, name and id are split on separators, keywords too,
    emoticons are not, everything lowercased and de-duplicated, joined with commas.
  */
  function buildSearch(entry: EmojiDumpEntry) {
    const tokens: string[] = [];
    const add = (value: string | string[] | undefined, split: boolean) => {
      if (!value) return;
      for (const item of Array.isArray(value) ? value : [value]) {
        for (const part of split ? item.split(/[-|_|\s]+/) : [item]) {
          const token = part.toLowerCase();
          if (!tokens.includes(token)) tokens.push(token);
        }
      }
    };
    add(entry.shortNames, true);
    add(entry.name, true);
    add(entry.id, true);
    add(entry.keywords, true);
    add(entry.emoticons, false);

    return tokens.join(',');
  }

  /*
    A plain Map, not a SvelteMap: this is the same memo upstream keeps in
    `this.emojiSearch[id]`, nothing renders from it, and making it reactive would
    invalidate the search on its own cache writes.
  */
  const searchStrings = new Map<string, string>();
  function searchStringFor(entry: EmojiDumpEntry) {
    let value = searchStrings.get(entry.id);
    if (value === undefined) {
      value = buildSearch(entry);
      searchStrings.set(entry.id, value);
    }
    return value;
  }

  /*
    search() verbatim: the '-'/'+' shortcuts, at most two terms, each term matched as a
    substring of the built search string and ranked by where it matched (0 when the term
    is the id itself), the terms intersected, then capped at maxResults.
  */
  function runSearch(raw: string): EmojiDumpEntry[] | null {
    if (!raw.length) return null;
    if (raw === '-' || raw === '-1') {
      const entry = entriesById.get('-1');
      return entry ? [entry] : [];
    }
    if (raw === '+' || raw === '+1') {
      const entry = entriesById.get('+1');
      return entry ? [entry] : [];
    }

    let terms = raw
      .toLowerCase()
      .split(/[\s|,|\-|_]+/)
      .filter(Boolean);
    if (!terms.length) return null;
    if (terms.length > 2) terms = [terms[0], terms[1]];

    const perTerm = terms.map((term) => {
      const ranks = new Map<string, number>();
      const matched = allEntries.filter((entry) => {
        const index = searchStringFor(entry).indexOf(term);
        if (index === -1) return false;
        ranks.set(entry.id, term === entry.id ? 0 : index + 1);
        return true;
      });
      return matched.sort((a, b) => (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0));
    });

    let results = perTerm[0] ?? [];
    for (const list of perTerm.slice(1)) {
      const ids = new Set(list.map((entry) => entry.id));
      results = results.filter((entry) => ids.has(entry.id));
    }

    return results.length > MAX_RESULTS ? results.slice(0, MAX_RESULTS) : results;
  }

  /*
    handleSearch() upstream shows the Search category and sets every other category to
    display:none - it does not hide individual cells - then resets the scroll to the top.
  */
  function handleSearch(value: string) {
    query = value;
    searchResults = runSearch(value);
    if (emojiScrollElement) emojiScrollElement.scrollTop = 0;
    if (!searchResults) syncSelectedCategory();
  }

  function clearQuery() {
    query = '';
    if (emojiSearchInput) emojiSearchInput.value = '';
    handleSearch('');
    emojiSearchInput?.focus();
  }

  // ---------------------------------------------------------------- categories

  function selectCategory(index: number) {
    // handleAnchorClick() clears an active search before scrolling anywhere.
    if (searchResults) clearQuery();

    selectedCategory = index;
    const section = categorySections[index];
    if (!section || !emojiScrollElement) return;

    const scrollRect = emojiScrollElement.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    emojiScrollElement.scrollTop += sectionRect.top - scrollRect.top;
    emojiScrollElement.scrollLeft = 0;
  }

  /*
    handleScroll() upstream picks the first category when scrollTop is 0, the last when the
    scroller is at the bottom, and otherwise the last category whose top has passed the
    viewport top.
  */
  function syncSelectedCategory() {
    if (!emojiScrollElement || searchResults) return;

    const scroller = emojiScrollElement;
    if (scroller.scrollTop === 0) {
      selectedCategory = 0;
      return;
    }
    if (scroller.scrollHeight - scroller.scrollTop <= scroller.clientHeight + 1) {
      selectedCategory = EMOJI_DUMP_DATA.categories.length - 1;
      return;
    }

    const top = scroller.getBoundingClientRect().top;
    let next = 0;
    categorySections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top - top <= 1) next = index;
    });
    selectedCategory = next;
  }

  // ---------------------------------------------------------------- frequently used

  function storage() {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      // Storage can throw outright when cookies are blocked.
      return null;
    }
  }

  function readFrequently(): Record<string, number> | null {
    const store = storage();
    if (!store) return null;
    try {
      return JSON.parse(store.getItem(`${NAMESPACE}.frequently`) ?? 'null');
    } catch {
      return null;
    }
  }

  /*
    frequently.get(perLine, totalFrequentLines) verbatim: with nothing stored it returns
    the first `perLine` DEFAULTS, which is exactly the nine cells the dump captured;
    otherwise the most-used ids, with the last-used one forced in.
  */
  function loadFrequently() {
    const stored = readFrequently();
    if (!stored) {
      frequentIds = FREQUENTLY_DEFAULTS.slice(0, PER_LINE);
      return;
    }

    const ids = Object.keys(stored)
      .sort((a, b) => stored[a] - stored[b])
      .reverse()
      .slice(0, PER_LINE * TOTAL_FREQUENT_LINES);
    const last = storage()?.getItem(`${NAMESPACE}.last`);
    if (last && !ids.includes(last)) {
      ids.pop();
      ids.push(last);
    }
    frequentIds = ids;
  }

  // frequently.add() verbatim: bump the counter, remember it as `.last`, persist both.
  function rememberFrequent(entry: EmojiDumpEntry) {
    const store = storage();
    if (!store) return;

    const counts =
      readFrequently() ??
      Object.fromEntries(
        FREQUENTLY_DEFAULTS.slice(0, PER_LINE).map((id, index) => [id, PER_LINE - index])
      );
    counts[entry.id] = (counts[entry.id] ?? 0) + 1;
    try {
      store.setItem(`${NAMESPACE}.last`, entry.id);
      store.setItem(`${NAMESPACE}.frequently`, JSON.stringify(counts));
    } catch {
      // A full or read-only store must not break picking an emoji.
    }
  }

  const frequentEntries = $derived(
    frequentIds
      .map((id) => entriesById.get(id))
      .filter((entry): entry is EmojiDumpEntry => Boolean(entry))
  );

  function entriesFor(categoryIndex: number) {
    // Category 0 is Recent, which is data rather than dump markup.
    return categoryIndex === 0
      ? frequentEntries
      : EMOJI_DUMP_DATA.categories[categoryIndex].entries;
  }

  // ---------------------------------------------------------------- selection & preview

  function selectEmoji(entry: EmojiDumpEntry) {
    onentry?.(entry);
    onselect(entry.glyph);
    rememberFrequent(entry);
  }

  const previewEntry = $derived(hovered ?? EMOJI_DUMP_DATA.preview);
  const previewSpriteStyle = $derived(
    hovered
      ? spriteStyleFor(hovered, PREVIEW_SIZE)
      : composeSpriteStyle(PREVIEW_SIZE, EMOJI_DUMP_DATA.preview.spritePosition)
  );

  // ---------------------------------------------------------------- skins

  // emoji-skins upstream: the first click opens the row, the second picks a tone.
  function handleSkinClick(tone: number) {
    if (!skinsOpened) {
      skinsOpened = true;
      return;
    }
    skinsOpened = false;
    if (tone === skin) return;

    skin = tone;
    try {
      storage()?.setItem(`${NAMESPACE}.skin`, String(tone));
    } catch {
      // Persisting the tone is best-effort.
    }
  }

  const skinVisible = (tone: number) => skinsOpened || tone === skin;

  // ---------------------------------------------------------------- lifecycle

  // Verbatim port of upstream's probe; returns 0 without a document, exactly as it does.
  function measureScrollbar() {
    if (typeof document === 'undefined') return 0;

    const probe = document.createElement('div');
    probe.style.width = '100px';
    probe.style.height = '100px';
    probe.style.overflow = 'scroll';
    probe.style.position = 'absolute';
    probe.style.top = '-9999px';
    document.body.append(probe);
    const width = probe.offsetWidth - probe.clientWidth;
    probe.remove();

    return width;
  }

  let scrollbarWidth = $state(0);
  const pickerWidth = $derived(EMOJI_BASE_WIDTH + scrollbarWidth);

  function captureEmojiSearchInput(node: HTMLInputElement) {
    emojiSearchInput = node;

    return () => {
      if (emojiSearchInput === node) emojiSearchInput = undefined;
    };
  }

  function captureCategorySection(index: number) {
    return (node: HTMLElement) => {
      categorySections[index] = node;

      return () => {
        // Cleared in place rather than spliced: splicing shifts every later category's
        // index, so the anchors would scroll to the wrong section after a teardown.
        if (categorySections[index] === node) categorySections[index] = undefined;
      };
    };
  }

  function manageEmojiScroll(node: HTMLElement) {
    emojiScrollElement = node;

    return () => {
      if (emojiScrollElement === node) emojiScrollElement = undefined;
    };
  }

  function portalPopover(node: HTMLElement) {
    // Measured here rather than in an $effect because it is one-shot mount-time DOM
    // work, and it has to settle before place() measures the popover.
    scrollbarWidth = measureScrollbar();

    const storedSkin = Number(storage()?.getItem(`${NAMESPACE}.skin`));
    if (storedSkin >= 1 && storedSkin <= 6) skin = storedSkin;
    loadFrequently();

    const place = () => {
      const trigger = document.querySelector<HTMLElement>(`[aria-describedby="${node.id}"]`);
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const devicePixelRatio = window.devicePixelRatio || 1;
      const roundToDevicePixel = (value: number) =>
        Math.round(value * devicePixelRatio) / devicePixelRatio;
      const x = roundToDevicePixel(triggerRect.left + triggerRect.width / 2 - 138);
      const y = roundToDevicePixel(
        triggerRect.top + window.scrollY - 8 - document.documentElement.clientHeight
      );

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
  style="position: absolute; inset: auto auto 0px 0px; margin: 0px; transform: translate3d(483.5px, -52.5px, 0px);"
>
  <div
    class="popover-arrow"
    data-popper-arrow=""
    style="position: absolute; left: 0px; transform: translate3d(129px, 0px, 0px);"
  ></div>
  <div class="popover-body">
    <svelte:element this={"emoji-mart"}>
      <section class="emoji-mart emoji-mart-dark" style="width: {pickerWidth}px;">
        <div class="emoji-mart-bar">
          <svelte:element this={"emoji-mart-anchors"}>
            <div class="emoji-mart-anchors">
              {#each EMOJI_DUMP_DATA.anchors as anchor, index (anchor.title)}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span
                  class={[
                    'emoji-mart-anchor',
                    { 'emoji-mart-anchor-selected': !searchResults && selectedCategory === index }
                  ]}
                  title={anchor.title}
                  style:color={!searchResults && selectedCategory === index
                    ? 'rgb(174, 101, 197)'
                    : undefined}
                  onclick={() => selectCategory(index)}
                  onkeydown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') selectCategory(index);
                  }}
                >
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                    >
                      <path d={anchor.path}></path>
                    </svg>
                  </div>
                  <span class="emoji-mart-anchor-bar" style="background-color: rgb(174, 101, 197);"
                  ></span>
                </span>
              {/each}
            </div>
          </svelte:element>
        </div>

        <svelte:element this={"emoji-search"}>
          <div class="emoji-mart-search">
            <input
              id="emoji-mart-search-2"
              class="ng-untouched ng-pristine ng-valid"
              type="search"
              placeholder="Search"
              {@attach captureEmojiSearchInput}
              oninput={(event) => handleSearch(event.currentTarget.value)}
            />
            <label class="emoji-mart-sr-only" for="emoji-mart-search-2">Search</label>
            <button
              class="emoji-mart-search-icon"
              type="button"
              disabled={!query}
              aria-label="Clear"
              onclick={clearQuery}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                width="13"
                height="13"
                opacity="0.5"
              >
                <path d={query ? SEARCH_ICONS.delete : SEARCH_ICONS.search}></path>
              </svg>
            </button>
          </div>
        </svelte:element>

        <section
          class="emoji-mart-scroll"
          aria-label="List of emoji"
          {@attach manageEmojiScroll}
          onscroll={syncSelectedCategory}
        >
          <svelte:element this={"emoji-category"}>
            <section
              class={[
                'emoji-mart-category',
                { 'emoji-mart-no-results': !searchResults || searchResults.length === 0 }
              ]}
              aria-label="Search Results"
              style:display={searchResults ? 'block' : 'none'}
            >
              <div class="emoji-mart-category-label" data-name="Search">
                <span aria-hidden="true">Search Results</span>
              </div>
              {#if searchResults && searchResults.length}
                {#each searchResults as entry (entry.id)}
                  <svelte:element this={"ngx-emoji"}>
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span
                      class="emoji-mart-emoji"
                      aria-label={entry.ariaLabel}
                      onmouseenter={() => (hovered = entry)}
                      onmouseleave={() => (hovered = null)}
                      onclick={() => selectEmoji(entry)}
                      onkeydown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') selectEmoji(entry);
                      }}
                    >
                      <span style={spriteStyleFor(entry)}></span>
                    </span>
                  </svelte:element>
                {/each}
              {:else}
                <div>
                  <div>
                    <svelte:element this={"ngx-emoji"}>
                      <span
                        class="emoji-mart-emoji"
                        aria-label={EMOJI_DUMP_DATA.noResults.ariaLabel}
                      >
                        <span
                          style={composeSpriteStyle(
                            PREVIEW_SIZE,
                            EMOJI_DUMP_DATA.noResults.spritePosition
                          )}
                        ></span>
                      </span>
                    </svelte:element>
                  </div>
                  <div class="emoji-mart-no-results-label">No Emoji Found</div>
                </div>
              {/if}
            </section>
          </svelte:element>

          {#each EMOJI_DUMP_DATA.categories as category, categoryIndex (category.name)}
            <svelte:element this={"emoji-category"}>
              <section
                {@attach captureCategorySection(categoryIndex)}
                class="emoji-mart-category"
                aria-label={category.anchorTitle}
                style:display={searchResults ? 'none' : undefined}
              >
                <div class="emoji-mart-category-label" data-name={category.name}>
                  <span aria-hidden="true">{category.anchorTitle}</span>
                </div>
                {#each entriesFor(categoryIndex) as entry, entryIndex (`${categoryIndex}-${entryIndex}`)}
                  <svelte:element this={"ngx-emoji"}>
                    {#if entry}
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span
                        class="emoji-mart-emoji"
                        aria-label={entry.ariaLabel}
                        onmouseenter={() => (hovered = entry)}
                        onmouseleave={() => (hovered = null)}
                        onclick={() => selectEmoji(entry)}
                        onkeydown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') selectEmoji(entry);
                        }}
                      >
                        <span style={spriteStyleFor(entry)}></span>
                      </span>
                    {/if}
                  </svelte:element>
                {/each}
              </section>
            </svelte:element>
          {/each}
        </section>

        <div class="emoji-mart-bar">
          <svelte:element this={"emoji-preview"} title="Emoji Mart™">
            <div class="emoji-mart-preview">
              <div class="emoji-mart-preview-emoji">
                <svelte:element this={"ngx-emoji"}>
                  <span class="emoji-mart-emoji" aria-label={previewEntry.ariaLabel}>
                    <span style={previewSpriteStyle}></span>
                  </span>
                </svelte:element>
              </div>
              <div class="emoji-mart-preview-data">
                {#if hovered}
                  <div class="emoji-mart-preview-name">{hovered.name}</div>
                  <div class="emoji-mart-preview-shortname">
                    {#each hovered.shortNames as shortName (shortName)}
                      <span class="emoji-mart-preview-shortname">:{shortName}:</span>
                    {/each}
                  </div>
                  <div class="emoji-mart-preview-emoticons">
                    {#each hovered.emoticons as emoticon (emoticon)}
                      <span class="emoji-mart-preview-emoticon">{emoticon}</span>
                    {/each}
                  </div>
                {:else}
                  <span class="emoji-mart-title-label"></span>
                {/if}
              </div>
              <div class="emoji-mart-preview-skins">
                <svelte:element this={"emoji-skins"}>
                  <section class={['emoji-mart-skin-swatches', { opened: skinsOpened }]}>
                    {#each EMOJI_DUMP_DATA.skinTones as tone, index (tone.title)}
                      <span class={['emoji-mart-skin-swatch', { selected: index + 1 === skin }]}>
                        <svelte:element
                          this={"span"}
                          role="button"
                          class={tone.className}
                          tabindex="0"
                          aria-hidden={skinVisible(index + 1) ? 'false' : 'true'}
                          {...{
                            'aria-pressed': skinsOpened ? String(index + 1 === skin) : '',
                            'aria-expanded': index + 1 === skin ? String(skinsOpened) : ''
                          } as Record<string, string>}
                          aria-haspopup={index + 1 === skin ? 'true' : 'false'}
                          aria-label={tone.title}
                          title={tone.title}
                          onclick={() => handleSkinClick(index + 1)}
                          onkeydown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleSkinClick(index + 1);
                            }
                          }}
                        ></svelte:element>
                      </span>
                    {/each}
                  </section>
                </svelte:element>
              </div>
            </div>
          </svelte:element>
        </div>
      </section>
    </svelte:element>
  </div>
</svelte:element>
