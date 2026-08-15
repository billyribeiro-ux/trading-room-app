import { describe, expect, it } from 'vitest';
import {
  ALERT_FILTER_TITLE_SUFFIX,
  alertFilterAvailable,
  alertFilterConfirm,
  alertFilterTitle,
  alertPassesFilter,
  hasActiveAlertFilter,
  parseModAlertFilterList,
  selectAllTraders,
  toggleTrader,
  traderRowIconClass,
  unselectAllTraders,
  type AlertFilterFor
} from './alert-filter';

/*
  The Alert Filter, against `main.d1d09071be31f1ba.js` bytes 1,218,900-1,224,100.

  Every case here exists because getting it wrong is SILENT. There is no error state for a filter
  that keeps the wrong half of the alerts — it just quietly shows the wrong thing, and the person it
  misleads is a trader.
*/

const TRADERS = [
  { username: 'Allison', avatar: 'aaaa1111' },
  { username: 'Bruce', avatar: 'bbbb2222' },
  { username: 'Carol', avatar: 'cccc3333' }
];
const LIST_RAW = JSON.stringify(TRADERS);

describe('showAlertsFrom inverts the whole meaning', () => {
  /*
    Byte 1,017,070: `showAlertsFrom ? alertFilterFor[se.avt] : !alertFilterFor[se.avt]`.

    The SAME selection means opposite things. This is the assertion that matters most in the file:
    an implementation with the ternary the wrong way round passes a type check, passes a render
    test, and shows every trader the viewer asked to hide.
  */
  const selection: AlertFilterFor = { aaaa1111: 'Allison' };
  const base = { alertFilterFor: selection, modAlertFilterListRaw: LIST_RAW };

  it('true is an ALLOW-list — only the selected people are shown', () => {
    expect(alertPassesFilter({ ...base, avatarHash: 'aaaa1111', showAlertsFrom: true })).toBe(true);
    expect(alertPassesFilter({ ...base, avatarHash: 'bbbb2222', showAlertsFrom: true })).toBe(
      false
    );
  });

  it('false is a DENY-list — the selected people are the ones removed', () => {
    expect(alertPassesFilter({ ...base, avatarHash: 'aaaa1111', showAlertsFrom: false })).toBe(
      false
    );
    expect(alertPassesFilter({ ...base, avatarHash: 'bbbb2222', showAlertsFrom: false })).toBe(
      true
    );
  });

  it('the two directions are exact opposites for every avatar', () => {
    for (const avatarHash of ['aaaa1111', 'bbbb2222', 'cccc3333', 'unknown']) {
      const shown = alertPassesFilter({ ...base, avatarHash, showAlertsFrom: true });
      const hidden = alertPassesFilter({ ...base, avatarHash, showAlertsFrom: false });
      expect(shown).toBe(!hidden);
    }
  });
});

describe('the guard fails OPEN, in every way it can fail', () => {
  /*
    The reference's guard requires BOTH a non-empty room list AND a non-empty selection, and wraps
    the lot in `try {} catch {}`. Nothing is filtered unless both hold. That is the safe direction
    for a display filter and it is reproduced rather than hardened.
  */
  it('shows everything when the room configured no list', () => {
    for (const raw of [null, undefined, '', '   ']) {
      expect(
        alertPassesFilter({
          avatarHash: 'bbbb2222',
          alertFilterFor: { aaaa1111: 'Allison' },
          showAlertsFrom: true,
          modAlertFilterListRaw: raw
        })
      ).toBe(true);
    }
  });

  it('shows everything when the viewer selected nobody, in BOTH directions', () => {
    for (const showAlertsFrom of [true, false]) {
      expect(
        alertPassesFilter({
          avatarHash: 'aaaa1111',
          alertFilterFor: {},
          showAlertsFrom,
          modAlertFilterListRaw: LIST_RAW
        })
      ).toBe(true);
    }
  });

  it('shows an alert whose avatar hash is missing entirely, rather than dropping it', () => {
    // A null hash is not "not selected" by accident — it is unmatchable, and the allow-list
    // branch must not silently swallow the alert on a data problem.
    expect(
      alertPassesFilter({
        avatarHash: null,
        alertFilterFor: { aaaa1111: 'Allison' },
        showAlertsFrom: false,
        modAlertFilterListRaw: LIST_RAW
      })
    ).toBe(true);
  });
});

describe('availability is gated on the ROOM configuring a list', () => {
  it('is unavailable with no list, whitespace-only, or empty', () => {
    expect(alertFilterAvailable(null)).toBe(false);
    expect(alertFilterAvailable('')).toBe(false);
    expect(alertFilterAvailable('   ')).toBe(false);
  });

  it('is available once a list exists', () => {
    expect(alertFilterAvailable(LIST_RAW)).toBe(true);
  });
});

describe('the room setting is a STRING containing JSON', () => {
  it('parses to the entry shape read from selectAll()', () => {
    expect(parseModAlertFilterList(LIST_RAW)).toEqual(TRADERS);
  });

  it('is empty for an absent setting', () => {
    expect(parseModAlertFilterList(null)).toEqual([]);
    expect(parseModAlertFilterList('')).toEqual([]);
  });

  it('THROWS on malformed JSON, because the reference does not catch here', () => {
    /*
      `syncModAlertFilterList()` at byte 1,221,905 is `JSON.parse(...) || []` with NO try/catch,
      unlike the filter guard which has one. That asymmetry is deliberate and reproduced: a
      malformed setting fails when the modal is opened, and the room keeps running. If somebody
      "improves" this by wrapping it, this case goes red and they have to say why.
    */
    expect(() => parseModAlertFilterList('{not json')).toThrow();
  });
});

describe('the title is dynamic, and our shell had it hardcoded', () => {
  /*
    Template byte 1,222,000: two branches selected by `O(5, showAlertsFrom ? 5 : 6)`, then a shared
    suffix. Our shell carried only the false branch AND dropped the trailing space.
  */
  it('renders both branches with the shared suffix', () => {
    expect(alertFilterTitle(true)).toBe('Show alerts from the following: ');
    expect(alertFilterTitle(false)).toBe('Filter out alerts from the following: ');
  });

  it('keeps the trailing space after the colon', () => {
    expect(ALERT_FILTER_TITLE_SUFFIX.endsWith(': ')).toBe(true);
    expect(alertFilterTitle(true).endsWith(': ')).toBe(true);
  });
});

describe('the two confirm strings, verbatim including the uneven spacing', () => {
  it('the empty-selection branch', () => {
    expect(alertFilterConfirm({}, true)).toBe(
      'Are you sure you want to disable "only show alert " filtering?'
    );
    expect(alertFilterConfirm({}, false)).toBe(
      'Are you sure you want to disable "alert" filtering?'
    );
  });

  it('the non-empty branch, whose double space is the reference’s', () => {
    const one: AlertFilterFor = { aaaa1111: 'Allison' };
    expect(alertFilterConfirm(one, true)).toBe(
      'Are you sure you want to only show  alerts from the selected people?'
    );
    expect(alertFilterConfirm(one, false)).toBe(
      'Are you sure you want to filter out  alerts from the selected people?'
    );
  });

  it('the true branch of the empty case renders a double space, the false branch does not', () => {
    // `"only show alert "` carries a trailing space and `"alert"` does not. Tidying either one
    // changes a string a presenter reads.
    expect(alertFilterConfirm({}, true)).toContain('alert " filtering');
    expect(alertFilterConfirm({}, false)).toContain('"alert" filtering');
  });
});

describe('selection handling', () => {
  it('toggle adds when absent and removes when present', () => {
    const once = toggleTrader({}, 'aaaa1111', 'Allison');
    expect(once).toEqual({ aaaa1111: 'Allison' });
    expect(toggleTrader(once, 'aaaa1111', 'Allison')).toEqual({});
  });

  it('toggle does not mutate its input', () => {
    // The caller holds this in `$state`; a mutation would not be observed.
    const before: AlertFilterFor = { aaaa1111: 'Allison' };
    toggleTrader(before, 'bbbb2222', 'Bruce');
    expect(before).toEqual({ aaaa1111: 'Allison' });
  });

  it('selectAll assigns only where absent, keeping an existing value', () => {
    // Byte 1,220,674: `alertFilterFor[e.avatar] || (alertFilterFor[e.avatar] = e.username)`.
    const before: AlertFilterFor = { aaaa1111: 'RENAMED' };
    expect(selectAllTraders(before, TRADERS)).toEqual({
      aaaa1111: 'RENAMED',
      bbbb2222: 'Bruce',
      cccc3333: 'Carol'
    });
  });

  it('unselectAll clears everything', () => {
    expect(unselectAllTraders()).toEqual({});
  });

  it('doFilteredAlerts is true only with a non-empty selection', () => {
    expect(hasActiveAlertFilter({})).toBe(false);
    expect(hasActiveAlertFilter({ aaaa1111: 'Allison' })).toBe(true);
  });
});

describe('the row icon', () => {
  it('is checked and green when selected, and faint when not', () => {
    const selection: AlertFilterFor = { aaaa1111: 'Allison' };
    expect(traderRowIconClass(selection, 'aaaa1111')).toBe('fas me-1 fa-check-square text-success');
    expect(traderRowIconClass(selection, 'bbbb2222')).toBe('fas me-1 fa-square text-opacity');
  });
});
