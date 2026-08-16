import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CAPTURED_TRADERS,
  canSearch,
  checkInputs,
  clearInput,
  emptySearch,
  filterAlerts,
  selectedLabel,
  toggleKey,
  SYNC_ROOMS_CONFIRM,
  type SearchableAlert
} from './alerts-advanced-search';

/*
  `#alerts-advanced-search-modal` must match the captured component, not the captured DOM.

  This distinction is the whole point of the file. `app-room/complete.clean.html` holds a rendered
  capture of this modal, and the shell in `ModalHost.svelte` reproduced it faithfully - but that
  session only ever rendered the EMPTY state, so every branch the component gates behind state was
  absent: the selected-trader label, the check marks, "Unselect All", the loading spinner, the
  results list and the Clear button. All of them are in the shipped template functions.

  So the assertions below read `docs/source/components/app-alerts-advanced-search.render-helpers.js`
  and `.compiled.js`, which are served whole to every visitor regardless of role.
*/

const helpers = readFileSync(
  new URL(
    '../../docs/source/components/app-alerts-advanced-search.render-helpers.js',
    import.meta.url
  ),
  'utf8'
);
const component = readFileSync(
  new URL('../../docs/source/components/app-alerts-advanced-search.compiled.js', import.meta.url),
  'utf8'
);
const modalHost = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The alerts toolbar moved to `AlertChatArea.svelte` on 2026-08-15, so the BUTTON is read there and
  the WIRING is read from the page. Two constants rather than one re-pointed constant, because the
  two halves are now two files and a single source would let either half rot unnoticed.
*/
const pane = readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8');
const alertsComponent = readFileSync(
  new URL('../../docs/source/components/app-alerts.compiled.js', import.meta.url),
  'utf8'
);

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const hostMarkup = stripComments(modalHost);
const pageMarkup = stripComments(page);
const paneMarkup = stripComments(pane);

describe('alerts advanced search: reachability', () => {
  it('is opened from the alerts toolbar, as the capture opens it', () => {
    // app-alerts renders the button that targets this modal.
    expect(alertsComponent).toContain('alerts-advanced-search-modal');

    // Before this change `name === 'advanced-search'` was the ONLY occurrence of that modal name
    // in the repository, so the modal could never be shown. The opener is what fixes that.
    expect(paneMarkup).toContain('data-bs-target="#alerts-advanced-search-modal"');
    expect(paneMarkup).toContain("onopenmodal('advanced-search')");
    expect(paneMarkup).toContain('Advanced Search');

    // …and the page is what hands the pane the real opener. Without this line the assertion above
    // would pass against a component whose callback nothing supplies.
    expect(pageMarkup).toContain('onopenmodal={openModal}');
  });

  it('keeps the captured button classes and icon', () => {
    expect(paneMarkup).toContain('btn btn-outline-light btn-sm m-1');
    expect(paneMarkup).toContain('fas fa-search me-1');
  });
});

describe('alerts advanced search: the branches no DOM capture rendered', () => {
  it('renders the selected-trader and selected-room labels', () => {
    // `jMe` / `GMe` - span.selected-traders-str replaces the "--Select…--" placeholder.
    expect(helpers).toContain("d(0, 'span', 12)");
    expect(helpers).toContain("d(0, 'span', 16)");
    expect(hostMarkup).toContain('class="selected-traders-str"');
    expect(hostMarkup).toContain('class="selected-rooms-str"');
    expect(hostMarkup).toContain('--Select Traders--');
    expect(hostMarkup).toContain('--Select Rooms--');
  });

  it('renders the check mark on a selected entry', () => {
    // `HMe` / `qMe` emit const 37, which the const table gives as `icon fas fa-check-square`.
    expect(component).toContain('fa-check-square');
    expect(hostMarkup).toContain('fa-check-square');
  });

  it('renders the Unselect All control behind the same gate as the label', () => {
    // `zMe` / `YMe`: an <hr class="dropdown-divider"> then a btn-warning with fa-minus-square.
    expect(helpers).toContain("' Unselect All '");
    expect(component).toContain('fa-minus-square');
    expect(hostMarkup).toContain('Unselect All');
    expect(hostMarkup).toContain('dropdown-divider');
    expect(hostMarkup).toContain('btn btn-warning btn-sm mx-1');
  });

  it('renders the loading state', () => {
    // `QMe`: div.text-center.my-4 > h5 > i.ml-2.fas.fa-spinner.fa-spin + " Loading..."
    expect(helpers).toContain("v(3, ' Loading...')");
    expect(hostMarkup).toContain('ml-2 fas fa-spinner fa-spin');
  });

  it('renders the results block, not only the empty state', () => {
    // `ZMe`: "Found: N alert" + a conditional 's' + ". ", then div.log-messages.
    expect(helpers).toContain("' Found: '");
    expect(helpers).toContain("d(4, 'div', 44)");
    expect(hostMarkup).toContain('Found:');
    expect(hostMarkup).toContain('class="log-messages"');

    // …and still keeps the empty state the DOM capture showed.
    expect(helpers).toContain("' No logs to display. Please, change the input fields. '");
    expect(hostMarkup).toContain('No logs to display. Please, change the input fields.');
  });

  it('renders the Clear button behind checkInputs()', () => {
    // `nAe`: button const 48 (btn btn-danger m-2) with `fa fa-trash me-1` and the label " Clear ".
    expect(helpers).toContain("v(2, ' Clear ')");
    expect(hostMarkup).toContain('btn btn-danger m-2');
    expect(hostMarkup).toContain('fa fa-trash me-1');
  });

  it('binds every input the capture binds', () => {
    for (const field of ['txt', 'nonTradeAlert', 'isArchived', 'startDate', 'endDate']) {
      expect(component, `search.${field} is bound in the capture`).toContain(`search.${field}`);
      expect(hostMarkup, `search.${field} must be bound here`).toContain(`advancedSearch.${field}`);
    }
  });

  it('quotes the sync-rooms confirmation verbatim', () => {
    expect(component).toContain(SYNC_ROOMS_CONFIRM);
    expect(hostMarkup).toContain('SYNC_ROOMS_CONFIRM');
  });
});

describe('alerts advanced search: the model', () => {
  it('carries the captured trader table in order', () => {
    // Placeholders by the owner's direction, but while they are here they must match the capture.
    expect(CAPTURED_TRADERS).toHaveLength(20);
    expect(CAPTURED_TRADERS[0]).toEqual({
      username: 'Allison',
      avatar: 'c90b7e877c17de66ff99477ffa260e5f'
    });
    expect(CAPTURED_TRADERS.at(-1)).toEqual({
      username: 'CML Alert Bot',
      avatar: '3216c53b52f2d36b6a539931685b442e'
    });
    for (const trader of CAPTURED_TRADERS) {
      expect(component, `${trader.username} should be in the captured table`).toContain(
        trader.avatar
      );
    }
  });

  it('toggles rather than sets, and joins the label with ", "', () => {
    let traders = toggleKey({}, 'a', 'Allison');
    expect(traders).toEqual({ a: 'Allison' });
    traders = toggleKey(traders, 'b', 'Henry');
    expect(selectedLabel(traders)).toBe('Allison, Henry');
    // Same key again removes it - `this.search.traders[e] ? delete … : …`
    traders = toggleKey(traders, 'a', 'Allison');
    expect(traders).toEqual({ b: 'Henry' });
    expect(selectedLabel({})).toBe('');
  });

  it('separates checkInputs() from the searchAlerts() guard, as the capture does', () => {
    const traderOnly = { ...emptySearch(), traders: { a: 'Allison' } };
    // A trader-only search RUNS…
    expect(canSearch(traderOnly)).toBe(true);
    // …but does not light up the Clear button, because checkInputs() ignores traders entirely.
    expect(checkInputs(traderOnly, 0)).toBe(false);

    // Results alone keep Clear available even with every field empty.
    expect(checkInputs(emptySearch(), 3)).toBe(true);
    expect(canSearch(emptySearch())).toBe(false);
  });

  it('clears every field', () => {
    const dirty = {
      ...emptySearch(),
      txt: 'AAPL',
      nonTradeAlert: true,
      isArchived: true,
      traders: { a: 'Allison' }
    };
    expect(clearInput()).toEqual(emptySearch());
    expect(canSearch(clearInput())).toBe(false);
    expect(dirty.txt).toBe('AAPL'); // clearInput returns a new object rather than mutating
  });

  it('filters real alerts and never invents one', () => {
    const alerts: SearchableAlert[] = [
      {
        id: 1,
        body: 'Buying 100 shares of AAPL',
        nonTrade: false,
        createdAt: new Date('2026-08-01T12:00:00Z'),
        senderEmailHash: 'hash-a'
      },
      {
        id: 2,
        body: 'Room is closed tomorrow',
        nonTrade: true,
        createdAt: new Date('2026-08-03T12:00:00Z'),
        senderEmailHash: 'hash-b'
      }
    ];

    expect(filterAlerts(alerts, { ...emptySearch(), txt: 'aapl' }).map((a) => a.id)).toEqual([1]);
    expect(
      filterAlerts(alerts, { ...emptySearch(), nonTradeAlert: true }).map((a) => a.id)
    ).toEqual([2]);
    expect(
      filterAlerts(alerts, { ...emptySearch(), traders: { 'hash-b': 'B' } }).map((a) => a.id)
    ).toEqual([2]);
    // A trader with no alerts here returns nothing rather than something.
    expect(filterAlerts(alerts, { ...emptySearch(), traders: { nobody: 'Nobody' } })).toEqual([]);
    // An empty search returns everything, matching `searchAlerts`' room fallback.
    expect(filterAlerts(alerts, emptySearch())).toHaveLength(2);
  });
});
