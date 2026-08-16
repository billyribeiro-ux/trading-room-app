import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The alerts toolbar has TWO states, driven by TWO separate controls.

  `app-alerts` carries `showAlertsToolbar` AND `showAlertsToolbarExtended`, and wires the magnifier
  and the gear to different methods:

    d(11,'li',12), x('click', () => o.toggleAlertsToolbarSearchOnly())   // const 14 = fa-search
    d(14,'li',15), x('click', () => o.toggleAlertsToolbar())             // const 17 = fa-cog

  This room had a single flag: the magnifier opened the whole strip and the gear opened the
  alert-filter modal instead of expanding the toolbar. The consequence was not cosmetic - the
  right-hand div of the top row holds the only two links to `#alert-filter-modal` and
  `#alerts-advanced-search-modal`, both of which are fully built in `ModalHost.svelte` and were
  unreachable.
*/

const component = readFileSync(
  new URL('../../docs/source/components/app-alerts.compiled.js', import.meta.url),
  'utf8'
);
const helpers = readFileSync(
  new URL('../../docs/source/components/app-alerts.render-helpers.js', import.meta.url),
  'utf8'
);
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const markup = stripComments(page);
/*
  The toolbar's MARKUP moved to `AlertChatArea.svelte` on 2026-08-15 while the two togglers stayed
  on the page, so this file now reads three of ours instead of two — and each assertion below points
  at whichever one owns its subject. A single re-pointed constant would have been the wrong fix:
  half of these assert on a template gate and half on the function behind it, and pointing both at
  the pane would have quietly dropped the page's half of every pair.
*/
const paneMarkup = stripComments(
  readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8')
);
/*
  The two toolbar flags and the two togglers moved to `room/alerts.svelte.ts` on 2026-08-15. The
  assertions against the CAPTURE — everything read out of `docs/source/**` — are untouched, because
  the evidence did not move; only our half of each pair did.
*/
const alertsClass = stripComments(
  readFileSync(new URL('./room/alerts.svelte.ts', import.meta.url), 'utf8')
);

describe('alerts toolbar: two states, two controls', () => {
  it('has both captured flags', () => {
    // The per-component file is prettified, so the minified `=!1` carries spaces here.
    expect(component).toContain('this.showAlertsToolbar = !1');
    expect(component).toContain('this.showAlertsToolbarExtended = !1');
    expect(alertsClass).toContain('#toolbarOpen = $state(false);');
    expect(alertsClass).toContain('#toolbarExtended = $state(false);');
  });

  it('wires the magnifier to search-only and the gear to the full toolbar', () => {
    expect(component).toContain('toggleAlertsToolbarSearchOnly()');
    expect(component).toContain('toggleAlertsToolbar()');

    expect(markup).toContain('function toggleAlertsToolbarSearchOnly()');
    expect(markup).toContain('function toggleAlertsToolbar()');

    // The magnifier (title="Search") must call the search-only toggle…
    const magnifier = paneMarkup.slice(paneMarkup.indexOf('title="Search"'));
    expect(magnifier.slice(0, 300)).toContain('ontogglealertssearch');

    // …and the gear must expand the toolbar, NOT open the alert-filter modal.
    const gear = paneMarkup.slice(paneMarkup.indexOf('nav-link dropdown-toggle p-0'));
    expect(gear.slice(0, 300)).toContain('ontogglealertstoolbar');
    expect(gear.slice(0, 300)).not.toContain("onopenmodal('alert-filter')");

    /*
      The two are now in two files, so the WIRING is its own assertion. Without it both halves above
      could pass while the pane's callbacks arrived from nothing — the magnifier calling a prop the
      page never supplies is exactly the failure a source-text contract is blind to otherwise.
    */
    expect(markup).toContain('ontogglealertssearch={toggleAlertsToolbarSearchOnly}');
    expect(markup).toContain('ontogglealertstoolbar={toggleAlertsToolbar}');
  });

  it('keeps the gear expanding rather than closing a search-only strip', () => {
    // `showAlertsToolbar && !showAlertsToolbarExtended ? extended = true : toggle(...)`
    const body = alertsClass.slice(
      alertsClass.indexOf('toggleToolbar(): void {'),
      alertsClass.indexOf('toggleSearchOnly(): boolean {')
    );
    expect(body, 'the toggler must still be findable').not.toBe('');
    expect(body).toMatch(/if \(this\.#toolbarOpen && !this\.#toolbarExtended\)/);
    expect(body).toContain('this.#toolbarExtended = true;');
  });

  it('always ends search-only with the extended regions hidden', () => {
    const body = alertsClass.slice(alertsClass.indexOf('toggleSearchOnly(): boolean {'));
    expect(body.slice(0, 600)).toContain('this.#toolbarExtended = false;');
  });
});

describe('alerts toolbar: what each state renders', () => {
  it('gates the top row on the extended flag', () => {
    // `O(1, e.showAlertsToolbarExtended ? 1 : -1)` in N2e.
    expect(helpers).toContain('showAlertsToolbarExtended');
    expect(paneMarkup).toContain('{#if alerts.toolbarExtended}');
  });

  it('keeps the search input and its clear button in BOTH states', () => {
    // The form and const 33 are unconditional in N2e - only the tail is gated.
    const toolbar = paneMarkup.slice(paneMarkup.indexOf('alertsToolbar'));
    const form = toolbar.indexOf('id="alert-settings"');
    const clear = toolbar.indexOf('id="addon-chat-clear"');
    const gatedTail = toolbar.indexOf('id="addon-chat-save"');
    expect(form).toBeGreaterThan(-1);
    expect(clear).toBeGreaterThan(form);
    // Save comes after clear and is behind the gate.
    expect(gatedTail).toBeGreaterThan(clear);
  });

  it('gates save and archive on extended, and archive again on presenter', () => {
    // O2e renders const 47 (save); inside it I2e is gated on isPresenter && !isLimitedPresenter.
    expect(helpers).toContain('isPresenter');
    const tail = paneMarkup.slice(paneMarkup.indexOf('id="addon-chat-clear"'));
    const gate = tail.indexOf('{#if alerts.toolbarExtended}');
    const save = tail.indexOf('id="addon-chat-save"');
    const presenterGate = tail.indexOf('{#if isPresenter}');
    const archive = tail.indexOf('id="addon-chat-messages-archive"');

    expect(gate).toBeGreaterThan(-1);
    expect(save).toBeGreaterThan(gate);
    expect(presenterGate).toBeGreaterThan(save);
    expect(archive).toBeGreaterThan(presenterGate);
  });

  it('fills the right-hand div with Filter alerts and Advanced Search, in that order', () => {
    // The capture declares two buttons for this slot, const 38/44 (#alert-filter-modal, gated on
    // `sessData.modAlertFilterList`) and const 39 (#alerts-advanced-search-modal).
    expect(component).toContain('alert-filter-modal');
    expect(component).toContain('alerts-advanced-search-modal');

    expect(paneMarkup).toContain('data-bs-target="#alerts-advanced-search-modal"');
    expect(paneMarkup).toContain('fas fa-search me-1');
    expect(paneMarkup).toContain('btn btn-outline-light btn-sm m-1');
    // Const 45, the Filter alerts icon.
    expect(paneMarkup).toContain('fas fa-filter me-1');

    const row = paneMarkup.slice(paneMarkup.indexOf('{#if alerts.toolbarExtended}'));
    const slot = row.slice(0, row.indexOf('id="alert-settings"'));

    /*
      THE GATE IS THE WHOLE CONTRACT HERE, and this assertion replaced one that said the opposite.

      Alert Filter never rendered in either captured state of this toolbar, and the earlier reading
      of that was "leave the button out" - which put a real divergence in the room, because what
      the captures actually show is a room with no `modAlertFilterList`. That is precisely the case
      `alertFilterConfigured` is false in, so the gated button reproduces both captures exactly and
      the ungated omission did not.

      What must never come back is the button WITHOUT the gate: unconditional, it wraps the slot
      onto a second row, a layout neither capture produces. So the gate is asserted to sit between
      the row and the button rather than merely to exist somewhere in the file.
    */
    const gate = slot.indexOf('{#if alertFilterConfigured}');
    const filterButton = slot.indexOf('data-bs-target="#alert-filter-modal"');
    const advancedSearch = slot.indexOf('data-bs-target="#alerts-advanced-search-modal"');

    expect(gate).toBeGreaterThan(-1);
    expect(filterButton).toBeGreaterThan(gate);
    // `H(5, N2e, …, "button", 38)` precedes `H(6, L2e, …, "button", 39)`.
    expect(advancedSearch).toBeGreaterThan(filterButton);
  });

  it('puts the filtered badge in the alerts header, behind the conjunction gate', () => {
    /*
      `M2e`, const 21, and its gate at byte 2,056,460 of the v4 bundle:

        O(6, sessData.modAlertFilterList && doFilteredAlerts ? 6 : -1)

      TWO conditions, not one. A room that configured a list but whose reader has selected nobody
      shows the toolbar button and NO badge — collapsing this to `alertFilterConfigured` would put
      a permanent "filtered" badge on every such room, and collapsing it to the selection alone
      would show it where the feature is switched off.
    */
    const header = paneMarkup.slice(paneMarkup.indexOf('alertHeader'));
    const brandEnd = header.indexOf('</ul>');
    const brand = header.slice(0, brandEnd);

    expect(brand).toContain('{#if alertFilterActive}');
    expect(brand).toContain('badge badge-danger ms-1 filtered-text');
    expect(brand).toContain('title="Alert Filter"');

    // Capture order inside the brand: H(6, M2e) "filtered" precedes H(7, A2e) "DND".
    expect(brand.indexOf('{#if alertFilterActive}')).toBeLessThan(
      brand.indexOf('{#if doNotDisturbOn}')
    );

    // The conjunction lives in the derived rather than the template, so assert it there.
    expect(markup).toContain(
      'const alertFilterActive = $derived(alertFilterConfigured && alerts.filterSelected)'
    );
    // The viewer half of the conjunction is the class's; the room half is session config and stays.
    expect(alertsClass).toContain('return hasActiveAlertFilter(this.#filterFor);');
  });

  it('gates the inline-alert-entry checkbox on presenter and Detach on chat-only mode', () => {
    // `O(2, e.isPresenter ? 2 : -1)` and `O(3, chatOnlyMode ? -1 : 3)` in R2e.
    const row = paneMarkup.slice(paneMarkup.indexOf('{#if alerts.toolbarExtended}'));
    const presenter = row.indexOf('{#if isPresenter}');
    const checkbox = row.indexOf('id="inline-alert-entry"');
    const notChatOnly = row.indexOf('{#if !chatOnlyMode}');
    const detach = row.indexOf('Detach Alerts');

    expect(presenter).toBeGreaterThan(-1);
    expect(checkbox).toBeGreaterThan(presenter);
    expect(notChatOnly).toBeGreaterThan(-1);
    expect(detach).toBeGreaterThan(notChatOnly);
  });
});
