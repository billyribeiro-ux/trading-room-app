import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import SwingAlertsPane from './components/swing-alerts/SwingAlertsPane.svelte';
import {
  SWING_ALERT_COMMANDS,
  SWING_ALERT_PUSH_COMMANDS,
  formatSwingAlertTxt,
  limitSwingLogs,
  searchSwingLogs,
  swingAlertsTabVisible
} from './swing-alerts';
import type { SwingAlertRow } from './types';

/**
 * Swing Trade Alerts — the things that would regress SILENTLY.
 *
 * Not a re-description of the feature. Each block below guards something whose failure produces no
 * error, no type complaint and no visual difference until somebody in a live room notices:
 *
 *   1. the wire command names — a wrong one is a request the server rejects, and the trap here is
 *      documented: `newSwingAlertMsg` is NOT the create command;
 *   2. the verbatim placeholders — they are the only labels four of the five inputs have;
 *   3. the two comparators — `limitSwingLogs(rows, 0)` returning `[]` is one `||` away from
 *      returning everything, and `searchSwingLogs` matches two fields, not one;
 *   4. the entitlement — false must emit NOTHING, not hidden markup;
 *   5. `formatSwingAlertTxt` — two strings in it look like typos and are not.
 */

function row(overrides: Partial<SwingAlertRow> = {}): SwingAlertRow {
  return {
    id: 1,
    symbol: 'AAPL',
    direction: 'long',
    entryDate: '2026-07-30T12:00:00.000Z',
    entryPrice: '123.57',
    stop: '120.40',
    target: '138.75',
    image: '',
    senderName: 'Dana Vero',
    senderPic: '',
    senderAvt: 'abc123',
    ...overrides
  };
}

function renderPane(props: {
  hasSwingTradeAlerts: boolean;
  isPresenter: boolean;
  alerts?: readonly SwingAlertRow[];
}): string {
  return render(SwingAlertsPane, {
    props: {
      alerts: props.alerts ?? [],
      hasSwingTradeAlerts: props.hasSwingTradeAlerts,
      isPresenter: props.isPresenter,
      sessionHandle: '3625',
      onCreate: () => undefined,
      onDelete: () => undefined,
      onEdit: () => undefined,
      onMonthsChange: () => undefined,
      onPasteImage: async () => null,
      onUploadImage: async () => null
    }
  }).body;
}

describe('the wire vocabulary', () => {
  /*
    The whole reason this file exists. Two independent decodes of the bundle had to correct the
    create command, because `newSwingAlertMsg` reads like the obvious name for "make a new one" and
    is in fact a payload KEY on the edit command and, separately, the server->client push.
  */
  it('creates with `swingAlertMsg`, never with `newSwingAlertMsg`', () => {
    expect(SWING_ALERT_COMMANDS.create).toBe('swingAlertMsg');
    expect(SWING_ALERT_COMMANDS.create).not.toBe('newSwingAlertMsg');
    // The name is not unused — it belongs to the push, and the two must not be merged.
    expect(SWING_ALERT_PUSH_COMMANDS.created).toBe('newSwingAlertMsg');
  });

  it('names the log, edit and delete commands exactly', () => {
    expect(SWING_ALERT_COMMANDS.log).toBe('getSwingAlertsLog');
    expect(SWING_ALERT_COMMANDS.edit).toBe('editSwingAlertMsg');
    expect(SWING_ALERT_COMMANDS.delete).toBe('deleteSwingAlertMsg');
  });

  it('mirrors into the alerts feed with `alertMsg` and `editAlertMessageSwing`', () => {
    /*
      A swing submit sends TWO commands (bundle byte 1,983,136). `editAlertMessageSwing` is shared
      verbatim with the Day Trade path, which differs only in the boolean it sends — so when Day
      Trade is ported it reuses this name rather than inventing `editAlertMessageDayTrade`.
    */
    expect(SWING_ALERT_COMMANDS.mirrorCreate).toBe('alertMsg');
    expect(SWING_ALERT_COMMANDS.mirrorEdit).toBe('editAlertMessageSwing');
  });

  it('declares a server action for each mutation command', () => {
    /*
      SvelteKit action names must be literal keys, so they cannot be spelled from the const above.
      Reading the file is what keeps the two in step: a renamed action is a 404 that surfaces to a
      presenter only as "Unable to save".
    */
    const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
    for (const command of [
      SWING_ALERT_COMMANDS.create,
      SWING_ALERT_COMMANDS.edit,
      SWING_ALERT_COMMANDS.delete
    ]) {
      expect(server, `+page.server.ts must declare the ${command} action`).toContain(
        `\n  ${command}: async ({ request, locals }) => {`
      );
    }
  });
});

describe('the comparators', () => {
  it('limits to zero rows when the limit is zero, rather than to all of them', () => {
    // `e && 0 !== i ? e.slice(0, i) : []`. `rows.slice(0, limit || rows.length)` is the tempting
    // rewrite and it inverts this.
    expect(limitSwingLogs([row(), row({ id: 2 })], 0)).toEqual([]);
    expect(limitSwingLogs([row(), row({ id: 2 })], 1)).toHaveLength(1);
    expect(limitSwingLogs([row(), row({ id: 2 })], 10)).toHaveLength(2);
  });

  it('searches the symbol OR the sender name, lowercased, and keeps everything for an empty term', () => {
    const rows = [row(), row({ id: 2, symbol: 'MSFT', senderName: 'Sam Kite' })];

    expect(searchSwingLogs(rows, 'aapl')).toHaveLength(1);
    expect(searchSwingLogs(rows, 'AAPL')).toHaveLength(1);
    // The sender arm is the one a symbol-only rewrite would drop.
    expect(searchSwingLogs(rows, 'kite')).toHaveLength(1);
    expect(searchSwingLogs(rows, '')).toHaveLength(2);
    expect(searchSwingLogs(rows, 'nothing')).toHaveLength(0);
  });
});

describe('the entitlement', () => {
  it('renders NOTHING when the room does not have the feature', () => {
    const body = renderPane({ hasSwingTradeAlerts: false, isPresenter: true });

    // Not "hidden" and not empty-ish: no element of any kind survives. SSR leaves comment anchors
    // behind, so those are stripped before the assertion rather than asserted away one by one.
    expect(body.replace(/<!--[\s\S]*?-->/g, '').trim()).toBe('');
    expect(body).not.toContain('swing-alerts-container');
    expect(body).not.toContain('swingAlert-symbol');
    expect(body).not.toContain('Latest Swing Trade Alerts');
  });

  it('agrees with the gate an absent setting produces', () => {
    expect(swingAlertsTabVisible({})).toBe(false);
    expect(swingAlertsTabVisible({ hasSwingTradeAlerts: false })).toBe(false);
    expect(swingAlertsTabVisible({ hasSwingTradeAlerts: true })).toBe(true);
  });

  it('renders the pane, and only the presenter gets the form', () => {
    const presenter = renderPane({ hasSwingTradeAlerts: true, isPresenter: true });
    const member = renderPane({ hasSwingTradeAlerts: true, isPresenter: false });

    // A substring, not a whole `class="…"`: Svelte appends its own scoping class, so the attribute
    // reads `m-2 mx-auto swing-alert-form svelte-xxxxxx`.
    expect(presenter).toContain('swing-alert-form');
    expect(presenter).toContain('Latest Swing Trade Alerts (Last');
    // A member sees the whole list surface and none of the composer.
    expect(member).not.toContain('swing-alert-form');
    expect(member).toContain('Latest Swing Trade Alerts (Last');
  });
});

describe('the form, verbatim', () => {
  const body = renderPane({ hasSwingTradeAlerts: true, isPresenter: true });

  it('carries the five placeholders exactly as captured', () => {
    expect(body).toContain('placeholder="AAPL"');
    expect(body).toContain('placeholder="123.57"');
    expect(body).toContain('placeholder="120.40"');
    expect(body).toContain('placeholder="138.75"');
    expect(body).toContain(
      'placeholder="Upload Image or Paste Image Link / Screenshot (optional)"'
    );
  });

  it('keeps the three price fields as text inputs', () => {
    /*
      The single most likely "improvement" to this form, and it changes the keyboard, the validation
      and the locale handling of the decimal separator on a field whose value is stored verbatim.
    */
    for (const id of ['swingAlert-entryPrice', 'swingAlert-stop', 'swingAlert-target']) {
      expect(body).toContain(`type="text" id="${id}"`);
    }
    expect(body).not.toContain('type="number" id="swingAlert-entryPrice"');
  });

  it('offers exactly the two directions, defaulting to long', () => {
    expect(body).toContain('id="swingAlert-long"');
    expect(body).toContain('id="swingAlert-short"');
    expect(body).toContain('class="form-check-label text-success font-weight-bold"');
    expect(body).toContain('class="form-check-label text-danger font-weight-bold"');
  });

  it('shows the create-mode buttons, not the edit-mode ones', () => {
    // `cwe` + `uwe`. The edit labels are `Discard ` with a TRASH icon and `Save Changes `; an
    // earlier decode had the edit-mode word and the icon index both wrong.
    expect(body).toContain('Cancel');
    expect(body).toContain('Submit Alert');
    expect(body).not.toContain('Save Changes');
    expect(body).not.toContain('Discard');
  });
});

describe('the log surface', () => {
  it('shows the empty-state heading when the unfiltered log is empty', () => {
    const body = renderPane({ hasSwingTradeAlerts: true, isPresenter: false });
    expect(body).toContain('No Swing Trade Alerts to display.');
  });

  it('renders the eight headers in the captured order once there are rows', () => {
    const body = renderPane({
      hasSwingTradeAlerts: true,
      isPresenter: false,
      alerts: [row()]
    });

    const headers = [...body.matchAll(/<th>([^<]*)<\/th>/g)].map((match) => match[1]);
    expect(headers).toEqual([
      'Symbol',
      'Long/Short',
      'Alert Date',
      'Entry Price',
      'Stop',
      'Target',
      'Image',
      'Sender'
    ]);
    expect(body).not.toContain('No Swing Trade Alerts to display.');
  });

  it('gives the row buttons and the symbol container to a presenter only', () => {
    const presenter = renderPane({
      hasSwingTradeAlerts: true,
      isPresenter: true,
      alerts: [row()]
    });
    const member = renderPane({ hasSwingTradeAlerts: true, isPresenter: false, alerts: [row()] });

    expect(presenter).toContain('swing-alert-btn-delete');
    expect(presenter).toContain('swing-alert-btn-edit');
    expect(presenter).toContain('swing-symbol-container');
    expect(member).not.toContain('swing-alert-btn-delete');
    expect(member).not.toContain('swing-alert-btn-edit');
    expect(member).not.toContain('swing-symbol-container');
  });

  it('prints the direction as the raw string, with no colour class on the cell', () => {
    // The `<td>` is created with no const index at all: no class, no `ngClass`, no pipe. The
    // green/red pair belongs to the form's radio labels alone.
    const body = renderPane({
      hasSwingTradeAlerts: true,
      isPresenter: false,
      alerts: [row({ direction: 'short' })]
    });
    expect(body).toContain('<td>short</td>');
  });
});

describe('formatSwingAlertTxt', () => {
  it('keeps the space before the newline and the word Exit for the stop value', () => {
    /*
      Both look like typos and neither is. The hashtag line is `"#SwingTrade \n"` with a trailing
      space, and the STOP value is labelled `Exit` even though the form's label and the table's
      header both say `Stop`. These strings are read by presenters in the alerts feed every day.
    */
    expect(
      formatSwingAlertTxt({
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: '123.57',
        stop: '120.40',
        target: '138.75',
        image: ''
      })
    ).toBe('#SwingTrade \nAAPL - long - Entry 123.57 - Exit 120.40 - Target 138.75');
  });

  it('appends the image on its own line only when there is one', () => {
    const withImage = formatSwingAlertTxt({
      symbol: 'AAPL',
      direction: 'long',
      entryPrice: '1',
      stop: '2',
      target: '3',
      image: 'https://example.test/a.png'
    });
    expect(withImage.endsWith('\nhttps://example.test/a.png')).toBe(true);
  });
});
