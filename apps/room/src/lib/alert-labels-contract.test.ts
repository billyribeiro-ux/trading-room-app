import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ALERT_LABEL_BADGE_CLASS,
  alertLabelBadgeStyle,
  parseAlertLabels,
  splitAlertLabels,
  type AlertLabel
} from './alert-labels';

/*
  Alert Labels, against `main.d1d09071be31f1ba.js` bytes 1,147,290 and 1,326,855.

  Three of the four behaviours asserted here look like defects. They are the shipped behaviour, and
  every one of them would be "fixed" by a well-meaning refactor: the first-occurrence-only replace,
  the missing word boundary, and the fact that chat never substitutes at all.
*/

/** The Manage page's own help text, `room-settings-schema.ts` line 185, used verbatim. */
const CAPTURED_SETTING = `[ { "name": "Day Trade", "hash": "DayTrade", "color": "#9c4537", "bgcolor":"#e8f5f7" }, { "name": "Swing Trade", "hash": "SwingTrade", "color": "#24794f", "bgcolor":"#e8f5f7" } ]`;

const label = (over: Partial<AlertLabel> = {}): AlertLabel => ({
  hash: 'DayTrade',
  name: 'Day Trade',
  bgcolor: '#e8f5f7',
  color: '#9c4537',
  checked: false,
  ...over
});

describe('the setting is a string containing JSON', () => {
  it('parses the captured example to the four-field shape', () => {
    const labels = parseAlertLabels(CAPTURED_SETTING);
    expect(labels).toHaveLength(2);
    expect(labels[0]).toEqual({
      name: 'Day Trade',
      hash: 'DayTrade',
      color: '#9c4537',
      bgcolor: '#e8f5f7',
      checked: false
    });
    expect(labels[1].hash).toBe('SwingTrade');
  });

  it('stamps checked=false on every entry, which the raw JSON does not carry', () => {
    expect(CAPTURED_SETTING).not.toContain('checked');
    for (const entry of parseAlertLabels(CAPTURED_SETTING)) expect(entry.checked).toBe(false);
  });

  it('is empty for an absent or blank setting rather than throwing', () => {
    expect(parseAlertLabels(undefined)).toEqual([]);
    expect(parseAlertLabels(null)).toEqual([]);
    expect(parseAlertLabels('')).toEqual([]);
  });

  it('THROWS on malformed JSON, because the reference has no try/catch here', () => {
    expect(() => parseAlertLabels('[{ oops }]')).toThrow();
  });
});

describe('the badge, byte 1,326,855', () => {
  it('carries the captured classes', () => {
    expect(ALERT_LABEL_BADGE_CLASS).toBe('my-1 me-1 badge');
  });

  it('uses color for BOTH the text and the border, and keeps the trailing semicolon', () => {
    expect(alertLabelBadgeStyle(label())).toBe(
      'background-color: #e8f5f7; color: #9c4537; border: 1px solid #9c4537;'
    );
  });
});

describe('the replace loop, reproduced including the parts that look wrong', () => {
  it('replaces only the FIRST occurrence, leaving later ones as literal text', () => {
    const pieces = splitAlertLabels('#DayTrade then #DayTrade again', [label()]);
    expect(pieces.filter((p) => p.kind === 'label')).toHaveLength(1);
    expect(pieces.map((p) => p.text).join('')).toBe('#DayTrade then #DayTrade again');
    const tail = pieces[pieces.length - 1];
    expect(tail.kind).toBe('text');
    expect(tail.text).toContain('#DayTrade again');
  });

  it('has NO word boundary, so it matches mid-word and matches a prefix', () => {
    const attached = splitAlertLabels('foo#DayTrade', [label()]);
    expect(attached.some((p) => p.kind === 'label')).toBe(true);

    // `#DayTraderX` contains `#DayTrade`, so the badge eats the prefix and `rX` survives.
    const prefix = splitAlertLabels('#DayTraderX', [label()]);
    expect(prefix.find((p) => p.kind === 'label')?.text).toBe('#DayTrade');
    expect(prefix[prefix.length - 1].text).toBe('rX');
  });

  it('lets each label claim its own first occurrence, in configured order', () => {
    const labels = [label(), label({ hash: 'SwingTrade', name: 'Swing Trade', color: '#24794f' })];
    const pieces = splitAlertLabels('a #SwingTrade b #DayTrade c', labels);
    const badges = pieces.filter((p) => p.kind === 'label');
    expect(badges).toHaveLength(2);
    // Emitted by POSITION, so SwingTrade comes first even though DayTrade is configured first.
    expect(badges[0].text).toBe('#SwingTrade');
    expect(badges[1].text).toBe('#DayTrade');
  });

  it('never lets two labels claim the same characters', () => {
    // Both hashes match at the same index; the first configured one wins and the second finds
    // nothing left, rather than both rewriting the same span.
    const labels = [label({ hash: 'Day' }), label({ hash: 'DayTrade' })];
    const pieces = splitAlertLabels('#DayTrade', labels);
    expect(pieces.filter((p) => p.kind === 'label')).toHaveLength(1);
    expect(pieces.map((p) => p.text).join('')).toBe('#DayTrade');
  });

  it('is a lossless split — the pieces always rejoin to the original body', () => {
    const labels = [label(), label({ hash: 'SwingTrade' })];
    for (const body of [
      '',
      'no labels here',
      '#DayTrade',
      'lead #DayTrade tail',
      '#DayTrade#SwingTrade',
      '$AAPL up, #DayTrade'
    ]) {
      expect(splitAlertLabels(body, labels).map((p) => p.text).join('')).toBe(body);
    }
  });

  it('returns the body untouched when no labels are configured', () => {
    expect(splitAlertLabels('#DayTrade', [])).toEqual([{ kind: 'text', text: '#DayTrade' }]);
  });

  it('ignores a label whose hash is blank, which would otherwise match everywhere', () => {
    const pieces = splitAlertLabels('anything', [label({ hash: '' })]);
    expect(pieces).toEqual([{ kind: 'text', text: 'anything' }]);
  });
});

/*
  ALERTS ONLY, and BEFORE the ticker pass.

  Both are properties of the CALL SITE rather than of the model, so neither can be caught by the
  cases above — `splitAlertLabels` will happily label a chat message if something hands it labels.
  `"alerts" === i` in the transform is what stops that upstream, and the equivalent here is the
  `kind === 'alert'` guard inside `parseBodySegments`.

  Asserted against the component source for the same reason the toolbar contract is: the failure
  being guarded is a guard going missing.
*/
describe('the component applies labels to alerts only, ahead of the ticker pass', () => {
  const component = readFileSync(
    new URL('./components/RoomMessage.svelte', import.meta.url),
    'utf8'
  );
  const source = component.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

  it("gates the label pass on kind === 'alert'", () => {
    expect(source).toContain("kind === 'alert' && alertLabels.length > 0");
    expect(source).toContain('splitAlertLabels(value, alertLabels)');
  });

  it('runs labels first and feeds only the non-label pieces to the ticker/link pass', () => {
    const fn = source.slice(source.indexOf('function parseBodySegments'));
    const body = fn.slice(0, fn.indexOf('function parseTickersAndLinks'));
    expect(body.indexOf('splitAlertLabels')).toBeGreaterThan(-1);
    // The `$TICKER` split must be reached only through the text branch, never applied to a label.
    expect(body.indexOf('splitAlertLabels')).toBeLessThan(body.indexOf('parseTickersAndLinks'));
    expect(body).toContain("piece.kind === 'label'");
  });

  it('renders the badge with the captured class and both colours', () => {
    expect(source).toContain('class={ALERT_LABEL_BADGE_CLASS}');
    expect(source).toContain('style={alertLabelBadgeStyle(segment.label)}');
    // The badge shows the label NAME, never the raw `#hash` it replaced.
    expect(source).toContain('{segment.label.name}');
  });
});
