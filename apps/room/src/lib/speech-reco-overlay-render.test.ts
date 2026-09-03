import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import SpeechRecoOverlay from './components/SpeechRecoOverlay.svelte';

/*
  THE BUNDLE READ THAT SAT HERE IS IN `speech-reco-overlay-capture.test.ts`.

  The compiled template `Zwe` and const entries 264-285 are still asserted — the component IS a
  transcription, and *"a transcription whose source is not asserted is a guess with a citation
  stapled to it"* — but `docs/source` is gitignored and this was a MODULE-SCOPE read, so it excluded
  all nineteen cases here from every checkout without the dumps, CI included. Fifteen of them render
  this component and assert against its own output; they need nothing that is missing.
*/
const caption = {
  timestamp: Date.UTC(2026, 7, 6, 17, 30),
  sender: 'Trendy Jon',
  text: 'right and so sometimes'
};
const earlier = {
  timestamp: Date.UTC(2026, 7, 6, 17, 5),
  sender: 'Ashley',
  text: 'a premarital zone'
};

describe('the live caption line', () => {
  const body = render(SpeechRecoOverlay, { props: { current: caption } }).body;

  it('wraps the icon and sender in the sticky header span', () => {
    expect(body).toContain('class="d-flex align-items-center position-sticky top-0"');
  });

  it('gives the icon its me-1 and the sender a <strong> with the trailing colon', () => {
    expect(body).toContain('class="fas fa-closed-captioning speech-reco-icon me-1"');
    expect(body).toMatch(/<strong class="speech-reco-sender">Trendy Jon:<\/strong>/);
  });

  it('renders the text in its own span, outside the sticky header', () => {
    // The full attribute, not the bare class name: `speech-reco-text-wrapper` is an ancestor and
    // a substring search finds it first.
    expect(body).toContain('class="speech-reco-text"');
    expect(body.indexOf('class="speech-reco-text"')).toBeGreaterThan(
      body.indexOf('position-sticky')
    );
  });

  it('is single-line whenever it is not in history mode, regardless of transcript length', () => {
    // This was additionally conditioned on an empty history, so any accumulated transcript
    // silently boxed the live caption into the 3.5em scroll area.
    const withHistory = render(SpeechRecoOverlay, {
      props: { current: caption, history: [earlier] }
    }).body;
    expect(withHistory).toContain('single-line');
    expect(withHistory).not.toContain('history-mode');
  });
});

describe('history mode', () => {
  const body = render(SpeechRecoOverlay, {
    props: { current: caption, history: [earlier], historyMode: true }
  }).body;

  it('is history-mode and NOT single-line', () => {
    expect(body).toContain('history-mode');
    expect(body).not.toContain('single-line');
  });

  it('nests a <strong> sender and an &nbsp;-prefixed span inside the text span', () => {
    expect(body).toContain('<strong class="speech-reco-history-sender">Ashley:</strong>');
    // `&nbsp;` in the template is the character U+00A0 by the time it is rendered.
    expect(body).toContain('<span>\u00a0a premarital zone</span>');
  });

  it('renders the live caption as a separate trailing live-entry reading "now"', () => {
    expect(body).toContain('speech-reco-history-line live-entry');
    expect(body).toContain('<span class="speech-reco-history-time">now</span>');
    expect(body).toContain('<strong class="speech-reco-history-sender">Trendy Jon:</strong>');
  });

  it('falls back to "Unknown" for a nameless speaker', () => {
    const nameless = render(SpeechRecoOverlay, {
      props: {
        current: null,
        history: [{ ...earlier, sender: '' }],
        historyMode: true
      }
    }).body;
    expect(nameless).toContain('>Unknown:</strong>');
  });

  it('formats the time as Angular shortTime - no leading zero on the hour', () => {
    // `hour: '2-digit'` renders "01:05 PM" where the capture renders "1:05 PM".
    expect(body).toMatch(/<span class="speech-reco-history-time">\d{1,2}:\d{2}\s?[AP]M<\/span>/);
    expect(body).not.toMatch(/>0\d:\d{2}/);
  });
});

describe('visibility follows hasSpeechRecognitionEntries, not just "is there a caption"', () => {
  // SSR leaves hydration anchors behind even for an empty branch, so "nothing" means no overlay.
  it('renders nothing with no caption and no history', () => {
    expect(render(SpeechRecoOverlay, { props: { current: null } }).body).not.toContain(
      'speech-reco-overlay'
    );
  });

  it('renders in history mode on history alone', () => {
    // A flat `{#if current}` closed the transcript the moment the room went quiet.
    const body = render(SpeechRecoOverlay, {
      props: { current: null, history: [earlier], historyMode: true }
    }).body;
    expect(body).toContain('speech-reco-overlay');
    expect(body).toContain('a premarital zone');
  });

  it('renders nothing in history mode with an empty transcript', () => {
    expect(
      render(SpeechRecoOverlay, { props: { current: caption, history: [], historyMode: true } })
        .body
    ).not.toContain('speech-reco-overlay');
  });
});

describe('the three hover buttons', () => {
  it('hides the transcript button unless archives are available', () => {
    const denied = render(SpeechRecoOverlay, { props: { current: caption } }).body;
    expect(denied).not.toContain('Full Transcript History');

    const allowed = render(SpeechRecoOverlay, {
      props: { current: caption, archivesAvailable: true }
    }).body;
    expect(allowed).toContain('title="Full Transcript History"');
    expect(allowed).toContain('fa-external-link-alt');
  });

  it('hides the history toggle until there is history to toggle into', () => {
    expect(render(SpeechRecoOverlay, { props: { current: caption } }).body).not.toContain(
      'Speech Recognition History'
    );
    const withHistory = render(SpeechRecoOverlay, {
      props: { current: caption, history: [earlier] }
    }).body;
    expect(withHistory).toContain('title="Speech Recognition History"');
    expect(withHistory).toContain('fa-history');
  });

  it('uses the captured close title and aria-label, not a paraphrase', () => {
    const body = render(SpeechRecoOverlay, { props: { current: caption } }).body;
    expect(body).toContain('title="Close Speech Recognition Overlay"');
    expect(body).toContain('aria-label="Close"');
    expect(body).toContain('fa-times');
  });
});
