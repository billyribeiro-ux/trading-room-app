<script lang="ts">
  import { invalidate } from '$app/navigation';
  import type { Attachment } from 'svelte/attachments';
  import type { Snippet } from 'svelte';

  import type { ChatMode } from '#lib/chat-mode.js';
  import type { RoomSplit } from '#lib/room/split.svelte.js';

  /*
    THE ROOM'S LAYOUT, and only the layout.

    Phase 5, S4 + S8, and they are ONE slice on purpose: S4 moves the two layout effects and S8
    creates the file they move into. Splitting them would have produced either a shell with no
    effects or two effects with nowhere to go.

    ## What this owns, and what it deliberately does not

    It owns the `as-split` element, its direction, the gutter, and the DOM ORDER of the three panes —
    which on a phone is a different order, not a restyling. It does NOT own the panes. Those arrive
    as SNIPPETS, still built on `+page.svelte` with their own prop lists intact.

    That is the whole reason this extraction is cheap. `AlertChatArea` takes 45 props,
    `PresentationArea` over 90 and `ExtraChatPane` 28; passing them THROUGH a shell would have meant
    ~160 pass-through props, a second place for every one of them to drift, and a change every one of
    the panes' contract tests would have had to follow. A snippet is a closure over the page's scope,
    so the layout can place markup it knows nothing about.

    ## Why the two effects belong here rather than on the page or in `RoomSplit`

    Not in the class: Svelte's `$effect` docs are explicit that *"if `$state` and `$derived` are used
    directly inside the `$effect` (for example, during creation of a reactive class), those values
    will not be treated as dependencies"*, so a constructor-registered effect reading
    `split.isMobileScreen` would never see the viewport change — which is the one thing both of these
    exist to watch.

    Not on the page either, now that there is somewhere better: both are about THIS element. One
    refetches when the layout flips across the mobile threshold because the two templates render
    different numbers of messages; the other collapses the chat pane of the split this file renders.

    `svelte-autofixer` returns zero issues and five suggestions, all the same advisory — *"you are
    calling a function inside an $effect… could it use `$derived`?"* Declined, recorded rather than
    ignored, per `ExtraChatPane.svelte`: `invalidate` is a SvelteKit data refetch, `setTimeout` and
    `clearTimeout` are platform, and `collapseChatForMode` performs a LAYOUT TRANSITION — it saves
    the pane's size before collapsing so it can be restored. None of those is a value, and a
    `$derived` that refetched page data on read would be the actual malpractice.

    ## Authority is not decided here

    `isPresenter` and `hideChatAlerts` arrive already resolved — the first from `data.user.role` on
    the server, the second from the room's own gate module. This file asks who, it never answers.
  */
  let {
    split,
    captureMainElement,
    chatOnlyMode,
    viewerOnlyMode,
    hideChatAlerts,
    hidePresentation,
    extraChatColumnVisible,
    isPresenter,
    chatMode,
    beginSplit,
    chatAlertsPane,
    presentationPane,
    extraChatPane
  }: {
    split: RoomSplit;
    /** The page's own handle on `#mainAreaSplit`; several page handlers measure it. */
    captureMainElement: Attachment<HTMLElement>;
    chatOnlyMode: boolean;
    viewerOnlyMode: boolean;
    hideChatAlerts: boolean;
    hidePresentation: boolean;
    extraChatColumnVisible: boolean;
    /** Resolved on the SERVER. Read only to decide who keeps their chat pane in mode `d`. */
    isPresenter: boolean;
    chatMode: ChatMode;
    beginSplit: (event: PointerEvent, key: 'main') => void;
    /** The three panes, built on the page and PLACED here. See the note above on why. */
    chatAlertsPane: Snippet;
    presentationPane: Snippet;
    extraChatPane: Snippet;
  } = $props();

  /**
   * The other half of `onResize`, and the half that is easy to miss: crossing the threshold REFETCHES
   * (`app-room.full.js:2987-2999`).
   *
   * ```js
   * this.isMobileScreen = e.target.innerWidth <= 601;
   * this.appService.guiEventBus.emit('resizeChatView');
   * if (this.isMobileScreen !== this.onResizeChange) {
   *   clearTimeout(this.onResizeTimer);
   *   this.onResizeTimer = setTimeout(() => {
   *     this.appService.guiEventBus.emit('appHasFocusGetChatLog');
   *     if (preferences.extraChatColumn) emit('appHasFocusGetChatLogExtraChatColumn');
   *     this.appService.sendServerCommand('getAlertsLog', { page: 0 });
   *     this.onResizeChange = this.isMobileScreen;
   *   }, 500);
   * }
   * ```
   *
   * Why it exists: the two templates render different numbers of messages, so the log the room is
   * holding is the wrong length the moment the layout changes. It fires on the FLIP and not on every
   * resize — `onResizeChange` is the last threshold actually acted on, which is why dragging a
   * window across 400px of desktop width costs nothing.
   *
   * `invalidate('room:data')` is all three commands at once here: the load registers
   * `depends('room:data')` (`+page.server.ts:124`) and returns the alerts and the messages together,
   * so there is no separate alerts request to make. The extra-chat emit has no counterpart because
   * `prefs.extraChatColumn` has zero occurrences in this room — a pre-existing gap, not one opened here.
   *
   * `lastThresholdActedOn` is a PLAIN variable, not `$state`: nothing renders from it, and making it
   * reactive would put a write to a tracked value inside the effect that reads it. It starts `null`
   * to mean "never measured", which is how the first paint on a phone avoids a refetch it does not
   * need — upstream gets the same effect from `isMobileScreen = onResizeChange = …` in one
   * statement at init (`:1889`), so the two are equal before any resize can happen.
   */
  let lastThresholdActedOn: boolean | null = null;
  let resizeRefetchTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  const RESIZE_REFETCH_DELAY_MS = 500;

  $effect(() => {
    const mobile = split.isMobileScreen;
    if (split.viewportWidth === 0) return;
    if (lastThresholdActedOn === null) {
      lastThresholdActedOn = mobile;
      return;
    }
    if (mobile === lastThresholdActedOn) return;
    globalThis.clearTimeout(resizeRefetchTimer);
    resizeRefetchTimer = globalThis.setTimeout(() => {
      lastThresholdActedOn = mobile;
      void invalidate('room:data');
    }, RESIZE_REFETCH_DELAY_MS);
    return () => globalThis.clearTimeout(resizeRefetchTimer);
  });

  /*
    The chat pane collapsing for a non-presenter in mode `d` — the ONE piece of the split driven
    from outside `RoomSplit` itself.

    The transition — what to save, what to restore, and why a re-run must not record the collapsed
    size as the one to restore — is `split.collapseChatForMode`, with the capture's `hideChat`
    subscription quoted above it. What stays out here is the question of WHO collapses, a
    room-authority answer that class has no business knowing: a presenter keeps their pane, because
    they are the one who turned chat off and still has to read it.

    "Out here" meant `+page.svelte` until 2026-08-17 and now means this component, which is the
    better address for the same reason the effect exists: it is about the split THIS file renders.
    The sentence is corrected rather than left, because a moved comment that still says "here" is
    a comment pointing at the wrong file.
  */
  $effect(() => {
    split.collapseChatForMode(!isPresenter && chatMode === 'd');
  });
</script>

<!--
  `z('ngClass', ut(5, QB, videoOnlyMode || chatOnlyMode || viewerOnlyMode))` with
  `QB = (t) => ({'vh-100': t})` (`app-room.render-helpers.js:1639-1648, 11`).

  It is the other half of hiding a column: with the chat and alerts gone the split has one
  child, and `.vh-100 { height: 100vh !important }`
  (`css/complete-app-styles.css:4992`) is what makes the screen fill the window instead of
  keeping the height it had beside them.

  `videoOnlyMode` is the `r` query parameter — the media.recording-bot mode — which this room does
  not model; the same honest gap `files-gates.ts` already records for `hideFiles`. The two
  modes this room does model are bound.
-->
<as-split
  {@attach captureMainElement}
  minsize="0"
  id="mainAreaSplit"
  gutterdblclickduration="400"
  class={{ 'is-resizing': split.target !== null, 'vh-100': chatOnlyMode || viewerOnlyMode }}
  style={split.isHorizontal ? undefined : 'flex-direction: column;'}
  dir="ltr"
>
  {#snippet mainGutter()}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      role="separator"
      tabindex="0"
      class="as-split-gutter"
      aria-orientation={split.isHorizontal ? 'horizontal' : 'vertical'}
      aria-valuemin="0"
      aria-valuenow={split.primaryPercent}
      aria-valuetext={`${Math.round(split.primaryPercent)} percent`}
      style={split.isMobileScreen ? 'flex-basis: 11px;' : 'flex-basis: 11px; order: 1;'}
      onpointerdown={(event) => beginSplit(event, 'main')}
    >
      <div class="as-split-gutter-icon"></div>
    </div>
  {/snippet}

  <!--
  `O(5, o.isMobileScreen ? 6 : 5)` — `app-room.full.js:4061`. The 601px threshold does not
  restyle this layout, it selects a DIFFERENT ONE: `K4e`
  (`app-room.render-helpers.js:1783-1821`) against the desktop `j4e` (`:1616-1664`).

  What actually differs, read from those two functions and the const table rather than
  inferred:

    - the CHILD ORDER is reversed. `K4e` is presentation (`G4e`, node 1, gated
      `O(1, hidePresentation ? -1 : 1)`), then chat/alerts (`W4e`, node 2,
      `O(2, hideChatAlerts ? -1 : 2)`). `j4e` is chat/alerts (node 1), extra chat, then
      presentation (node 3). The gates are the same two flags either way, which is why
      they are written once here and read twice.
    - the split is VERTICAL as a static attribute, not a binding — const 224 carries
      `'direction','vertical'` where const 8 carries `3,'direction'`. Handled by
      `split.isHorizontal`.
    - there is NO `dragEnd`, so a mobile drag is never recorded. Handled in
      `RoomSplit.endDrag`, which returns no write on that path.
    - the areas carry no `order`. Handled in `split.primaryAreaStyle` and
      `split.presentationAreaStyle`, and it is why this block reorders the DOM instead of
      restyling it.

  The gutter is a snippet for exactly that reason: on a phone it has to sit BETWEEN the two
  panes in document order, because there is no `order` property left to place it with.

  Snippets rather than a second copy of the markup: the two panes are ~1,625 lines, and a
  duplicated layout is one that drifts the first time somebody edits the version they
  happen to be looking at.
-->
  {#if split.isMobileScreen}
    {#if !hidePresentation}{@render presentationPane()}{/if}
    {@render mainGutter()}
    {#if !hideChatAlerts}{@render chatAlertsPane()}{/if}
    {#if !hideChatAlerts && extraChatColumnVisible}{@render extraChatPane()}{/if}
  {:else}
    {#if !hideChatAlerts}{@render chatAlertsPane()}{/if}
    {#if !hideChatAlerts && extraChatColumnVisible}{@render extraChatPane()}{/if}
    {#if !hidePresentation}{@render presentationPane()}{/if}
    {@render mainGutter()}
  {/if}
</as-split>
