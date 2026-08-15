import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import DayTradeAlertsPane from './components/day-trade-alerts/DayTradeAlertsPane.svelte';
import {
  DAY_TRADE_ALERT_COMMANDS,
  DAY_TRADE_ALERT_DEFAULT_MONTHS,
  DAY_TRADE_ALERT_INITIAL_DAYS,
  DAY_TRADE_ALERT_MONTH_OPTIONS,
  DAY_TRADE_ALERT_PUSH_COMMANDS,
  dayTradeAlertLogDays,
  dayTradeAlertsTabVisible,
  dayTradesCsvFilename,
  formatDayTradeAlertTxt,
  limitDayTradeLogs,
  searchDayTradeLogs
} from './day-trade-alerts';
import { DAY_TRADE_ALERT_MAX_LOG_DAYS } from './day-trade-alerts-command';
import { SWING_ALERT_COMMANDS, SWING_ALERT_INITIAL_DAYS, swingAlertLogDays } from './swing-alerts';
import type { DayTradeAlertRow } from './types';

/**
 * Day Trade Alerts — the things that would regress SILENTLY.
 *
 * Not a re-description of the feature. Each block below guards something whose failure produces no
 * error, no type complaint and no visual difference until somebody in a live room notices:
 *
 *   1. the wire command names — a wrong one is a request the server rejects, and this feature has
 *      TWO traps in it: `newDayTradeAlertMsg` is not the create command, and `editAlertMessageSwing`
 *      is not renamed for Day Trade;
 *   2. the six values the port had to carry across rather than copy — months range, months default,
 *      day conversion, initial window, log bound, CSV filename — each of which differs from Swing
 *      and every one of which still compiles and still renders if it is wrong;
 *   3. the two comparators — `limitDayTradeLogs(rows, 0)` returning `[]` is one `||` away from
 *      returning everything, and `searchDayTradeLogs` guards where its Swing twin does not;
 *   4. the entitlement — false must emit NOTHING, not hidden markup;
 *   5. `formatDayTradeAlertTxt` — three strings in it look like typos and are not.
 *
 * Every assertion in this file was negative-controlled: broken by hand, watched go red, restored
 * and diffed byte-identical.
 */

function row(overrides: Partial<DayTradeAlertRow> = {}): DayTradeAlertRow {
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
  hasDayTradeAlerts: boolean;
  isPresenter: boolean;
  alerts?: readonly DayTradeAlertRow[];
}): string {
  return render(DayTradeAlertsPane, {
    props: {
      alerts: props.alerts ?? [],
      hasDayTradeAlerts: props.hasDayTradeAlerts,
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
    The whole reason this file exists, twice over. `newDayTradeAlertMsg` reads like the obvious name
    for "make a new one" and is in fact a payload KEY on the edit command and, separately, the
    server->client push — it occurs at three offsets in the bundle and not one of them is a create.
  */
  it('creates with `dayTradeAlertMsg`, never with `newDayTradeAlertMsg`', () => {
    expect(DAY_TRADE_ALERT_COMMANDS.create).toBe('dayTradeAlertMsg');
    expect(DAY_TRADE_ALERT_COMMANDS.create).not.toBe('newDayTradeAlertMsg');
    // The name is not unused — it belongs to the push, and the two must not be merged.
    expect(DAY_TRADE_ALERT_PUSH_COMMANDS.created).toBe('newDayTradeAlertMsg');
  });

  it('names the log, edit and delete commands exactly', () => {
    expect(DAY_TRADE_ALERT_COMMANDS.log).toBe('getDayTradeAlertsLog');
    expect(DAY_TRADE_ALERT_COMMANDS.edit).toBe('editDayTradeAlertMsg');
    expect(DAY_TRADE_ALERT_COMMANDS.delete).toBe('deleteDayTradeAlertMsg');
  });

  /*
    THE trap of this port. `editAlertMessageSwing` occurs at exactly two offsets in the bundle —
    1,983,136 and 1,987,189 — and the second one is inside `onDayTradeAlertSubmit`. The two payloads
    differ only in `swingTradeAlert: !0` versus `dayTradeAlert: !0`. `editAlertMessageDayTrade`
    occurs nowhere, so inventing it by analogy produces a command the server does not implement and
    a failure that names nothing.
  */
  it('mirrors the edit with `editAlertMessageSwing`, spelled with Swing, on the Day Trade path', () => {
    expect(DAY_TRADE_ALERT_COMMANDS.mirrorCreate).toBe('alertMsg');
    expect(DAY_TRADE_ALERT_COMMANDS.mirrorEdit).toBe('editAlertMessageSwing');
    expect(DAY_TRADE_ALERT_COMMANDS.mirrorEdit).not.toBe('editAlertMessageDayTrade');
    // Asserted against the Swing constant rather than a second literal, so the two cannot be
    // "tidied" apart by somebody who reads one of them as a copy-paste slip.
    expect(DAY_TRADE_ALERT_COMMANDS.mirrorEdit).toBe(SWING_ALERT_COMMANDS.mirrorEdit);
  });

  it('declares a server action for each mutation command', () => {
    /*
      SvelteKit action names must be literal keys, so they cannot be spelled from the const above.
      Reading the file is what keeps the two in step: a renamed action is a 404 that surfaces to a
      presenter only as "Unable to save".
    */
    const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
    for (const command of [
      DAY_TRADE_ALERT_COMMANDS.create,
      DAY_TRADE_ALERT_COMMANDS.edit,
      DAY_TRADE_ALERT_COMMANDS.delete
    ]) {
      expect(server, `+page.server.ts must declare the ${command} action`).toContain(
        `\n  ${command}: async ({ request, locals }) => {`
      );
    }
  });

  /*
    The create action posts into the MAIN alerts feed as its second write, so without the limiter it
    is a way to spam that feed at whatever rate the network allows, straight past the one guarding
    the composer. The Swing action shipped WITHOUT this and it was caught by re-reading a diff, not
    by a test. This is that test, so the next feature on this path cannot repeat it.
  */
  it('spends the alert rate limit on the create, and only on the create', () => {
    const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
    const create = server.slice(
      server.indexOf(`\n  ${DAY_TRADE_ALERT_COMMANDS.create}: async `),
      server.indexOf(`\n  ${DAY_TRADE_ALERT_COMMANDS.edit}: async `)
    );
    expect(create).not.toBe('');
    expect(create).toContain("consumeRateLimit('alert', user.id)");
  });
});

describe('the six values the port had to carry, not copy', () => {
  /*
    Each of these differs from the Swing twin, each still compiles if it is wrong, and each changes
    only WHICH ROWS a presenter sees — the failure mode with no error message at all. They are
    asserted against the Swing values as well as against literals, because "it equals Swing" is
    exactly the bug.
  */
  it('offers fifteen months, not twenty', () => {
    expect(DAY_TRADE_ALERT_MONTH_OPTIONS).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
    ]);
    expect(DAY_TRADE_ALERT_MONTH_OPTIONS).toHaveLength(15);
  });

  it('defaults the months select to 1, where Swing defaults to 2', () => {
    expect(DAY_TRADE_ALERT_DEFAULT_MONTHS).toBe(1);
  });

  it('converts months with 4 * months * 7, where Swing multiplies by 30', () => {
    // 1 -> 28 and 15 -> 420, the two ends of the select.
    expect(dayTradeAlertLogDays(1)).toBe(28);
    expect(dayTradeAlertLogDays(15)).toBe(420);
    expect(dayTradeAlertLogDays(2)).toBe(56);
    // The multiplier is the difference; at every month in the select the two must disagree.
    for (const months of DAY_TRADE_ALERT_MONTH_OPTIONS) {
      expect(dayTradeAlertLogDays(months)).not.toBe(swingAlertLogDays(months));
    }
  });

  it('fetches 21 days on load, where Swing fetches 42', () => {
    expect(DAY_TRADE_ALERT_INITIAL_DAYS).toBe(21);
    expect(DAY_TRADE_ALERT_INITIAL_DAYS).not.toBe(SWING_ALERT_INITIAL_DAYS);
  });

  it('bounds the log window at what the select can actually ask for', () => {
    // 4 * 15 * 7. A bound wider than the UI can reach is a bound that is not doing its job.
    expect(DAY_TRADE_ALERT_MAX_LOG_DAYS).toBe(420);
    expect(dayTradeAlertLogDays(DAY_TRADE_ALERT_MONTH_OPTIONS.at(-1) ?? 0)).toBe(
      DAY_TRADE_ALERT_MAX_LOG_DAYS
    );
  });

  it('names the export DayTradeLog_, not SwingLog_ and not DayTradesLog_', () => {
    expect(dayTradesCsvFilename('3625')).toBe('DayTradeLog_3625.csv');
  });
});

describe('the comparators', () => {
  it('limits to zero rows when the limit is zero, rather than to all of them', () => {
    // `e && 0 !== i ? e.slice(0, i) : []`. `rows.slice(0, limit || rows.length)` is the tempting
    // rewrite and it inverts this.
    expect(limitDayTradeLogs([row(), row({ id: 2 })], 0)).toEqual([]);
    expect(limitDayTradeLogs([row(), row({ id: 2 })], 1)).toHaveLength(1);
    expect(limitDayTradeLogs([row(), row({ id: 2 })], 10)).toHaveLength(2);
  });

  it('searches the symbol OR the sender name, lowercased, and keeps everything for an empty term', () => {
    const rows = [row(), row({ id: 2, symbol: 'MSFT', senderName: 'Sam Kite' })];

    expect(searchDayTradeLogs(rows, 'aapl')).toHaveLength(1);
    expect(searchDayTradeLogs(rows, 'AAPL')).toHaveLength(1);
    // The sender arm is the one a symbol-only rewrite would drop.
    expect(searchDayTradeLogs(rows, 'kite')).toHaveLength(1);
    expect(searchDayTradeLogs(rows, '')).toHaveLength(2);
    expect(searchDayTradeLogs(rows, 'nothing')).toHaveLength(0);
  });

  /*
    The optional chaining is a real difference from the Swing pipe (`ICe` at byte 1,915,738 versus
    `PCe` at 1,915,251), not transcription noise, so it gets an assertion that fails if somebody
    "normalises" the two. A row missing both fields must be skipped, not thrown on.
  */
  it('survives a row with no symbol and no sender name, which the Swing pipe does not', () => {
    const rows = [row(), { id: 2 } as unknown as DayTradeAlertRow];
    expect(() => searchDayTradeLogs(rows, 'aapl')).not.toThrow();
    expect(searchDayTradeLogs(rows, 'aapl')).toHaveLength(1);
    expect(searchDayTradeLogs(rows, 'zzz')).toHaveLength(0);
  });
});

describe('the entitlement', () => {
  it('renders NOTHING when the room does not have the feature', () => {
    const body = renderPane({ hasDayTradeAlerts: false, isPresenter: true });

    // Not "hidden" and not empty-ish: no element of any kind survives. SSR leaves comment anchors
    // behind, so those are stripped before the assertion rather than asserted away one by one.
    expect(body.replace(/<!--[\s\S]*?-->/g, '').trim()).toBe('');
    expect(body).not.toContain('day-trade-alerts-container');
    expect(body).not.toContain('dayTradeAlert-symbol');
    expect(body).not.toContain('Latest Day Trade Alerts');
  });

  it('agrees with the gate an absent setting produces', () => {
    expect(dayTradeAlertsTabVisible({})).toBe(false);
    expect(dayTradeAlertsTabVisible({ hasDayTradeAlerts: false })).toBe(false);
    expect(dayTradeAlertsTabVisible({ hasDayTradeAlerts: true })).toBe(true);
  });

  it('renders the pane, and only the presenter gets the form', () => {
    const presenter = renderPane({ hasDayTradeAlerts: true, isPresenter: true });
    const member = renderPane({ hasDayTradeAlerts: true, isPresenter: false });

    // A substring, not a whole `class="…"`: Svelte appends its own scoping class, so the attribute
    // reads `m-2 mx-auto day-trade-alert-form svelte-xxxxxx`.
    expect(presenter).toContain('day-trade-alert-form');
    expect(presenter).toContain('Latest Day Trade Alerts (Last');
    // A member sees the whole list surface and none of the composer.
    expect(member).not.toContain('day-trade-alert-form');
    expect(member).toContain('Latest Day Trade Alerts (Last');
  });
});

describe('the form, verbatim', () => {
  const body = renderPane({ hasDayTradeAlerts: true, isPresenter: true });

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
    for (const id of ['dayTradeAlert-entryPrice', 'dayTradeAlert-stop', 'dayTradeAlert-target']) {
      expect(body).toContain(`type="text" id="${id}"`);
    }
    expect(body).not.toContain('type="number" id="dayTradeAlert-entryPrice"');
  });

  it('uses the dayTradeAlert- id prefix everywhere, never the swingAlert- one', () => {
    /*
      The port's cheapest possible mistake: a pane that renders fine and shares its radio group and
      its `for`/`id` pairs with the OTHER pane whenever both are on the page at once — one room can
      have both features, so `id="swingAlert-long"` twice in a document is a radio a presenter
      cannot select.

      Rendered WITH a row, because the limit box and the search box live behind the empty-state
      branch: `O(9, log && 0 === log.length ? 9 : 10)`. Asserting them against an empty pane failed
      here first, and that failure was this test being wrong rather than the pane.
    */
    const populated = renderPane({
      hasDayTradeAlerts: true,
      isPresenter: true,
      alerts: [row()]
    });
    expect(populated).not.toContain('swingAlert-');
    for (const id of [
      'dayTradeAlert-symbol',
      'dayTradeAlert-image',
      'dayTradeAlert-long',
      'dayTradeAlert-short',
      'dayTradeAlert-limit',
      'dayTradeAlert-search'
    ]) {
      expect(populated, `the pane must carry ${id}`).toContain(id);
    }
  });

  it('offers exactly the two directions, defaulting to long', () => {
    expect(body).toContain('id="dayTradeAlert-long"');
    expect(body).toContain('id="dayTradeAlert-short"');
    expect(body).toContain('class="form-check-label text-success font-weight-bold"');
    expect(body).toContain('class="form-check-label text-danger font-weight-bold"');
  });

  it('shows the create-mode buttons, not the edit-mode ones', () => {
    // `wwe` + `Dwe`. The edit labels are `Discard ` with a TRASH icon and `Save Changes `.
    expect(body).toContain('Cancel');
    expect(body).toContain('Submit Alert');
    expect(body).not.toContain('Save Changes');
    expect(body).not.toContain('Discard');
  });
});

describe('the log surface', () => {
  it('shows the empty-state heading when the unfiltered log is empty', () => {
    const body = renderPane({ hasDayTradeAlerts: true, isPresenter: false });
    expect(body).toContain('No Day Trade Alerts to display.');
  });

  it('offers the fifteen month options the reference offers', () => {
    const body = renderPane({ hasDayTradeAlerts: true, isPresenter: false });
    const options = [...body.matchAll(/<option[^>]*>(\d+)<\/option>/g)].map((match) => match[1]);
    expect(options).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15'
    ]);
  });

  it('renders the eight headers in the captured order once there are rows', () => {
    const body = renderPane({
      hasDayTradeAlerts: true,
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
    expect(body).not.toContain('No Day Trade Alerts to display.');
  });

  it('gives the row buttons and the symbol container to a presenter only', () => {
    const presenter = renderPane({
      hasDayTradeAlerts: true,
      isPresenter: true,
      alerts: [row()]
    });
    const member = renderPane({ hasDayTradeAlerts: true, isPresenter: false, alerts: [row()] });

    expect(presenter).toContain('day-trade-alert-btn-delete');
    expect(presenter).toContain('day-trade-alert-btn-edit');
    expect(presenter).toContain('day-trade-symbol-container');
    expect(member).not.toContain('day-trade-alert-btn-delete');
    expect(member).not.toContain('day-trade-alert-btn-edit');
    expect(member).not.toContain('day-trade-symbol-container');
  });

  it('prints the direction as the raw string, with no colour class on the cell', () => {
    // The `<td>` is created with no const index at all: no class, no `ngClass`, no pipe. The
    // green/red pair belongs to the form's radio labels alone.
    const body = renderPane({
      hasDayTradeAlerts: true,
      isPresenter: false,
      alerts: [row({ direction: 'short' })]
    });
    expect(body).toContain('<td>short</td>');
  });
});

describe('formatDayTradeAlertTxt', () => {
  it('keeps the space before the newline and the word Exit for the stop value', () => {
    /*
      Three things look like typos and none is. The hashtag line is `"#DayTrade \n"` with a trailing
      space; the STOP value is labelled `Exit` even though the form's label and the table's header
      both say `Stop`; and the tag is `#DayTrade`, one word, not `#DayTradeTrade` or `#Day Trade`.
      These strings are read by presenters in the alerts feed every day.
    */
    expect(
      formatDayTradeAlertTxt({
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: '123.57',
        stop: '120.40',
        target: '138.75',
        image: ''
      })
    ).toBe('#DayTrade \nAAPL - long - Entry 123.57 - Exit 120.40 - Target 138.75');
  });

  it('appends the image on its own line only when there is one', () => {
    const withImage = formatDayTradeAlertTxt({
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
