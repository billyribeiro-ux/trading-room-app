import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import SpeechRecoOverlay from './components/SpeechRecoOverlay.svelte';
import {
  captionsVisible,
  formatCaptionTime,
  haltCaptionDismissal,
  isAtBottom
} from './speech-reco-overlay.js';

/**
 * The captions overlay against the PINNED v4 bundle.
 *
 * ## Why this file exists beside `speech-reco-overlay-render.test.ts`
 *
 * That one reads `docs/source/main.d6d3c112b59b7d0d.js` — an earlier dump, gitignored, and absent
 * from checkouts like this one, where `gate/evidence-bound-tests.mjs` skips the whole file. So the
 * overlay's citations were unchecked here by construction, and they were wrong: that dump's const
 * table is six entries shorter than v4's, so every index in the component was low by six, and two of
 * the icons named consts belonging to other parts of `app-presentationarea` entirely.
 *
 * ## Why `render` from `svelte/server` rather than a mount
 *
 * A caption overlay is downstream of the Web Speech API, which jsdom does not implement, and its
 * scroll-follow is an `{@attach}` — and attachments do not run during SSR. What can be asserted
 * without a browser is exactly what is asserted: which markup a set of props produces. The scroll
 * arithmetic is tested through the module instead, where it needs no DOM at all.
 */
const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);

const OVERLAY = readFileSync(
  new URL('./components/SpeechRecoOverlay.svelte', import.meta.url),
  'utf8'
);

describe('the const entries this overlay transcribes, by value', () => {
  it.each([
    ['270 — the overlay root', '[1,"speech-reco-overlay"]'],
    ['271 — the body', '[1,"speech-reco-body"]'],
    ['273 — the button strip', '[1,"speech-reco-buttons"]'],
    [
      '276 — the close button',
      '["type","button","title","Close Speech Recognition Overlay","aria-label","Close",1,"speech-reco-close-btn",3,"click"]'
    ],
    [
      '277 — the single-line wrapper, with its scroll binding',
      '[1,"speech-reco-text-wrapper",3,"scroll"]'
    ],
    ['278 — the caption line', '[1,"speech-reco-line"]'],
    ['279 — the sticky header span', '[1,"d-flex","align-items-center","position-sticky","top-0"]'],
    ['280 — the icon', '[1,"fas","fa-closed-captioning","speech-reco-icon","me-1"]'],
    ['281 — the sender', '[1,"speech-reco-sender"]'],
    ['282 — the text', '[1,"speech-reco-text"]'],
    ['283 — the transcript scroller', '[1,"speech-reco-history",3,"scroll"]'],
    ['284 — a history line', '[1,"speech-reco-history-line"]'],
    ['285 — the live trailing line', '[1,"speech-reco-history-line","live-entry"]'],
    ['286 — the time cell', '[1,"speech-reco-history-time"]'],
    ['288 — the history sender', '[1,"speech-reco-history-sender"]'],
    [
      '289 — the transcript button',
      '["type","button","title","Full Transcript History","aria-label","Full Transcript History",1,"speech-reco-history-btn",3,"click"]'
    ],
    [
      '290 — the history toggle',
      '["type","button","title","Speech Recognition History","aria-label","Speech Recognition History",1,"speech-reco-history-btn",3,"click"]'
    ],
    ['291 — the history icon', '[1,"fas","fa-history"]'],
    [
      '79 — the transcript ICON, which this file used to call 80',
      '[1,"fas","fa-external-link-alt"]'
    ],
    ['92 — the close ICON, which this file used to call 93', '[1,"fas","fa-times"]']
  ])('%s', (_name, entry) => {
    expect(BUNDLE).toContain(entry);
  });

  it('pins the two consts that 80 and 93 ACTUALLY are, so the old citation cannot come back', () => {
    /*
      This is the assertion that makes the correction stick. Both of these live in the same table and
      neither is an icon; a reader who re-derives "icon 80" from the earlier dump lands on a title
      string for the screen lock.
    */
    expect(BUNDLE).toContain('["title","Lock this screen?"]');
    expect(OVERLAY).not.toContain('icon 80');
    expect(OVERLAY).not.toContain('icon 93');
  });

  it('pins `u2e` — the overlay template, its two gates and its class toggles', () => {
    expect(BUNDLE).toContain(
      'd(0,"div",270)(1,"div",271),H(2,s2e,4,0,"div",272)(3,l2e,5,1),u(),d(4,"div",273),H(5,c2e,2,1,"button",274)(6,d2e,2,1,"button",275),d(7,"button",276)'
    );
    expect(BUNDLE).toContain(
      'Tt("history-mode",e.speechRecoHistoryMode)("single-line",!e.speechRecoHistoryMode)'
    );
    expect(BUNDLE).toContain('O(5,e.archivesAvailableTo()?5:-1)');
    expect(BUNDLE).toContain('O(6,e.hasHistoryAvailable()?6:-1)');
  });

  it('pins `aria-pressed` as the capture s own attribute, on BOTH history buttons', () => {
    expect(BUNDLE.split('Et("aria-pressed",g(2).speechRecoHistoryMode)').length - 1).toBe(2);
  });

  /**
   * SRO-05 — the single-line branch is a `ht(...)` LOOP upstream and a single `{:else if}` here, and
   * that is not a gap. This is the assertion that refutes it in advance.
   */
  it('shows the single-line loop iterates a 0-or-1 array', () => {
    expect(BUNDLE).toContain(
      'getSpeechRecognitionEntries(){return this.currentSpeechReco?[this.currentSpeechReco]:[]}'
    );
    expect(BUNDLE).toContain('pt(e.getSpeechRecognitionEntries())');
  });

  /** SRO-04 — both dismissal handlers stop the event; the transcript button takes no event at all. */
  it('pins the two suppressions, and the one handler that has none', () => {
    expect(BUNDLE).toContain(
      'hideSpeechRecognition(e){e.preventDefault(),e.stopPropagation(),this.appService.globals.preferences.showSpeechRecoOverlay=!1'
    );
    expect(BUNDLE).toContain(
      'toggleSpeechRecoHistory(e){if(e.preventDefault(),e.stopPropagation()'
    );
    expect(BUNDLE).toContain('x("click",function(){return D(e),E(g(2).openTranscriptPage())})');
  });

  /** The transcript's trackBy, which this component DOES transcribe. */
  it('pins the transcript trackBy as the timestamp', () => {
    expect(BUNDLE).toContain('UCe=(t,n)=>n.timestamp');
    expect(OVERLAY).toContain('(line.timestamp)');
  });

  /** SRO-06 — the buttons are `display:none` until hover, and there is no focus arm anywhere. */
  it('pins the hover-only reveal, with no :focus-within to rescue it', () => {
    expect(BUNDLE).toContain(
      '.speech-reco-buttons[_ngcontent-%COMP%]{display:none;gap:8px;pointer-events:auto;transition:display .2s ease}'
    );
    expect(BUNDLE).toContain(
      '.speech-reco-overlay[_ngcontent-%COMP%]:hover   .speech-reco-buttons[_ngcontent-%COMP%]{display:flex}'
    );
    expect(BUNDLE).not.toContain('.speech-reco-overlay[_ngcontent-%COMP%]:focus-within');
  });
});

describe('the decisions the overlay makes, without a DOM', () => {
  it.each([
    ['history mode needs history, not a caption', true, 3, false, true],
    ['history mode with an empty transcript is nothing', true, 0, true, false],
    ['single-line mode needs the caption', false, 9, false, false],
    ['single-line mode with a caption shows', false, 0, true, true]
  ])('%s', (_name, historyMode, length, hasCurrent, expected) => {
    expect(captionsVisible(historyMode, length, hasCurrent)).toBe(expected);
  });

  it.each([
    ['pinned at the bottom', { scrollHeight: 500, scrollTop: 400, clientHeight: 100 }, true],
    [
      'nine pixels off is still following',
      { scrollHeight: 509, scrollTop: 400, clientHeight: 100 },
      true
    ],
    ['ten pixels off is not', { scrollHeight: 510, scrollTop: 400, clientHeight: 100 }, false],
    ['scrolled up to read', { scrollHeight: 500, scrollTop: 0, clientHeight: 100 }, false]
  ])('%s', (_name, box, expected) => {
    expect(isAtBottom(box)).toBe(expected);
  });

  it('formats the hour without a leading zero, as Angular s shortTime does', () => {
    expect(formatCaptionTime(Date.UTC(2026, 7, 6, 1, 5))).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
    expect(formatCaptionTime(Date.UTC(2026, 7, 6, 1, 5))).not.toMatch(/^0\d:/);
  });

  it('stops a dismissal click dead', () => {
    let prevented = 0;
    let stopped = 0;
    haltCaptionDismissal({
      preventDefault: () => (prevented += 1),
      stopPropagation: () => (stopped += 1)
    });
    expect([prevented, stopped]).toEqual([1, 1]);
  });
});

describe('the rendered overlay stops its own dismissal clicks', () => {
  const caption = { timestamp: Date.UTC(2026, 7, 6, 17, 30), sender: 'Jon', text: 'right and so' };

  it('routes close and the history toggle through the suppression, and the transcript button not', () => {
    /*
      Read off the source: SSR emits no handlers, so which function a click reaches is a question the
      rendered string cannot answer. The positive assertions below check the markup those handlers
      are attached to still exists.
    */
    expect(OVERLAY.split('haltCaptionDismissal(event);').length - 1).toBe(2);
    expect(OVERLAY).toContain('onclick={ontranscript}');

    const body = render(SpeechRecoOverlay, {
      props: { current: caption, history: [caption], archivesAvailable: true }
    }).body;
    expect(body).toContain('title="Close Speech Recognition Overlay"');
    expect(body).toContain('title="Speech Recognition History"');
    expect(body).toContain('title="Full Transcript History"');
  });
});
