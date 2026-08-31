<script lang="ts">
  import {
    captionsVisible,
    formatCaptionTime,
    haltCaptionDismissal,
    isAtBottom
  } from '#lib/speech-reco-overlay.js';

  /**
   * Closed captions: the speech-recognition overlay that sits over the presentation area.
   *
   * Every class here comes from `app-presentationarea`'s own `styles:` array — 38 `.speech-reco-*`
   * rules, bracket-walked from `styles:[` at byte 2,018,629 to 2,032,208 of the pinned v4 bundle,
   * inventoried in `speech-reco-overlay.ts` — and all of it is already shipped, twice:
   * `css/complete-app-styles.css` carries the same 38 and
   * `src/lib/styles/captured-runtime-components.css` re-scopes them under `app-presentationarea`.
   * **Both reach this component**, because `PresentationArea.svelte` renders it INSIDE its
   * `<app-presentationarea>` element rather than portaling it — which is not true of the GIF popover
   * next door, and is why this component declares no styles of its own and that one now takes its
   * height as a prop.
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
   * ## Markup, decoded rather than guessed — and RE-decoded against the pinned bundle
   *
   * The compiled template is `u2e` at byte 1,952,976, with `o2e` / `s2e` / `r2e` / `a2e` / `l2e` /
   * `c2e` / `d2e` beneath it, and the const entries it uses are **270-291** of a 292-entry table.
   *
   * This file used to cite `main.d6d3c112b59b7d0d.js` — an earlier, unpinned dump — and its entries
   * 264-285. Same table, six entries shorter, so every index here was low by six; two of the icons
   * were misattributed on top of that, and the instruction names were that dump's. The rendered
   * classes were right and the footnotes sent the reader to other components' consts.
   * `speech-reco-overlay-v4-contract.test.ts` now asserts each one against the pinned file, so the
   * next reader gets an offset that has been executed rather than a citation that was typed.
   */
  type Caption = {
    /** Stable key. `UCe = (t,n) => n.timestamp` is the capture's own trackBy for the transcript. */
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

  const visible = $derived(captionsVisible(historyMode, history.length, Boolean(current)));

  /** `speechRecoAutoScroll`, kept exactly as the capture computes it — see the module. */
  let autoScroll = $state(true);

  function onScroll(event: Event) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    autoScroll = isAtBottom(target);
  }

  /**
   * `scrollSpeechRecoToBottom()`. The capture defers with `setTimeout(..., 0)` because it runs
   * before the new line is laid out; an attachment re-runs after the DOM update, which is the same
   * guarantee without the timer.
   *
   * ## The reads are in the BODY, and that is the whole of it — fixed 2026-08-20
   *
   * They used to be inside a function this returned, and a returned function is the TEARDOWN: the
   * docs call it "a function that is called before the attachment re-runs, or after the element is
   * later removed from the DOM". Only state read in the attachment's own body is a dependency.
   *
   * So the reads created no dependency, the attachment never re-ran, the teardown was therefore
   * never called — and the transcript had never scrolled, not even on the first caption. The
   * `void current` / `void history.length` lines show the dependencies were known to be needed;
   * they were one closure too deep.
   *
   * Nothing reported this. No error, no warning, `svelte-check` green: a silently missing feature
   * is the entire failure mode of this mistake, which is why the platform behaviour is now pinned in
   * `attachment-dependency-contract.svelte.test.ts` against a probe component rather than trusted to
   * a reading of the docs.
   */
  function followTail(node: HTMLElement) {
    void current;
    void history.length;
    if (autoScroll) node.scrollTop = node.scrollHeight;
  }
</script>

{#if visible}
  <!--
    `Tt("history-mode", speechRecoHistoryMode)("single-line", !speechRecoHistoryMode)` - the two
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
            <!-- `r2e`: time, then `.speech-reco-history-text` wrapping a `<strong>` sender and a
                 sibling span whose text is prefixed with a non-breaking space. -->
            <div class="speech-reco-history-line">
              <span class="speech-reco-history-time">{formatCaptionTime(line.timestamp)}</span>
              <span class="speech-reco-history-text">
                <strong class="speech-reco-history-sender">{line.sender || 'Unknown'}:</strong>
                <span>&nbsp;{line.text}</span>
              </span>
            </div>
          {/each}
          <!--
            `H(4, a2e, 8, 2, "div", 285)` with `O(4, e.currentSpeechReco ? 4 : -1)` - the live line
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
        <!--
          `s2e` is a `ht(...)` LOOP over `getSpeechRecognitionEntries()`, which reads as a list and
          is not one:

              getSpeechRecognitionEntries(){ return this.currentSpeechReco ? [this.currentSpeechReco] : [] }

          — byte 1,957,636. Nought or one, always. So the single else-if branch below emits exactly
          the DOM the loop does, and the loop is not transcribed. Recorded because the offset invites
          the opposite conclusion, and a reader who files it as "the single-line branch is a list
          there and a line here" has filed a gap that is not one. (Named in prose rather than quoted
          as block syntax: a comment holding a Svelte block is an unclosed block to any parser that
          reads the file, which `svelte-check` does not catch and a contract test has.)

          `Zwe`/`o2e`: the icon and sender share a sticky header span so they stay pinned while a long
          caption scrolls under them - that span was missing, which is why the speaker's name scrolled
          away with the text.
        -->
        <div class="speech-reco-text-wrapper" onscroll={onScroll} {@attach followTail}>
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
      history buttons is the capture's own attribute (`Et('aria-pressed', speechRecoHistoryMode)` in
      `c2e` and `d2e`).

      Titles, aria-labels and icons are const-table values from the PINNED bundle, not guesses:
      button 289 + icon 79 (`fa-external-link-alt`), button 290 + icon 291 (`fa-history`),
      button 276 + icon 92 (`fa-times`).
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
          onclick={(event) => {
            haltCaptionDismissal(event);
            ontogglehistory?.();
          }}
        >
          <i class="fas fa-history"></i>
        </button>
      {/if}
      <button
        type="button"
        class="speech-reco-close-btn"
        title="Close Speech Recognition Overlay"
        aria-label="Close"
        onclick={(event) => {
          haltCaptionDismissal(event);
          onclose?.();
        }}
      >
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
{/if}
