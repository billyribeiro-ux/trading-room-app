// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { type AlertRow, RoomAlerts } from './alerts.svelte';

/*
  The fifth room state class. As with the other four, the reactivity block at the bottom is the only
  gate that can see the thing most likely to go wrong — mutations and flushes INSIDE `$effect.root`,
  assertions OUTSIDE it.
*/

const EMPTY = { alertFilterFor: {}, showAlertsFrom: false, archivedAt: null };

const alert = (over: Partial<AlertRow> = {}): AlertRow => ({
  body: 'AAPL long',
  senderName: 'Allison',
  senderEmailHash: 'aaaa1111',
  createdAt: new Date('2026-08-15T12:00:00Z'),
  ...over
});

describe('the toolbar has two states, and the two controls do not fight', () => {
  it('the gear opens the FULL strip from closed', () => {
    const alerts = new RoomAlerts(EMPTY);
    alerts.toggleToolbar();
    expect([alerts.toolbarOpen, alerts.toolbarExtended]).toEqual([true, true]);
  });

  it('the gear EXPANDS a search-only strip rather than closing it', () => {
    /*
      The first branch of `toggleAlertsToolbar`, and the reason the two flags exist. With one flag
      the magnifier opened everything and the gear could only close what the magnifier had opened.
    */
    const alerts = new RoomAlerts(EMPTY);
    alerts.toggleSearchOnly();
    expect([alerts.toolbarOpen, alerts.toolbarExtended]).toEqual([true, false]);

    alerts.toggleToolbar();
    expect([alerts.toolbarOpen, alerts.toolbarExtended]).toEqual([true, true]);
  });

  it('the magnifier COLLAPSES a full strip rather than closing it', () => {
    const alerts = new RoomAlerts(EMPTY);
    alerts.toggleToolbar();
    expect(alerts.toggleSearchOnly(), 'still open, so there is a box to focus').toBe(true);
    expect([alerts.toolbarOpen, alerts.toolbarExtended]).toEqual([true, false]);
  });

  it('and each control closes the strip it opened', () => {
    const alerts = new RoomAlerts(EMPTY);
    alerts.toggleToolbar();
    alerts.toggleToolbar();
    expect(alerts.toolbarOpen).toBe(false);

    alerts.toggleSearchOnly();
    expect(alerts.toggleSearchOnly(), 'closed, so nothing to focus').toBe(false);
    expect(alerts.toolbarOpen).toBe(false);
  });

  it('the magnifier ALWAYS ends with the extended regions hidden', () => {
    // `this.showAlertsToolbarExtended = !1` sits outside the conditional upstream.
    const alerts = new RoomAlerts(EMPTY);
    alerts.toggleToolbar();
    alerts.toggleSearchOnly();
    alerts.toggleSearchOnly();
    expect(alerts.toolbarExtended).toBe(false);
  });
});

describe('the stored filter map is taken strictly, never coerced', () => {
  it('keeps string values and drops everything else', () => {
    /*
      A junk entry that survived would filter out a trader nobody selected, and in the allow-list
      direction it would hide almost every alert in the room — which is the loud failure, so the
      quiet one is what this pins.
    */
    expect(
      RoomAlerts.readFilterFor({ aaaa1111: 'Allison', bbbb2222: 1, cccc3333: null, dddd: true })
    ).toEqual({ aaaa1111: 'Allison' });
  });

  it('refuses a non-object outright', () => {
    expect(RoomAlerts.readFilterFor(null)).toEqual({});
    expect(RoomAlerts.readFilterFor('aaaa1111')).toEqual({});
    expect(RoomAlerts.readFilterFor(['aaaa1111'])).toEqual({});
  });
});

describe('the filter, and the two write paths that are different things', () => {
  it('reports no selection for an empty map', () => {
    expect(new RoomAlerts(EMPTY).filterSelected).toBe(false);
  });

  it('the modal’s live edit moves the badge WITHOUT persisting', () => {
    /*
      Clicking a trader in the alert-filter modal updates the header badge immediately, before
      anything is saved — that is what `bind:` does today and it is preserved. The setter is the
      DRAFT; `filterChanged` is the commit.
    */
    const alerts = new RoomAlerts(EMPTY);
    alerts.filterFor = { aaaa1111: 'Allison' };
    expect(alerts.filterSelected).toBe(true);
  });

  it('and the commit returns exactly what the page should persist', () => {
    const alerts = new RoomAlerts(EMPTY);
    const write = alerts.filterChanged({
      alertFilterFor: { bbbb2222: 'Bob' },
      showAlertsFrom: true
    });

    expect(write).toEqual({ alertFilterFor: { bbbb2222: 'Bob' }, showAlertsFrom: true });
    expect(alerts.filterFor, 'and applies it, or the list would not move until reload').toEqual({
      bbbb2222: 'Bob'
    });
    expect(alerts.showFrom).toBe(true);
  });

  it('the predicate inverts on showFrom, which is the whole feature', () => {
    // true = allow-list (show only the selected), false = deny-list (hide the selected).
    const alerts = new RoomAlerts({ ...EMPTY, alertFilterFor: { aaaa1111: 'Allison' } });
    const passes = () => alerts.passesFilter('Allison,Bob');

    expect(passes()(alert({ senderEmailHash: 'aaaa1111' })), 'deny-list hides them').toBe(false);
    expect(passes()(alert({ senderEmailHash: 'bbbb2222' })), 'and keeps everyone else').toBe(true);

    alerts.showFrom = true;
    expect(passes()(alert({ senderEmailHash: 'aaaa1111' })), 'allow-list shows them').toBe(true);
    expect(passes()(alert({ senderEmailHash: 'bbbb2222' })), 'and hides everyone else').toBe(false);
  });

  it('and fails OPEN when the room configured no trader list', () => {
    // A room that never configured one has no feature; every alert must still arrive.
    const alerts = new RoomAlerts({ ...EMPTY, alertFilterFor: { aaaa1111: 'Allison' } });
    expect(alerts.passesFilter(null)(alert({ senderEmailHash: 'aaaa1111' }))).toBe(true);
    expect(alerts.passesFilter('   ')(alert({ senderEmailHash: 'aaaa1111' }))).toBe(true);
  });
});

describe('the search term filters what the reader can see, and nothing else', () => {
  const alerts = new RoomAlerts(EMPTY);

  it('an empty term keeps everything', () => {
    alerts.search = '';
    expect(alerts.matchesSearch(alert())).toBe(true);
    alerts.search = '   ';
    expect(alerts.matchesSearch(alert()), 'whitespace is not a term').toBe(true);
  });

  it('matches the body and the sender NAME, case-insensitively', () => {
    alerts.search = 'aapl';
    expect(alerts.matchesSearch(alert())).toBe(true);
    alerts.search = 'ALLISON';
    expect(alerts.matchesSearch(alert())).toBe(true);
  });

  it('and NOT the metadata a reader cannot see', () => {
    // The hash is on the row and is deliberately not searched: matching it would make the field
    // behave differently for two alerts that look identical on screen.
    alerts.search = 'aaaa1111';
    expect(alerts.matchesSearch(alert())).toBe(false);
  });

  it('survives being handed straight to Array.filter', () => {
    /*
      The reason `matchesSearch` is an arrow FIELD rather than a method. `.filter(alerts.matchesSearch)`
      passes the function without its receiver; a plain method would lose `this` and throw on the
      first private-field read — a runtime failure `svelte-check` cannot see.
    */
    alerts.search = 'aapl';
    const rows = [alert(), alert({ body: 'TSLA short' })];
    expect(rows.filter(alerts.matchesSearch)).toHaveLength(1);
  });
});

describe('the archive cut-off, which deletes nothing', () => {
  const AT = new Date('2026-08-15T12:00:00Z').getTime();

  it('keeps everything when no archive has been taken', () => {
    /*
      `null` is not 0, and that distinction hid the entire captured alert list once: captured alerts
      carry `createdAt: new Date(0)`, so a 0 default made `createdAt > cutoff` false for every one
      of them until the reader archived something.
    */
    const alerts = new RoomAlerts(EMPTY);
    expect(alerts.matchesSearch(alert())).toBe(true);
    expect(alerts.afterArchive(alert({ createdAt: new Date(0) }))).toBe(true);
  });

  it('drops alerts at or before the cut-off and keeps later ones', () => {
    const alerts = new RoomAlerts({ ...EMPTY, archivedAt: AT });
    expect(alerts.afterArchive(alert({ createdAt: new Date(AT - 1) }))).toBe(false);
    expect(alerts.afterArchive(alert({ createdAt: new Date(AT) })), 'AT itself is archived').toBe(
      false
    );
    expect(alerts.afterArchive(alert({ createdAt: new Date(AT + 1) }))).toBe(true);
  });

  it('archiving returns the same instant it stores', () => {
    // One clock reading for the state and the preference — two would let an alert arrive between
    // them and be archived out of the list while the stored cut-off does not cover it.
    const alerts = new RoomAlerts(EMPTY);
    expect(alerts.archive(AT)).toBe(AT);
    expect(alerts.archivedAt).toBe(AT);
  });
});

describe('the getters are REACTIVE, which no other gate can see', () => {
  it('re-runs a reader as the toolbar expands', () => {
    const alerts = new RoomAlerts(EMPTY);
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(alerts.toolbarExtended);
      });
      flushSync();
      alerts.toggleSearchOnly();
      flushSync();
      alerts.toggleToolbar();
      flushSync();
    });
    stop();

    expect(seen, 'the extended flag is not reactive').toEqual([false, true]);
  });

  it('and as a trader is selected, which is what moves the header badge', () => {
    const alerts = new RoomAlerts(EMPTY);
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(alerts.filterSelected);
      });
      flushSync();
      alerts.filterFor = { aaaa1111: 'Allison' };
      flushSync();
      alerts.filterChanged({ alertFilterFor: {}, showAlertsFrom: false });
      flushSync();
    });
    stop();

    expect(seen, 'the badge would freeze until reload').toEqual([false, true, false]);
  });

  it('and as the search term is typed, which re-runs the list filter', () => {
    const alerts = new RoomAlerts(EMPTY);
    const seen: string[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(alerts.search);
      });
      flushSync();
      alerts.search = 'aapl';
      flushSync();
    });
    stop();

    expect(seen, 'the search term is not reactive').toEqual(['', 'aapl']);
  });
});
