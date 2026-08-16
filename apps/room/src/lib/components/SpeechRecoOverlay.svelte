<script lang="ts">
  /**
   * Closed captions: the speech-recognition overlay that sits over the presentation area.
   *
   * Every class here comes from `docs/source/components/app-presentationarea.component.css`, and
   * all of it is already shipped - 49 rules in `captured-runtime-components.css`, 38 in
   * `complete-app-styles.css` - so this component declares no styles of its own. The captured
   * geometry it inherits:
   *
   *   .speech-reco-overlay      position:absolute; inset bottom/left/right 0; background #000c;
   *                             padding 12px 20px; z-index 9999; max-height 40vh; min-height 48px;
   *                             flex row; gap 12px
   *   .speech-reco-overlay.history-mode   flex column; max-height 60vh; padding 16px 24px; gap 16px
   *   .speech-reco-overlay.single-line    max-height: none
   *   .speech-reco-text-wrapper max-height 3.5em, its own scrollbar
   *   .speech-reco-line         22px/1.4 white  (20px, 16px, 14px at the narrower breakpoints)
   *   .speech-reco-buttons      display:none, revealed by `.speech-reco-overlay:hover`
   *   .speech-reco-close-btn / -history-btn   28x28 circle, 2px white border
   *
   * Two separate switches gate captions, and they are not the same thing:
   *
   *   `doSpeechReco`            session-level. "Speech Recognition for Closed Captions:" in the
   *                             session-control modal - whether recognition RUNS at all.
   *   `showSpeechRecoOverlay`   per-viewer. The navbar's `presentation-subtitles` checkbox,
   *                             titled "Show Speech Recognition Overlay" - whether this viewer
   *                             SEES it. `isSpeechRecoOverlayEnabled()` reads it as
   *                             `null == e || !!e`, so absent means enabled.
   *
   * ## Markup, decoded rather than guessed
   *
   * The compiled template is `r2e` / `e2e` / `i2e` / `Zwe` / `t2e` / `n2e` in
   * `docs/source/main.d6d3c112b59b7d0d.js`, and its const table - 286 entries, indices 264-285 for
   * this overlay - resolves every class and icon that used to be inferred here. An earlier version
   * of this file recorded the icons as an honest gap ("the const table is not in the dump"); it is
   * in the dump, and the resolved values are used below.
   */
  type Caption = {
    /** Stable key. The capture tracks history by timestamp (`(t, n) => n.timestamp`). */
    timestamp: number;
    sender: string;
    text: string;
  };

  type Props = {
    /** `currentSpeechReco` - the line being spoken. */
    current: Caption | null;
    /** `getSpeechRecognitionHistory()` - `globals.lastSpeechReco`, newest last. */
    history?: Caption[];
    /** `speechRecoHistoryMode` - the overlay grows into a scrollable transcript. */
    historyMode?: boolean;
    /**
     * `archivesAvailableTo()`, which gates the "Full Transcript History" button:
     * `O(5, e.archivesAvailableTo() ? 5 : -1)`. The same predicate as the sidebar's Archives menu,
     * so a viewer who may not reach the archives may not reach the transcript page either.
     */
    archivesAvailable?: boolean;
    onclose?: () => void;
    ontogglehistory?: () => void;
    /** `openTranscriptPage()`. */
    ontranscript?: () => void;
  };

  let {
    current,
    history = [],
    historyMode = false,
    archivesAvailable = false,
    onclose,
    ontogglehistory,
    ontranscript
  }: Props = $props();

  /**
   * `hasSpeechRecognitionEntries()`:
   *
   * ```js
   * const e = this.isSpeechRecoOverlayEnabled(), i = this.getSpeechRecognitionHistory().length;
   * return !!e && (this.speechRecoHistoryMode ? i > 0 : this.showSpeechRecognition && !!this.currentSpeechReco)
   * ```
   *
   * The viewer-preference half is the call site's own `{#if}`; what belongs here is the second
   * half, and the two branches differ. This was a flat `{#if current}`, so opening the transcript
   * on a room that had gone quiet closed the overlay outright - history mode does not need a live
   * caption, it needs history.
   */
  const visible = $derived(historyMode ? history.length > 0 : Boolean(current));

  /**
   * `speechRecoAutoScroll`, kept exactly as the capture computes it:
   *
   *   onSpeechRecoScroll(e) { const i = e.target;
   *     i && (this.speechRecoAutoScroll = i.scrollHeight - i.scrollTop - i.clientHeight < 10) }
   *
   * so scrolling up to read pins the view, and scrolling back to the bottom re-arms it.
   */
  const AUTO_SCROLL_SLACK = 10;
  let autoScroll = $state(true);

  function onScroll(event: Event) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    autoScroll = target.scrollHeight - target.scrollTop - target.clientHeight < AUTO_SCROLL_SLACK;
  }

  /**
   * `scrollSpeechRecoToBottom()`. The capture defers with `setTimeout(..., 0)` because it runs
   * before the new line is laid out; an attachment re-runs after the DOM update, which is the same
   * guarantee without the timer.
   */
  function followTail(node: HTMLElement) {
    return () => {
      void current;
      void history.length;
      if (autoScroll) node.scrollTop = node.scrollHeight;
    };
  }

  /**
   * `{{ entry.timestamp | date:'shortTime' }}`.
   *
   * Angular's `shortTime` is `h:mm a` - no leading zero on the hour. `hour: '2-digit'` renders
   * "01:30 PM" where the capture renders "1:30 PM", so the hour is `numeric`.
   */
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
  const formatTime = (timestamp: number) => timeFormatter.format(new Date(timestamp));
</script>

{#if visible}
  <!--
    `Et("history-mode", speechRecoHistoryMode)("single-line", !speechRecoHistoryMode)` - the two
    modifiers are exact complements. `single-line` was additionally conditioned on an empty history
    here, so a caption arriving after any transcript had accumulated lost `max-height: none` and got
    boxed into the 3.5em scroll area for no reason the capture shares.
  -->
  <div
    class={['speech-reco-overlay', { 'history-mode': historyMode, 'single-line': !historyMode }]}
  >
    <div class="speech-reco-body">
      {#if historyMode}
        <div class="speech-reco-history" onscroll={onScroll} {@attach followTail}>
          {#each history as line (line.timestamp)}
            <!-- `t2e`: time, then `.speech-reco-history-text` wrapping a `<strong>` sender and a
                 sibling span whose text is prefixed with a non-breaking space. -->
            <div class="speech-reco-history-line">
              <span class="speech-reco-history-time">{formatTime(line.timestamp)}</span>
              <span class="speech-reco-history-text">
                <strong class="speech-reco-history-sender">{line.sender || 'Unknown'}:</strong>
                <span>&nbsp;{line.text}</span>
              </span>
            </div>
          {/each}
          <!--
            `H(4, n2e, 8, 2, "div", 279)` with `O(4, e.currentSpeechReco ? 4 : -1)` - the live line
            is a SEPARATE trailing row whose time reads the literal "now", not a history entry
            carrying a flag. Modelling it as a flag meant the in-progress caption either had to be
            pushed into the transcript early or went missing from history mode entirely.
          -->
          {#if current}
            <div class="speech-reco-history-line live-entry">
              <span class="speech-reco-history-time">now</span>
              <span class="speech-reco-history-text">
                <strong class="speech-reco-history-sender">{current.sender || 'Unknown'}:</strong>
                <span>&nbsp;{current.text}</span>
              </span>
            </div>
          {/if}
        </div>
      {:else if current}
        <div class="speech-reco-text-wrapper" onscroll={onScroll} {@attach followTail}>
          <!--
            `Zwe`. The icon and sender share a sticky header span so they stay pinned while a long
            caption scrolls under them - that span was missing, which is why the speaker's name
            scrolled away with the text.
          -->
          <div class="speech-reco-line">
            <span class="d-flex align-items-center position-sticky top-0">
              <i class="fas fa-closed-captioning speech-reco-icon me-1"></i>
              <strong class="speech-reco-sender">{current.sender}:</strong>
            </span>
            <span class="speech-reco-text">{current.text}</span>
          </div>
        </div>
      {/if}
    </div>

    <!--
      Hidden until the overlay is hovered - `.speech-reco-buttons { display: none }` with
      `.speech-reco-overlay:hover .speech-reco-buttons { display: flex }`. `aria-pressed` on both
      history buttons is the capture's own attribute (`Dt('aria-pressed', speechRecoHistoryMode)`).

      Titles, aria-labels and icons are const-table values, not guesses: 283 + icon 80
      (`fa-external-link-alt`), 284 + icon 285 (`fa-history`), 270 + icon 93 (`fa-times`).
    -->
    <div class="speech-reco-buttons">
      {#if archivesAvailable}
        <button
          type="button"
          class="speech-reco-history-btn"
          title="Full Transcript History"
          aria-label="Full Transcript History"
          aria-pressed={historyMode}
          onclick={ontranscript}
        >
          <i class="fas fa-external-link-alt"></i>
        </button>
      {/if}
      <!--
        `O(6, e.hasHistoryAvailable() ? 6 : -1)` - `getSpeechRecognitionHistory().length > 0`. The
        toggle was always rendered, so a room with nothing said yet offered a button into an empty
        transcript; `toggleSpeechRecoHistory` guards on the same emptiness and would have ignored
        the click anyway.
      -->
      {#if history.length > 0}
        <button
          type="button"
          class="speech-reco-history-btn"
          title="Speech Recognition History"
          aria-label="Speech Recognition History"
          aria-pressed={historyMode}
          onclick={ontogglehistory}
        >
          <i class="fas fa-history"></i>
        </button>
      {/if}
      <button
        type="button"
        class="speech-reco-close-btn"
        title="Close Speech Recognition Overlay"
        aria-label="Close"
        onclick={onclose}
      >
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
{/if}
