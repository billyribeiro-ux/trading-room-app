<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';

  import { EMOJI_DUMP_DATA, type EmojiDumpEntry } from '#lib/emoji-data.js';

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
    popover could paint. The reference commits THREE categories with the third capped at sixty cells
    and lets the rest arrive on the next macrotask, which is the difference between a picker that
    opens and a picker that opens after a stutter.

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

  let staged = $state(true);

  $effect(() => {
    const timer = setTimeout(() => {
      staged = false;
    });
    return () => clearTimeout(timer);
  });

  /** `Math.min(this.categories.length, 3)` — and the whole list once the first frame is past. */
  const stagedCount = $derived(Math.min(EMOJI_DUMP_DATA.categories.length, STAGED_CATEGORIES));
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
    rememberFrequent(entry);
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
            <label class="emoji-mart-sr-only" for={searchInputId}>Search</label>
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
