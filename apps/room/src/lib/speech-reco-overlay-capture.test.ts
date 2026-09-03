import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The four assertions that pin the caption overlay's SOURCE, split out on 2026-09-03.
 *
 * ## What one module-scope read was costing
 *
 * `speech-reco-overlay-render.test.ts` holds nineteen cases. Fifteen call `render(SpeechRecoOverlay)`
 * from `svelte/server` and assert against the HTML this application actually emits — the sticky
 * header, the `&nbsp;`-prefixed history span, the Angular `shortTime` format with no leading zero,
 * and the three cases that assert the overlay renders NOTHING. Four read
 * `docs/source/main.d6d3c112b59b7d0d.js` at MODULE SCOPE, and that path is gitignored, so
 * `gate/evidence-bound-tests.mjs` excluded all nineteen from every checkout without the dumps. That
 * is this container, and it is CI.
 *
 * Fifteen SSR render assertions on a component's real output, and nothing was running them.
 *
 * ## What is here
 *
 * The whole `the overlay markup is decoded, not inferred` block, moved intact. Its own sentence is
 * the reason it exists and the reason it can be moved whole: *"the component is a transcription, and
 * a transcription whose source is not asserted is a guess with a citation stapled to it."* Every
 * assertion in it is about the reference; the fifteen that stayed are about us.
 */

/*
  The caption overlay's compiled template is `r2e` / `e2e` / `i2e` / `Zwe` / `t2e` / `n2e`, and its
  const table entries 264-285 resolve every class and icon in it.
*/
const bundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

describe('the overlay markup is decoded, not inferred', () => {
  it('pins the live caption line', () => {
    // Zwe: div.speech-reco-line > span(sticky) > i + strong, then span.speech-reco-text.
    expect(bundle).toContain(
      'd(0,"div",272)(1,"span",273),T(2,"i",274),d(3,"strong",275),v(4),u()(),d(5,"span",276),v(6),u()()'
    );
    // Ne("", e.sender, ":") - the colon is appended by the template, not part of the name.
    expect(bundle).toContain('m(4),Ne("",e.sender,":"),m(2),Ze(e.text)');
  });

  it('pins the const table entries the markup uses', () => {
    for (const entry of [
      '[1,"speech-reco-line"]',
      '[1,"d-flex","align-items-center","position-sticky","top-0"]',
      '[1,"fas","fa-closed-captioning","speech-reco-icon","me-1"]',
      '[1,"speech-reco-sender"]',
      '[1,"speech-reco-text"]',
      '[1,"speech-reco-history-line","live-entry"]',
      '[1,"speech-reco-history-sender"]',
      '[1,"fas","fa-history"]'
    ]) {
      expect(bundle).toContain(entry);
    }
    // The three buttons, with their exact titles and aria-labels.
    expect(bundle).toContain(
      '["type","button","title","Full Transcript History","aria-label","Full Transcript History",1,"speech-reco-history-btn",3,"click"]'
    );
    expect(bundle).toContain(
      '["type","button","title","Close Speech Recognition Overlay","aria-label","Close",1,"speech-reco-close-btn",3,"click"]'
    );
  });

  it('pins the two modifiers as exact complements, and the two button gates', () => {
    expect(bundle).toContain(
      'Et("history-mode",e.speechRecoHistoryMode)("single-line",!e.speechRecoHistoryMode)'
    );
    expect(bundle).toContain('O(5,e.archivesAvailableTo()?5:-1)');
    expect(bundle).toContain('O(6,e.hasHistoryAvailable()?6:-1)');
  });

  it('pins hasSpeechRecognitionEntries, whose two branches differ', () => {
    expect(bundle).toContain(
      'return!!e&&(this.speechRecoHistoryMode?i>0:this.showSpeechRecognition&&!!this.currentSpeechReco)'
    );
  });
});
