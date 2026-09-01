<script lang="ts">
  import { untrack } from 'svelte';
  import { panelDragResize } from '#lib/panel-drag.js';
  import type { RoomMedia } from '#lib/room/media.svelte.js';
  import type { RoomPrefs } from '#lib/room/prefs.svelte.js';

  /*
    ── `app-rec-preview` — TRANSCRIBED WHOLE, byte 2,353,188 ────────────────────────────────────

    The reference's recording preview: a 350x260 card pinned above the webcam holders, showing a
    still frame of what the SERVER is recording, refreshed once a second.

    ## What this file was until 2026-09-01, and why it changed

    It was eleven lines of markup with two handler-less icons and a forty-line argument for leaving
    them that way. The argument was sound on its own terms — the card is `display: none` with no
    writer, so nobody could press them — and it is superseded rather than refuted: the owner's
    instruction is to MATCH THE DUMP FILES EXACTLY END TO END, and a transcription that stops at the
    markup is not a match of a component whose behaviour is four subscriptions and a timer.

    The thing that made the old refusal look inevitable was a mis-scoped blocker. `recPreviewLocation`
    was read as "a value we do not have", and it is really "a value the SERVER sends" — one command,
    `setRecPreview`, now transcribed in `events.svelte.ts`. With that in place the whole component is
    transcribable, and the fact that THIS room's server never sends the command is not a gap: it
    makes `armed` false, and a reference room whose server has not sent it behaves identically. The
    gate is doing its job rather than standing in for missing work.

    ## The arming test, and the one term that is dropped

    ```js
    ngOnInit(){ this.appService.globals.videoOnlyMode
      || !this.appService.globals.isPresenter
      || !this.appService.globals.sessData.recPreviewLocation
      || !this.appService.globals.preferences.recPreviewWindow
      || ( this.expandRecPreview=!1, this.initDrag(), …six subscriptions… ) }
    ```

    `videoOnlyMode` is the `r` query parameter — the recording-bot mode — which this room does not
    implement at all; `gates.ts`, `private-chat.svelte.ts` and `RoomShell.svelte` each record the
    same absence. It is constantly false here, so `!videoOnlyMode` is constantly true and naming it
    would be config nothing reads. The other three terms are transcribed exactly.

    **`armed` is `$derived` where upstream reads its terms ONCE.** Angular evaluates `ngOnInit` at
    construction, so a `setRecPreview` arriving one tick later leaves the card unwired for the rest
    of the session — a race, not a design. A `$derived` arms the moment all three terms hold. That is
    the one place this diverges by being right, and it cannot produce a state the reference cannot:
    every arming term is monotonic in practice except the preference, which routes through
    `hideRecPreview()` on its way off (see `preference-side-effects.ts`).

    ## `shown` is `$state` and NOT `$derived`, and the reference proves it must be

    CLAUDE.md's rule is that an effect assigning a value derived from other state should be a
    `$derived`. `shown` is genuinely not one, and the counter-example is in the capture: after
    `startRec` shows the card, `closePreview()` hides it while `roomState.isRecording` is still true.
    Any expression over the room's state would put the card straight back. Upstream this is
    `$("#recLocalPreviewHolder").show()/.hide()` — imperative visibility with its own identity — and
    two effects driving one `$state` is the honest transcription of that.

    The four subscriptions collapse into three effects, and the collapse is exact rather than
    convenient:

      `reopenRecPreviewWindow` / `closeRecPreviewWindow` → the `media.recPreviewOpen` effect. The
      reference reaches these through `guiEventBus`, emitted by `showRecPreview()`/`hideRecPreview()`
      one statement after they assign `globals.recPreviewOpen`. The flag and the emit are always
      written together, so reacting to the flag IS reacting to the emit.

      `startRec` / `stopRec` → the `media.roomRecording` effect.

      `startRecTimer` / `clearRecTimer` / `pauseRec` / `resumeRec` / `ngOnDestroy` → the timer
      effect, whose predicate `shown && isRecording && !isRecordingPaused` is the exact set of
      states in which upstream's timer is running, and whose teardown is the exact set in which it
      is cleared.

    **`untrack` around each assignment is load-bearing.** `armed` is read inside it so that it gates
    SHOWING without becoming a dependency: were it tracked, switching `recPreviewWindow` off would
    re-run the first effect, find `armed` false, take the early return, and leave a visible card on
    screen with nothing able to close it. Upstream cannot reach that state because arming is decided
    once; `untrack` is how that is preserved without freezing the arming itself.

    ## One transcribed quirk, kept

    `startRec` shows the card WITHOUT setting `globals.recPreviewOpen`, so the recording menu still
    reads "Show Rec Preview" while the card is on screen. That is upstream's, it is observable, and
    it is reproduced rather than tidied — the same treatment `events.svelte.ts` gives the pause and
    resume sounds reading each other's preference.
  */
  interface Props {
    /**
     * The room's media state, whole — `recPreviewLocation`, `recPreviewOpen`, `roomRecording` and
     * `roomRecordingPaused` are all `globals`/`roomState` fields upstream, read and written from
     * this component and from the recording menu alike.
     *
     * Handed over whole rather than as four props plus a callback, which is `RoomOverlays`' own
     * convention ("nineteen of the thirty-six below are the room's state classes handed over
     * whole") and what lets `closePreview()` write `media.recPreviewOpen = false` exactly as the
     * capture writes `globals.recPreviewOpen = !1`.
     */
    media: RoomMedia;
    /** `preferences.recPreviewWindow` — USM-12, the viewer's own switch for this card. */
    prefs: RoomPrefs;
    /** `globals.isPresenter`. The server records only the presenter's own screen. */
    isPresenter: boolean;
  }

  let { media, prefs, isPresenter }: Props = $props();

  const armed = $derived(isPresenter && media.recPreviewLocation !== '' && prefs.recPreviewWindow);

  /** jQuery's `.show()` / `.hide()` on `#recLocalPreviewHolder`. See the block above. */
  let shown = $state(false);
  /** `this.expandRecPreview`, initialised to `!1` inside the arming branch. */
  let expanded = $state(false);
  /**
   * `Date.now()` from the 1s timer, and `0` means the timer has not fired yet.
   *
   * The reference's `<img>` const carries no `src` at all — `["id","recScreenLocalPreview",1,
   * "recPreviewScreen"]` — and only `startRecTimer` ever sets one, on the interval's FIRST fire at
   * t+1s. So the element renders with no `src` for one second, which is transcribed rather than
   * smoothed: seeding this with a timestamp would show the frame a second earlier than upstream
   * does, and `src=""` would re-request the page itself.
   */
  let tick = $state(0);
  let holder: HTMLDivElement | undefined = $state();

  /** `` `${sessData.recPreviewLocation}?${Date.now()}` `` — the cache-buster is the whole point. */
  const previewSrc = $derived(`${media.recPreviewLocation}?${tick}`);

  /* `guiEventBus.subscribe("reopenRecPreviewWindow" | "closeRecPreviewWindow", …)`. */
  $effect(() => {
    const open = media.recPreviewOpen;
    untrack(() => {
      if (!open) shown = false;
      else if (armed) shown = true;
    });
  });

  /* `appEventBus.subscribe("startRec" | "stopRec", …)`. The preference lives inside `armed`. */
  $effect(() => {
    const recording = media.roomRecording;
    untrack(() => {
      if (!recording) shown = false;
      else if (armed) shown = true;
    });
  });

  /*
    ```js
    startRecTimer(){ isRecording && !isRecordingPaused && (this.recTimer ||
      (this.recTimer = setInterval(() => { bc("#recScreenLocalPreview")
        .attr("src", `${sessData.recPreviewLocation}?${Date.now()}`) }, 1e3))) }
    clearRecTimer(){ this.recTimer && (clearInterval(this.recTimer), this.recTimer = null) }
    ```

    The `this.recTimer ||` guard is what stops a second interval being created when two of the four
    callers fire in a row; an effect has no such hazard, because Svelte tears the previous run down
    before starting the next. `shown` is in the predicate for the same reason `closePreview` and
    `stopRec` both call `clearRecTimer`: a hidden card must not keep fetching frames.
  */
  $effect(() => {
    if (!shown || !media.roomRecording || media.roomRecordingPaused) return;
    const timer = setInterval(() => {
      tick = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  });

  /*
    ```js
    initDrag(){ bc("#recLocalPreviewHolder").draggable({appendTo:"body", containment:"window",
      cursor:"move", scroll:!1, snap:"true", addClasses:!0, stop:function(e,i){}})
      .resizable({handles:"n, e, s, w, ne, se, sw, nw"}) }
    ```

    Gated on `armed` because upstream calls it only inside the arming branch, and the gate is
    observable rather than cosmetic: `makeResizable` inserts eight handle elements into the card,
    exactly as jQuery UI's `.resizable()` does, so an unarmed card would carry eight nodes the
    reference's never has.

    `containment: "window"` is not passed on: `containerRect` already falls back to the viewport
    when no selector is given, and passing the literal string would be a selector that can never
    match — config nothing reads. `persistKey` is not passed either, and that is the capture's own
    choice: its `stop` handler is `function(e,i){}`, an empty body, so a dragged card does not
    remember where it was put. `cursor: "move"` is the `.recsHolderScreen` rule's, already in the
    generated sheet.
  */
  const NO_GESTURES = () => {};
  const gestures = $derived(
    armed ? panelDragResize({ handles: 'n, e, s, w, ne, se, sw, nw', snap: true }) : NO_GESTURES
  );

  /** `closePreview(){ hide(); globals.recPreviewOpen=!1; clearRecTimer() }` — the timer stops via `shown`. */
  function closePreview() {
    shown = false;
    media.recPreviewOpen = false;
  }

  /*
    ```js
    expandPreview(){ this.expandRecPreview = !this.expandRecPreview;
      const e = bc("#recLocalPreviewHolder");
      e && (this.expandRecPreview
        ? (e.toggleClass("recsHolderScreen-lg"),
           e.position().left > 700 && e.css({left:"678px"}),
           e.position().top  > 520 && e.css({top:"415px"}))
        : e.toggleClass("recsHolderScreen-lg")) }
    ```

    The class toggle is the `class:` directive below; only the clamp needs the element. The two
    numbers are the EXPANDED size (700x520) and the two offsets are what keeps a card dragged to the
    right or the bottom of the viewport from growing off-screen.

    `getBoundingClientRect()` where jQuery reads `.position()`, which is offset-parent relative. The
    card is `position: fixed`, so its offset parent is the initial containing block and the two
    agree — except while an ancestor establishes a containing block for fixed descendants (a
    `transform` or `filter`), which nothing between here and `<body>` does.

    Collapsing does NOT restore the clamped `left`/`top`, and that is upstream's shape: the `:` arm
    toggles the class and touches nothing else.
  */
  function expandPreview() {
    expanded = !expanded;
    if (!expanded || !holder) return;
    const box = holder.getBoundingClientRect();
    if (box.left > 700) holder.style.left = '678px';
    if (box.top > 520) holder.style.top = '415px';
  }
</script>

<!--
  The markup is UNCONDITIONAL, exactly as the reference's template is: `ngOnInit`'s gate decides
  which subscriptions exist, never whether the DOM is built. Keeping it that way is also what keeps
  `captured-css-ancestor-contract` satisfied — `app-rec-preview` is a scoped host in the generated
  stylesheet, so an absent element leaves its ten rules matching nothing and shipping dead.
-->
<app-rec-preview>
  <div
    id="recLocalPreviewHolder"
    class="card recsHolderScreen"
    class:recsHolderScreen-lg={expanded}
    style:display={shown ? 'block' : undefined}
    bind:this={holder}
    {@attach gestures}
  >
    <div class="card-body">
      <h5 class="card-title m-0">
        <div class="d-inline-block p-2 text-white">Recording Preview. (DELAYED UPTO 20s)</div>
        <!--
          Two captured `<span>`s carrying `x("click", …)`, transcribed as the capture writes them:
          const 4 is `[1,"float-right","p-2",3,"click"]` and const 6 is
          `[1,"float-right","p-2","mx-1",3,"click"]`. A `<button>` here would be the accessible
          shape and would also be a different element, a different box and a different set of
          captured rules — `.recsHolderScreen .card-title button { font-size: 12px }` exists in the
          generated sheet for the reference's OWN buttons elsewhere in this card's family. The
          repository's settled answer for a captured click target is the ignore comment, which is
          what every `<li onclick>` in `RoomNavbar.svelte` already carries.
        -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="float-right p-2" onclick={closePreview}>
          <i class="fas fa-times text-white"></i>
        </span>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="float-right p-2 mx-1" onclick={expandPreview}>
          <!-- `O(8, o.expandRecPreview ? 8 : 9)` — const 7 against const 9. -->
          {#if expanded}
            <i class="fas fa-compress-arrows-alt text-white"></i>
          {:else}
            <i class="fas fa-expand text-white"></i>
          {/if}
        </span>
      </h5>
      <!--
        `O(10, roomState.isRecording && !roomState.isRecordingPaused ? 10 : 11)` — the frame, or the
        paused notice. Both arms are the capture's own templates, `_3e` and `b3e`.
      -->
      {#if media.roomRecording && !media.roomRecordingPaused}
        <!-- svelte-ignore a11y_missing_attribute -->
        <img
          id="recScreenLocalPreview"
          class="recPreviewScreen"
          src={tick ? previewSrc : undefined}
        />
      {:else}
        <div class="text-center py-4 text-white"><h4>Recording paused.</h4></div>
      {/if}
    </div>
  </div>
</app-rec-preview>
