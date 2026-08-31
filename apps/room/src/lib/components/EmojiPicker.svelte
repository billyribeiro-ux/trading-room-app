<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';

  import { EMOJI_DUMP_DATA, type EmojiDumpEntry } from '#lib/emoji-data.js';
  import {
    FREQUENTLY_DEFAULTS,
    NAMESPACE,
    emojiStorage,
    frequentIdsNow,
    rememberFrequent
  } from '#lib/emoji-frequently.js';
  import { createEmojiSearch } from '#lib/emoji-search.js';

  interface Props {
    onselect: (glyph: string) => void;
    onentry?: (entry: EmojiDumpEntry) => void;
    popoverId?: string;
  }

  let { onselect, onentry, popoverId = 'ngb-popover-3' }: Props = $props();

  /**
   * `EMOJI-07` — the search field's id, per INSTANCE.
   *
   * ```js
   * inputId = "emoji-mart-search-" + ++Qee;   // counter initialised Qee=0 at byte 736,204
   * ```                                                                       // byte 736,424
   *
   * This emitted the literal `emoji-mart-search-2` on the input and again on its `<label for>`, in
   * every instance — and two pickers can be mounted at once here: the main composer's and the extra
   * column's, or two message reaction pickers, since `reactionPickerOpen` is per `RoomMessage`. Two
   * elements with one id makes the second picker's label operate the first picker's field.
   *
   * `$props.id()` rather than a module counter, and the difference is server rendering: the rune is
   * documented as *"unique to the current component instance"* and *"when hydrating a
   * server-rendered component, the value will be consistent between server and client"*. A counter
   * would number the server's instances and the client's independently, and hydration would find
   * two different ids for one field.
   */
  const uid = $props.id();
  const searchInputId = `emoji-mart-search-${uid}`;

  /**
   * `EMOJI-08` — `darkMode`, which the reference COMPUTES and this hardcoded.
   *
   * ```js
   * Rh("emoji-mart ", o.darkMode ? "emoji-mart-dark" : "", "")                // byte 754,689
   * darkMode = !("function" != typeof matchMedia || !matchMedia("(prefers-color-scheme: dark)").matches)
   * ```                                                                       // byte 744,873
   *
   * The application leaves the field at that default, so on a light-scheme machine the reference's
   * picker renders the light palette and ours was always dark. Both palettes ship in
   * `protradingroom-source.css`, so only the decision differed.
   *
   * `MediaQuery` from `svelte/reactivity` is the documented way to read this reactively — and it is
   * CONSTRUCTED BEHIND UPSTREAM'S OWN GUARD, which is not defensiveness copied for its own sake.
   * `MediaQuery`'s constructor calls `window.matchMedia` immediately, so building one where the API
   * does not exist throws; upstream's `"function" != typeof matchMedia ||` is exactly that check,
   * and without it this component would crash in an environment where the reference degrades to the
   * light palette. jsdom is one such environment, which is how it was found.
   *
   * The server is another: nothing is constructed there, so SSR emits the light palette and a
   * dark-scheme machine gains the class on hydration. That is a one-frame palette swap on a popover
   * the reader has just opened by clicking, and it is the cost of the reference applying a CLASS
   * rather than a media query — the two palettes live in `protradingroom-source.css` keyed off
   * `.emoji-mart-dark`, so doing it in CSS as Svelte's docs prefer would mean duplicating a captured
   * stylesheet rather than reading it.
   */
  const prefersDark =
    typeof matchMedia === 'function' ? new MediaQuery('prefers-color-scheme: dark') : null;

  /*
    Constants read off the deployed picker (docs/source/main.d6d3c112b59b7d0d.js):
    perLine=9, emojiSize=24, totalFrequentLines=4, NAMESPACE="emoji-mart",
    notFoundEmoji="sleuth_or_spy", emoji="department_store" (the idle preview).
    `maxResults=75` went with the search it caps - `#lib/emoji-search.ts`, `MAX_RESULTS`.
  */
  const PER_LINE = 9;
  const EMOJI_SIZE = 24;
  const PREVIEW_SIZE = 38;
  const TOTAL_FREQUENT_LINES = 4;

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

  const allEntries: EmojiDumpEntry[] = EMOJI_DUMP_DATA.categories
    .flatMap((category) => category.entries)
    .filter((entry): entry is EmojiDumpEntry => Boolean(entry));
  const entriesById = new Map(allEntries.map((entry) => [entry.id, entry]));

  let query = $state('');
  let selectedCategory = $state(0);
  let skin = $state(1);
  let skinsOpened = $state(false);
  let hovered = $state<EmojiDumpEntry | null>(null);
  /* RAW: `runSearch` returns a fresh array and `null` clears it; never written into. */
  let searchResults = $state.raw<EmojiDumpEntry[] | null>(null);
  let frequentIds = $state.raw<string[]>(FREQUENTLY_DEFAULTS.slice(0, PER_LINE));

  let emojiSearchInput: HTMLInputElement | null = null;
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
    `buildSearch()`, its per-id memo and `search()` are `#lib/emoji-search.ts` — a module, because
    upstream they are a SERVICE (`Yee`, class body at byte 730,571) and this component is the view
    over it, exactly as `emoji-search` the component is upstream. `runSearch` is this picker's own
    handle on it, built once against the whole pool so the memo lives as long as the picker does.
  */
  const runSearch = createEmojiSearch(allEntries);

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

  /**
   * `EMOJI-06` — Enter picks the first result.
   *
   * ```js
   * handleEnterKey(e, i) { if (!i && null !== this.SEARCH_CATEGORY.emojis &&
   *   this.SEARCH_CATEGORY.emojis.length) { if (!(i = this.SEARCH_CATEGORY.emojis[0])) return;
   *   wC(this.emojiSelect, this.ngZone, {$event: e, emoji: i}) } … }           // byte 750,272
   *
   * setupKeyupListener() { … fromEvent(input, "keyup") … subscribe(e => {
   *   !this.query || "Enter" !== e.key || (this.enterKeyOutsideAngular.emit(e), e.preventDefault())
   * }) }                                                                       // byte 737,093
   * ```
   *
   * `keyup`, which is upstream's own event and the right one here for the same reason `poll-08`
   * gives: holding Enter repeats `keydown`, and a repeat would insert the emoji once per repeat into
   * whatever composer the picker is feeding.
   *
   * ## Upstream's `!this.query` guard is NOT transcribed, and a negative control is why
   *
   * It was, at first, on the reading that "the box is empty" and "there are no results" are
   * different tests. The control that deleted it stayed GREEN, so the reading was checked instead of
   * the test being strengthened — and it is wrong HERE, though it is right upstream.
   *
   * `runSearch` returns `null` for an empty string and `null` again for a whitespace-only one (its
   * `terms.filter(Boolean)` empties), so in this component `searchResults?.[0]` is already undefined
   * in every case `!query` covers. Upstream's `SEARCH_CATEGORY.emojis` is not that: it is null only
   * before any search has run, so there the two really are different questions.
   *
   * One statement of a fact rather than two. The behaviour is unchanged and the tests that pin it —
   * empty box, and a query matching nothing — both still pass, which is the evidence that this is a
   * deletion and not a regression.
   */
  function handleSearchKeyup(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    const first = searchResults?.[0];
    if (!first) return;
    event.preventDefault();
    selectEmoji(first);
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

  /*
    `#lib/emoji-frequently.ts` holds the row and its storage, for the same reason the search is a
    module: upstream `NR` (byte 723,544) is a `providedIn: "root"` SERVICE and this component is
    the view over it. What stays here is the one reactive cell it feeds.
  */
  function loadFrequently() {
    frequentIds = frequentIdsNow(PER_LINE, TOTAL_FREQUENT_LINES);
  }

  const frequentEntries = $derived(
    frequentIds
      .map((id) => entriesById.get(id))
      .filter((entry): entry is EmojiDumpEntry => Boolean(entry))
  );

  /*
    ── `EMOJI-09`: THE STAGED FIRST RENDER ─────────────────────────────────────────────────────────

    ```js
    const s = Math.min(this.categories.length, 3);
    this.setActiveCategories(this.activeCategories = this.categories.slice(0, s));
    const r = this.categories[s-1].emojis.slice();
    this.categories[s-1].emojis = r.slice(0, 60),
    setTimeout(() => { this.categories[s-1].emojis = r,
      this.setActiveCategories(this.categories), this.ref.detectChanges(), … })  // byte 747,768
    ```

    `emoji-data.ts` holds 1,821 entries. Opening the picker built every one of them — 1,821 spans,
    each with a composed sprite `style` string — synchronously, inside a click handler, before the
    popover could paint. The reference commits THREE categories with the LAST of the three capped at
    sixty cells and lets the rest arrive on the next macrotask, which is the difference between a
    picker that opens and a picker that opens after a stutter. Which three those are is decided by
    the array upstream counts, and that array is not this one — see `SEARCH_CATEGORY_SLOT` below,
    and `EMOJI2-01`.

    A bare `setTimeout` with no delay, exactly as upstream: the point is to yield to the browser once,
    not to wait for a duration. `$effect` owns it so the timer is cleared if the picker is closed
    inside that first frame — upstream leaks that timeout and its callback then writes to a destroyed
    component's fields, which is harmless there and would be a warning here.

    `svelte-autofixer` returns no issues and three suggestions on this block, all the same one: *"the
    stateful variable `staged` is assigned inside an $effect… consider using `$derived` if
    possible."* DECLINED, and recorded rather than ignored, the same way `PresentationArea` and
    `ExtraChatPane` record their own declines.

    **A `$derived` cannot express "one macrotask has passed since mount".** It is a function of the
    values it reads, and there is no value here to read — the whole content of `staged` is that time
    has moved, which is the definition of a side effect. The suggestion exists to catch a derivation
    written as an effect; this is the opposite, and rewriting it as one would mean inventing a
    reactive clock to derive from.
  */
  const STAGED_CATEGORIES = 3;
  const STAGED_LAST_CELLS = 60;

  /**
   * `EMOJI2-01` — the Search category occupies one of the three, and this used to spend it on a
   * fourth screenful of cells.
   *
   * `this.categories` upstream is NOT the dump's nine. `ngOnInit` builds it and then puts two
   * synthetic categories at the front before the staging arithmetic runs:
   *
   * ```js
   * i&&!o&&(this.hideRecent=!1,this.categories.unshift(this.RECENT_CATEGORY));
   * this.categories[0]&&(this.categories[0].first=!0);
   * this.categories.unshift(this.SEARCH_CATEGORY);
   * ```
   *
   * `unshift(this.RECENT_CATEGORY)` begins at byte 747,584 and `unshift(this.SEARCH_CATEGORY)` at
   * byte 747,681 — both before `const s=Math.min(this.categories.length,3)` at byte 747,768, which
   * is the line already quoted above. The token `SEARCH_CATEGORY` is first defined at byte 745,709,
   * as `SEARCH_CATEGORY={id:"search",name:"Search",emojis:null,anchor:!1}`. So the
   * array the `Math.min(length, 3)` below counts is `[Search, Recent, Smileys & People, …]`, and
   * `categories.slice(0, 3)` commits **Search (empty), Recent (9) and the first 60 of Smileys &
   * People** — 69 cells.
   *
   * `EMOJI_DUMP_DATA.categories` has no Search entry: that section is rendered once, on its own,
   * below. Counting the dump's array directly therefore committed `[Recent, Smileys & People,
   * Animals & Nature]` and capped the THIRD, so the first frame built 9 + 487 + 60 = **556** cells
   * where the reference builds 69 — the whole 487-entry Smileys & People category, uncapped, inside
   * the click handler this staging exists to get out of.
   *
   * The offset is declared rather than folded into a literal 2, because it is a fact about the
   * reference's array and not a tuning constant: one synthetic category sits ahead of the dump's.
   */
  const SEARCH_CATEGORY_SLOT = 1;

  let staged = $state(true);

  $effect(() => {
    const timer = setTimeout(() => {
      staged = false;
    });
    return () => clearTimeout(timer);
  });

  /** `Math.min(this.categories.length, 3)`, less the Search slot — and the whole list after. */
  const stagedCount = $derived(
    Math.min(EMOJI_DUMP_DATA.categories.length + SEARCH_CATEGORY_SLOT, STAGED_CATEGORIES) -
      SEARCH_CATEGORY_SLOT
  );
  const visibleCategories = $derived(
    staged ? EMOJI_DUMP_DATA.categories.slice(0, stagedCount) : EMOJI_DUMP_DATA.categories
  );

  function entriesFor(categoryIndex: number) {
    // Category 0 is Recent, which is data rather than dump markup.
    const entries =
      categoryIndex === 0 ? frequentEntries : EMOJI_DUMP_DATA.categories[categoryIndex].entries;
    /*
      `this.categories[s-1].emojis = r.slice(0, 60)` — the LAST committed category, not the third:
      the reference indexes `s-1`, so a picker with fewer than three categories caps whichever one is
      last. Reproduced by index rather than by the literal 2.
    */
    if (staged && categoryIndex === stagedCount - 1) return entries.slice(0, STAGED_LAST_CELLS);
    return entries;
  }

  // ---------------------------------------------------------------- selection & preview

  function selectEmoji(entry: EmojiDumpEntry) {
    onentry?.(entry);
    onselect(entry.glyph);
    rememberFrequent(entry, PER_LINE);
  }

  /**
   * `EMOJI-12` — the preview clears one animation frame LATE, and is cancelled by the next cell.
   *
   * ```js
   * handleEmojiOver(e) { … cancelAnimationFrame(this.animationFrameRequestId) … }
   * handleEmojiLeave() { !this.showPreview || !this.previewRef ||
   *   (this.animationFrameRequestId = requestAnimationFrame(() => {
   *     this.previewEmoji = null, this.ref.detectChanges() })) }               // byte 750,893
   * ```
   *
   * The pair is the feature. Sliding across a row fires `mouseleave` on one cell and `mouseenter` on
   * the next, in that order, so clearing synchronously flashes the idle preview between every pair
   * of cells — nine flashes crossing one line. Deferring the clear by a frame and cancelling it on
   * the way in means the preview only ever returns to idle when the pointer has actually left the
   * grid.
   *
   * A plain field: nothing renders from the handle, and an effect that read it would re-run on the
   * write meant to end it — the same reason `arrivals.ts` keeps its markers plain.
   */
  let previewClearFrame: number | null = null;

  function hoverEnter(entry: EmojiDumpEntry) {
    if (previewClearFrame !== null) {
      cancelAnimationFrame(previewClearFrame);
      previewClearFrame = null;
    }
    hovered = entry;
  }

  function hoverLeave() {
    if (previewClearFrame !== null) cancelAnimationFrame(previewClearFrame);
    previewClearFrame = requestAnimationFrame(() => {
      previewClearFrame = null;
      hovered = null;
    });
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
      emojiStorage()?.setItem(`${NAMESPACE}.skin`, String(tone));
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

    const storedSkin = Number(emojiStorage()?.getItem(`${NAMESPACE}.skin`));
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
      <section
        class={['emoji-mart', { 'emoji-mart-dark': prefersDark?.current === true }]}
        style="width: {pickerWidth}px;"
      >
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
              id={searchInputId}
              class="ng-untouched ng-pristine ng-valid"
              type="search"
              placeholder="Search"
              bind:this={emojiSearchInput}
              oninput={(event) => handleSearch(event.currentTarget.value)}
              onkeyup={handleSearchKeyup}
            />
            <!--
              `EMOJI2-03` — the captured leading and trailing spaces, on all three of the picker's
              interpolated runs.

              `emoji-search` emits its label as `Ne(" ",o.i18n.search," ")` (byte 738,704) with
              `i18n.search === "Search"` (the defaults object `VR` at byte 744,221), and the preview
              emits `Ne(" :",e,": ")` (`Bee`, byte 719,646) and `Ne(" ",e," ")` (`Uee`, byte
              719,744). Angular's `Ne` writes those pads into the text node; plain text in a Svelte
              template loses them to Prettier and to HTML whitespace folding, which is why this
              repository writes them as mustaches — the same idiom, and the same declined autofixer
              suggestion, that `apps/room/AGENTS.md` records for `{' Retry '}` and its forty
              siblings. Every capture comparison here diffs rendered strings, so the pads are
              evidence rather than formatting.
            -->
            <label class="emoji-mart-sr-only" for={searchInputId}>{' Search '}</label>
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
                      onmouseenter={() => hoverEnter(entry)}
                      onmouseleave={hoverLeave}
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

          {#each visibleCategories as category, categoryIndex (category.name)}
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
                        onmouseenter={() => hoverEnter(entry)}
                        onmouseleave={hoverLeave}
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
                      <!-- `EMOJI2-03` — `Ne(" :",e,": ")`, byte 719,646. -->
                      <span class="emoji-mart-preview-shortname">{' :'}{shortName}{': '}</span>
                    {/each}
                  </div>
                  <div class="emoji-mart-preview-emoticons">
                    {#each hovered.emoticons as emoticon (emoticon)}
                      <!-- `EMOJI2-03` — `Ne(" ",e," ")`, byte 719,744. -->
                      <span class="emoji-mart-preview-emoticon">{' '}{emoticon}{' '}</span>
                    {/each}
                  </div>
                {:else}
                  <span class="emoji-mart-title-label"></span>
                {/if}
              </div>
              <!--
                `EMOJI2-02` — the swatches belong to the IDLE preview and go away while an emoji is
                hovered.

                `emoji-preview` renders TWO alternatives, not one block with a branch inside it:

                ```js
                H(0,jee,10,12,"div",0)        // *ngIf = o.emoji && o.emojiData — the hovered block
                d(1,"div",1)(2,"div",2) …     // const 1 = [1,"emoji-mart-preview",3,"hidden"]
                …
                z("ngIf",o.emoji&&o.emojiData), m(), z("hidden",o.emoji)      // byte 735,962
                ```

                `jee` (byte 719,840) holds the preview emoji and the name/shortnames/emoticons and
                NOTHING else; the skins div is inside the second block only, the one bound
                `[hidden]="o.emoji"`. So upstream the swatch row disappears for as long as the
                pointer is over a cell and comes back one animation frame after it leaves —
                `EMOJI-12`'s deferred clear is what makes that readable rather than a flicker.

                It is `hidden` rather than an `{#if}` for the reason upstream's is: the row keeps its
                `skinsOpened` state across the hover. And `hidden` still works on it — the two
                rules that touch this class, `{position:absolute;top:50%;transform:translateY(-50%)}`
                (reference sheet byte 365,090) and `{right:30px;text-align:right}` (byte 365,272),
                set no `display` between them, so the UA's `[hidden]{display:none}` is not outranked.
                That is the check that decides whether this attribute does anything at all, and both
                rules are applied here (`css/complete-app-styles.css:6247` and `:6250`).

                Ours drew them permanently, and `.emoji-mart-preview-data{left:68px;right:12px}` runs
                under the swatches, so a long emoji name overlapped them.
              -->
              <div class="emoji-mart-preview-skins" hidden={hovered !== null}>
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
