import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  POSITIONS_REFRESH_MS,
  positionsIframeSrc,
  positionsRefreshRunning
} from './positions-iframe.js';

/**
 * The positions panel — an owner's page beside the presentation area, on a thirty-second reload.
 *
 * `O(5, sessData.positionsIframe && sessData.positionsIframeUrl ? 5 : -1)` draws the buttons (byte
 * 2,493,364); `app-positions-container` is the panel (2,329,246). `positions-iframe.ts` carries the
 * transcription.
 */
describe('positionsIframeSrc', () => {
  /*
    THE CACHE-BUST IS THE FEATURE. An iframe whose `src` does not change is not re-fetched, so
    without the stamp a "refresh" refreshes nothing at all.
  */
  it('appends the stamp with ? on a bare URL', () => {
    expect(positionsIframeSrc('https://broker.example/positions', 1234)).toBe(
      'https://broker.example/positions?t=1234'
    );
  });

  it('and with & when the owner’s URL already has a query', () => {
    expect(positionsIframeSrc('https://broker.example/positions?account=7', 1234)).toBe(
      'https://broker.example/positions?account=7&t=1234'
    );
  });

  /*
    Concatenated onto the ORIGINAL string rather than built through `URL.searchParams`, which would
    re-encode the whole query — an owner URL carrying an already-encoded token would come back
    different from what they pasted.
  */
  it('does not re-encode what the owner pasted', () => {
    const url = 'https://broker.example/positions?tok=a%2Bb%3Dc';
    expect(positionsIframeSrc(url, 9)).toBe(`${url}&t=9`);
  });

  it('changes on every stamp, which is what makes a reload a reload', () => {
    const first = positionsIframeSrc('https://broker.example/p', 1);
    const second = positionsIframeSrc('https://broker.example/p', 2);
    expect(first).not.toBe(second);
  });

  /*
    Scheme-checked, which the reference is not: its binding is another
    `bypassSecurityTrustResourceUrl`, and this iframe loads inside every member's room.
  */
  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    'data:text/html,<h1>x</h1>',
    'file:///etc/passwd',
    'not a url',
    '//broker.example/p',
    '',
    '   '
  ])('refuses %o and draws no panel', (url) => {
    expect(positionsIframeSrc(url, 1)).toBeNull();
  });

  it.each([undefined, null])('treats %o as a room that configured none', (value) => {
    expect(positionsIframeSrc(value, 1)).toBeNull();
  });
});

describe('positionsRefreshRunning', () => {
  /*
    THE CONJUNCTION IS THE POINT. A member who has never opened the panel must not have a background
    timer fetching an owner's page every thirty seconds — and `updatePositionsIframeChanged`
    re-evaluates exactly this pair (byte 2,329,586), which is why it is a named predicate.
  */
  it.each([
    [false, false, false],
    [true, false, false],
    [false, true, false],
    [true, true, true]
  ])(
    'updatePositionsIframe=%s showPositions=%s runs=%s',
    (updatePositionsIframe, showPositions, expected) => {
      expect(positionsRefreshRunning({ updatePositionsIframe, showPositions })).toBe(expected);
    }
  );

  it('is the reference’s own interval', () => {
    // `setInterval(…, 3e4)`.
    expect(POSITIONS_REFRESH_MS).toBe(30_000);
  });
});

const container = readFileSync(
  new URL('./components/PositionsContainer.svelte', import.meta.url),
  'utf8'
);
const controls = readFileSync(
  new URL('./components/PositionsControls.svelte', import.meta.url),
  'utf8'
);
const area = readFileSync(new URL('./components/PresentationArea.svelte', import.meta.url), 'utf8');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

/** Both comment syntaxes — see `custom-player-contract.test.ts` for why this keeps being needed. */
const codeOf = (source: string) =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the markup', () => {
  it('carries the captured classes', () => {
    // Const `[1,"positionOverlay","animated","fadeIn"]`.
    expect(codeOf(container)).toContain('class="positionOverlay animated fadeIn"');
    // Consts 220/221: `updatePositionBtn` and `positionBtn`, both `btn btn-sm`.
    expect(codeOf(controls)).toContain('class="btn btn-sm updatePositionBtn"');
    expect(codeOf(controls)).toContain('class="btn btn-sm positionBtn"');
    expect(codeOf(controls)).toContain('<i class="fas fa-sync"></i>');
  });

  /*
    The toggle's LABEL is the state — `showPositions ? "Hide Positions" : "Show Positions"` — and the
    manual refresh renders only while the panel is open, which is `O(0, showPositions ? 0 : -1)`.
  */
  it('labels the toggle by its state and hides the refresh when shut', () => {
    expect(codeOf(controls)).toContain("showPositions ? 'Hide Positions' : 'Show Positions'");
    const gate = codeOf(controls).indexOf('{#if showPositions}');
    const refresh = codeOf(controls).indexOf('updatePositionBtn');
    const toggle = codeOf(controls).indexOf('positionBtn');
    expect(gate, 'the refresh button is not gated').toBeGreaterThan(-1);
    expect(refresh).toBeGreaterThan(gate);
    expect(toggle, 'the toggle must be OUTSIDE that gate').toBeGreaterThan(refresh);
  });
});

describe('the wire', () => {
  /*
    NODE 3 AND NODE 5. The container sits between the moderator bar and the presentation area; the
    buttons come after it. Both halves are gated on the same `positionsAvailable`, and the ORDER is
    asserted because it is the one thing a reader moving code around would not know to preserve.
  */
  it('puts the panel before the presentation area and the buttons after it', () => {
    const code = codeOf(area);
    const container_ = code.indexOf('<PositionsContainer');
    const presentation = code.indexOf('</app-presentationarea>');
    const controls_ = code.indexOf('<PositionsControls');
    expect(container_, 'the panel is missing').toBeGreaterThan(-1);
    expect(controls_, 'the buttons are missing').toBeGreaterThan(-1);
    expect(container_).toBeLessThan(presentation);
    expect(controls_).toBeGreaterThan(presentation);
  });

  it('conjoins the two settings ONCE, on the page', () => {
    expect(page).toContain('positionsAvailable={data.sessData?.positionsIframe === true &&');
    /*
      …and the component never re-reads EITHER setting. Narrowed from "never sees `sessData`", which
      was overreach and was measured as such: this component legitimately reads
      `data.sessData.overlayUserIdOnScreenshare` for a different feature. The claim worth making is
      about these two names, not about the object.
    */
    expect(codeOf(area)).not.toContain('sessData?.positionsIframe');
    expect(codeOf(area)).not.toContain('sessData.positionsIframe');
  });

  /*
    The timer's gate has to reach the container, or a member with the preference off gets a
    thirty-second fetch loop they never asked for.
  */
  it('carries the viewer’s refresh preference down', () => {
    expect(page).toContain('positionsAutoRefresh={prefs.loaded.updatePositionsIframe === true}');
    expect(codeOf(area)).toContain('autoRefresh={positionsAutoRefresh}');
    expect(codeOf(container)).toContain('positionsRefreshRunning({');
  });
});
