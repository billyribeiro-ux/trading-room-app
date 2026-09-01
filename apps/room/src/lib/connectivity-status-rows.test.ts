import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CONNECTIVITY_ROWS,
  connectivityGlyph,
  connectivityRowClasses,
  type ConnectivityState
} from './connectivity-status-rows';

/*
  The four connectivity rows were four near-identical blocks in `ModalHost.svelte` until 2026-08-16,
  restating the same two rules four times. They are one loop over this table now.

  The rules were never executed by a test while they were markup — a ternary inside an attribute is
  not reachable without mounting a 6,000-line modal host — so this file is new coverage, not moved
  coverage. That is the second reason the extraction was worth doing, after the line count.
*/

/*
  THE MODAL LEFT `ModalHost.svelte` ON 2026-09-01, whole, for `ConnectivityModal.svelte`.

  `source-size-contract` had NAMED that extraction twice and deferred it twice; the third time the
  host went past its ceiling there was nothing smaller left to extract, so the 809 lines went. This
  file reads the component that holds the markup now — repointed rather than widened to "either
  file", because which component owns the troubleshooter is itself a fact worth failing on.
*/
const MODAL_HOST = readFileSync(
  new URL('./components/ConnectivityModal.svelte', import.meta.url),
  'utf8'
);

describe('the four rows', () => {
  it('are the captured four, in the captured order, with the captured labels', () => {
    expect(CONNECTIVITY_ROWS.map((row) => row.key)).toEqual(['udp', 'tcp', 'stun', 'turn']);
    expect(CONNECTIVITY_ROWS.map((row) => row.label)).toEqual([
      'UDP Enabled',
      'TCP Enabled',
      'STUN Server Connectivity',
      'TURN Server Connectivity'
    ]);
  });

  it('keeps the last row`s wider bottom margin, which is spacing and not a pattern', () => {
    expect(CONNECTIVITY_ROWS.map((row) => row.spacing)).toEqual(['mb-3', 'mb-3', 'mb-3', 'mb-4']);
  });

  it('gives ONLY turn an unconfigured title, because only turn can be unconfigured', () => {
    const withTitle = CONNECTIVITY_ROWS.filter((row) => row.unconfiguredTitle);
    expect(withTitle).toHaveLength(1);
    expect(withTitle[0].key).toBe('turn');
    expect(withTitle[0].unconfiguredTitle).toBe('No TURN relay is configured for this deployment');
  });
});

describe('the glyph', () => {
  it('shows the running marker only while a test is actually running', () => {
    expect(connectivityGlyph('pending', true)).toBe('...');
    expect(connectivityGlyph('pending', false)).toBe('●');
  });

  it('is a tick for passed and a cross for failed, whatever the run state', () => {
    for (const running of [true, false]) {
      expect(connectivityGlyph('passed', running)).toBe('✔');
      expect(connectivityGlyph('failed', running)).toBe('✖');
    }
  });

  it('renders an en dash for unconfigured, NEVER a cross', () => {
    /*
      The distinction the TURN row exists to make. A cross beside "check your network or firewall"
      reads as the viewer's fault; an unconfigured relay is a property of the deployment and there
      is nothing for them to fix. `connectivity-test-contract.test.ts` pins the other half — that
      `testStates.turn` is set to `'unconfigured'` rather than `'failed'` in the first place.
    */
    expect(connectivityGlyph('unconfigured', false)).toBe('–');
    expect(connectivityGlyph('unconfigured', false)).not.toBe('✖');
  });
});

describe('the row classes', () => {
  it.each([
    { state: 'passed', passed: true, failed: false },
    { state: 'failed', passed: false, failed: true },
    { state: 'pending', passed: false, failed: false },
    { state: 'unconfigured', passed: false, failed: false }
  ])('$state', ({ state, passed, failed }) => {
    expect(connectivityRowClasses(state as ConnectivityState)).toEqual({ passed, failed });
  });

  it('leaves an unconfigured row neutral, which is the point of the en dash', () => {
    const classes = connectivityRowClasses('unconfigured');
    expect(classes.passed).toBe(false);
    expect(classes.failed).toBe(false);
  });
});

describe('the modal renders the table rather than four copies', () => {
  it('loops over the rows and calls both helpers', () => {
    /*
      Positive-first, and against the file that now owns the markup. Without these the module could
      be correct and unused — which is the failure mode `remote-call-sites-contract` exists for, and
      the one an extraction is most likely to introduce.
    */
    expect(MODAL_HOST).toContain('{#each CONNECTIVITY_ROWS as row (row.key)}');
    expect(MODAL_HOST).toContain('connectivityRowClasses(state)');
    expect(MODAL_HOST).toContain('connectivityGlyph(state, isTestRunning)');
  });

  it('no longer restates the pass/fail rule per row', () => {
    // The four copies this extraction removed. One is the module's; none should be in the markup.
    expect(MODAL_HOST).not.toContain("{ passed: testStates.udp === 'passed'");
    expect(MODAL_HOST).not.toContain("{ passed: testStates.turn === 'passed'");
  });
});
