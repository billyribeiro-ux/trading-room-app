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

describe('alerts toolbar: two states, two controls', () => {
  it('has both captured flags', () => {
    // The per-component file is prettified, so the minified `=!1` carries spaces here.
    expect(component).toContain('this.showAlertsToolbar = !1');
    expect(component).toContain('this.showAlertsToolbarExtended = !1');
    expect(markup).toContain('let alertsToolbarOpen = $state(false)');
    expect(markup).toContain('let alertsToolbarExtended = $state(false)');
  });

  it('wires the magnifier to search-only and the gear to the full toolbar', () => {
    expect(component).toContain('toggleAlertsToolbarSearchOnly()');
    expect(component).toContain('toggleAlertsToolbar()');

    expect(markup).toContain('function toggleAlertsToolbarSearchOnly()');
    expect(markup).toContain('function toggleAlertsToolbar()');

    // The magnifier (title="Search") must call the search-only toggle…
    const magnifier = markup.slice(markup.indexOf('title="Search"'));
    expect(magnifier.slice(0, 300)).toContain('toggleAlertsToolbarSearchOnly');

    // …and the gear must expand the toolbar, NOT open the alert-filter modal.
    const gear = markup.slice(markup.indexOf('nav-link dropdown-toggle p-0'));
    expect(gear.slice(0, 300)).toContain('toggleAlertsToolbar');
    expect(gear.slice(0, 300)).not.toContain("openModal('alert-filter')");
  });

  it('keeps the gear expanding rather than closing a search-only strip', () => {
    // `showAlertsToolbar && !showAlertsToolbarExtended ? extended = true : toggle(...)`
    const body = markup.slice(
      markup.indexOf('function toggleAlertsToolbar()'),
      markup.indexOf('function toggleAlertsToolbarSearchOnly()')
    );
    expect(body).toMatch(/if \(alertsToolbarOpen && !alertsToolbarExtended\)/);
    expect(body).toContain('alertsToolbarExtended = true');
  });

  it('always ends search-only with the extended regions hidden', () => {
    const body = markup.slice(markup.indexOf('function toggleAlertsToolbarSearchOnly()'));
    expect(body.slice(0, 600)).toContain('alertsToolbarExtended = false');
  });
});

describe('alerts toolbar: what each state renders', () => {
  it('gates the top row on the extended flag', () => {
    // `O(1, e.showAlertsToolbarExtended ? 1 : -1)` in N2e.
    expect(helpers).toContain('showAlertsToolbarExtended');
    expect(markup).toContain('{#if alertsToolbarExtended}');
  });

  it('keeps the search input and its clear button in BOTH states', () => {
    // The form and const 33 are unconditional in N2e - only the tail is gated.
    const toolbar = markup.slice(markup.indexOf('alertsToolbar'));
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
    const tail = markup.slice(markup.indexOf('id="addon-chat-clear"'));
    const gate = tail.indexOf('{#if alertsToolbarExtended}');
    const save = tail.indexOf('id="addon-chat-save"');
    const presenterGate = tail.indexOf('{#if isPresenter}');
    const archive = tail.indexOf('id="addon-chat-messages-archive"');

    expect(gate).toBeGreaterThan(-1);
    expect(save).toBeGreaterThan(gate);
    expect(presenterGate).toBeGreaterThan(save);
    expect(archive).toBeGreaterThan(presenterGate);
  });

  it('fills the right-hand div with the Advanced Search link, and only that one', () => {
    // The capture declares two buttons for this slot, const 38/44 (#alert-filter-modal, gated on
    // `sessData.modAlertFilterList`) and const 39 (#alerts-advanced-search-modal).
    expect(component).toContain('alert-filter-modal');
    expect(component).toContain('alerts-advanced-search-modal');

    expect(markup).toContain('data-bs-target="#alerts-advanced-search-modal"');
    expect(markup).toContain('fas fa-search me-1');
    expect(markup).toContain('btn btn-outline-light btn-sm m-1');

    // Alert Filter is deliberately NOT here: it never rendered in either captured state of this
    // toolbar, and putting both buttons in the slot wrapped them onto a second row - a layout the
    // capture never produces. Its modal keeps a separate entry point (const 8/21, the
    // `badge.filtered-text` in the alerts header), which is recorded as open work.
    const row = markup.slice(markup.indexOf('{#if alertsToolbarExtended}'));
    const slotEnd = row.indexOf('id="alert-settings"');
    expect(row.slice(0, slotEnd)).not.toContain('data-bs-target="#alert-filter-modal"');
  });

  it('gates the inline-alert-entry checkbox on presenter and Detach on chat-only mode', () => {
    // `O(2, e.isPresenter ? 2 : -1)` and `O(3, chatOnlyMode ? -1 : 3)` in R2e.
    const row = markup.slice(markup.indexOf('{#if alertsToolbarExtended}'));
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
