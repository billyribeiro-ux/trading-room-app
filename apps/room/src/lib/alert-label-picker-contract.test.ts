import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { alertLabelPrefix, parseAlertLabels, type AlertLabel } from './alert-labels.js';
import {
  composePastedImageAlert,
  composePostAlert,
  composeUploadedAlert
} from './post-alert-behavior.js';

/**
 * The post-alert composer's Alert Label picker — `PAM-01`.
 *
 * ## What was missing, and what was already there
 *
 * The room PARSED the setting (`gates.alertLabels`) and RENDERED the badges
 * (`RoomMessage` → `splitAlertLabels`), so a configured label worked — as long as the presenter
 * typed `#DayTrade` by hand into the alert. The picker that puts it there did not exist, and neither
 * did the prefixing it performs. A feature whose consumer shipped without its producer.
 *
 * ## The reference, decoded rather than recalled
 *
 * The picker, `zTe` at byte 2,119,145, with its consts read out of `app-post-alert-modal`'s own
 * table (35 = `[1,"form-check"]`, 52 = the checkbox, 53 = `[3,"for"]`):
 *
 * ```html
 * <div class="form-check">
 *   <input type="checkbox" class="form-check-input" id="alert-trade-label-{i}" [(ngModel)]="e.checked">
 *   <label [for]="'alert-trade-label-' + i">{{e.name}}?</label>
 * </div>
 * ```
 *
 * mounted behind `O(62, globals.alertLabels && globals.alertLabels.length > 0 ? 62 : -1)` at byte
 * 2,138,428 — slot 62, between Non-trade (61) and Linked Room Alerts (63).
 *
 * The prefixing, `processAlertLabels` at byte 2,131,232:
 *
 * ```js
 * let i = "";
 * const o = globals.alertLabels.filter(s => s.checked);
 * if (o.length > 0)
 *   for (let s = 0; s < o.length; s++) i += " #" + o[s].hash + (s === o.length - 1 ? "\n" : " ");
 * return i && i.length > 0 && (e.txt = i + e.txt, globals.alertLabels.forEach(s => s.checked = !1)), e
 * ```
 *
 * and its ORDER, identical at all four of the reference's send sites: the legal disclosure is
 * APPENDED first, then the labels are PREPENDED, then `postOnX` reads the finished string.
 */

const MODAL = readFileSync(new URL('./components/PostAlertModal.svelte', import.meta.url), 'utf8');
/* Comments stripped: this file and the component both quote the markup they are asserting on. */
const modalCode = MODAL.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');

const label = (hash: string, name = hash): AlertLabel => ({
  hash,
  name,
  bgcolor: '#e8f5f7',
  color: '#9c4537',
  checked: false
});

describe('the prefix', () => {
  it('is empty when nothing is checked', () => {
    expect(alertLabelPrefix([])).toBe('');
  });

  it('leads with a SPACE and ends with a newline, for one label', () => {
    /*
      Both edges are the reference's and both look like mistakes. The leading space survives into the
      stored body; the newline is what puts the alert's text on its own line under the hashes.
    */
    expect(alertLabelPrefix([label('DayTrade')])).toBe(' #DayTrade\n');
  });

  it('emits DOUBLE spaces between labels, because each entry carries its own', () => {
    /*
      This assertion was written as `' #A #B #C\n'` and was WRONG — the code was right. Read the
      expression again:

        i += " #" + o[s].hash + (s === o.length - 1 ? "\n" : " ")

      every entry BEGINS with a space and every entry but the last ENDS with one, so between two
      labels there are two. It looks like a mistake and it is the shipped output; a "tidier"
      implementation joining on a single space would be a silent divergence in the stored body of
      every multi-label alert.
    */
    expect(alertLabelPrefix([label('A'), label('B'), label('C')])).toBe(' #A  #B  #C\n');
  });

  it('uses the HASH and not the name', () => {
    // The name is the badge's visible text; the body carries the hash the renderer matches on.
    expect(alertLabelPrefix([label('DayTrade', 'Day Trade')])).toBe(' #DayTrade\n');
  });
});

describe('where it lands in the body', () => {
  const draft = {
    tab: 'text' as const,
    alertText: 'AAPL long',
    alertUrl: '',
    linkAlertText: '',
    imageAlertText: '',
    legalDisclosure: false,
    legalDisclosureText: '',
    filesTouched: false
  };

  it('is PREPENDED, not appended', () => {
    const composed = composePostAlert({ ...draft, labelPrefix: ' #DayTrade\n' });
    expect(composed).toEqual({ status: 'post', kind: 'text', body: ' #DayTrade\nAAPL long' });
  });

  it('goes in FRONT of a body the disclosure has already been appended to', () => {
    /*
      The order every one of the reference's four send sites uses:
        legalDisclosure && (e.txt += " \n " + txt), alertLabels.length && (e = processAlertLabels(e))
      so a body with both reads labels + text + disclosure. Reversing it would put the hashes after
      the disclosure, where the badge renderer still finds them and a reader does not expect them.
    */
    const composed = composePostAlert({
      ...draft,
      legalDisclosure: true,
      legalDisclosureText: 'Not advice.',
      labelPrefix: ' #DayTrade\n'
    });
    expect(composed).toEqual({
      status: 'post',
      kind: 'text',
      body: ' #DayTrade\nAAPL long \n Not advice.'
    });
  });

  it('changes nothing when no label is checked', () => {
    expect(composePostAlert(draft)).toEqual({
      status: 'post',
      kind: 'text',
      body: 'AAPL long'
    });
  });

  it('reaches the UPLOAD paths too, which compose after the modal has closed', () => {
    /*
      `composeUploadedAlert` and `composePastedImageAlert` run in `RoomComposer`, once the files are
      on the CDN — so the picker's state has to survive that trip, which is why it is on the
      SUBMISSION and not only on the draft. Upstream prefixes on both of those branches as well
      (bytes 2,126,849 and 2,127,305).
    */
    expect(composeUploadedAlert('shot', ['https://cdn/1.png'], false, '', ' #A\n')).toBe(
      ' #A\nshot https://cdn/1.png'
    );
    expect(composePastedImageAlert('shot', 'https://cdn/1.png', false, '', ' #A\n')).toBe(
      ' #A\nshot\nhttps://cdn/1.png'
    );
  });
});

describe('the picker', () => {
  it('is drawn once per configured label, with the reference s id and its question mark', () => {
    expect(modalCode).toContain('{#each alertLabels as label, index (label.hash)}');
    expect(modalCode).toContain('id="alert-trade-label-{index}"');
    expect(modalCode).toContain('<label for="alert-trade-label-{index}">{label.name}?</label>');
  });

  it('draws NOTHING for a room with no labels, which is the whole gate', () => {
    /*
      `O(62, alertLabels && alertLabels.length > 0 ? 62 : -1)`. An `{#each}` over an empty array is
      that gate exactly — no `{#if}` is needed and adding one would be a second expression saying the
      same thing. Asserted through the default, which is what a room with no setting produces.
    */
    expect(modalCode).toContain('alertLabels = []');
    expect(parseAlertLabels(null)).toEqual([]);
    expect(parseAlertLabels('')).toEqual([]);
  });

  it('keeps its selection OUT of the shared label table', () => {
    /*
      The reference stores it there — `checked` on every entry of `globals.alertLabels`, flipped back
      to false after each send. That makes a room-wide parsed table hold one modal's UI state.
      A `Set` of hashes here is the same observable behaviour with one fewer shared mutable, and
      `alert-labels.ts` keeps the `checked` field only so the parse matches.
    */
    expect(modalCode).toContain('const checkedLabels = new SvelteSet<string>()');
    expect(modalCode).not.toContain('label.checked =');
  });

  it('builds the prefix in the ROOM s order, not in click order', () => {
    /*
      Upstream's `filter(s => s.checked)` walks the table, so ticking B then A still sends ` #A #B`.
      A `Set` preserves INSERTION order, so filtering the table rather than iterating the set is what
      reproduces that — and this is the line that does it.
    */
    expect(modalCode).toContain(
      'alertLabelPrefix(alertLabels.filter((label) => checkedLabels.has(label.hash)))'
    );

    // …and the rule itself, executed: the table's order is what comes out.
    const table = [label('A'), label('B'), label('C')];
    const clickedOutOfOrder = new Set(['C', 'A']);
    expect(alertLabelPrefix(table.filter((entry) => clickedOutOfOrder.has(entry.hash)))).toBe(
      ' #A  #C\n'
    );
  });

  it('clears every box with the rest of the inputs', () => {
    /*
      `processAlertLabels` unchecks after a send, and `doCloseModal` and `clearInputFields` do too.
      `clearInputFields` is called by `beginOpenState` on every open and by both send paths when Keep
      Open is on, so clearing there covers all three.
    */
    const at = modalCode.indexOf('function clearInputFields');
    expect(at, 'clearInputFields must exist').toBeGreaterThan(-1);
    const closes = modalCode.indexOf('\n  }', at);
    expect(closes, 'clearInputFields must be closed').toBeGreaterThan(at);
    expect(modalCode.slice(at, closes)).toContain('checkedLabels.clear();');
  });

  it('reaches all THREE places the body can be composed', () => {
    /*
      Three, not two, and this assertion was written as two before the sites were counted:

        `composePostAlert(...)`   the draft — composes the body for a text/url alert, here and now;
        `onpost({...})`           the submission — the UPLOAD branch composes in `RoomComposer`,
                                  after the files are on the CDN and the modal has closed;
        `onpastepost({...})`      the pasted-image submission, which composes there too.

      Passing it to the draft alone would prefix a typed alert and silently drop the labels from every
      alert that carries an image — which is the half the reference prefixes at bytes 2,126,849 and
      2,127,305. Counted as an object-literal field at its own indent so the `$derived` that BUILDS
      it is not mistaken for a fourth.
    */
    expect(modalCode.match(/^ {6}labelPrefix$/gm) ?? []).toHaveLength(3);
  });
});
