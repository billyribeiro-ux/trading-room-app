/**
 * The four rows of the connectivity test's results list, and the two rules that drive their look.
 *
 * ## Why this module exists
 *
 * It was written to pay for growth, and that is worth stating plainly rather than dressing up.
 * Phase 4 converted 160 `class:` directives to the clsx attribute form that `svelte/best-practices`
 * asks for. Across the repository that is a NET SAVING — every component shrank except one.
 * `ModalHost.svelte` grew 55 lines, because its tags carry the densest multi-condition classes and
 * a two-condition object wraps onto more lines than the two directives it replaces.
 *
 * `source-size-contract.test.ts` caps that file, and its rule is that ceilings only ever go DOWN:
 * *"If you find yourself raising one, that is the conversation this file exists to force - not a
 * number to edit."* So the growth is paid for the way the previous four rounds were paid for, with
 * a real extraction rather than a bigger number.
 *
 * ## What was actually wrong, which the conversion exposed
 *
 * The four rows were four near-identical 22-line blocks. They stated ONE rule four times — a row is
 * `passed` when its state is `'passed'` and `failed` when its state is `'failed'` — and one glyph
 * rule four times. Four copies is four chances to drift, and the TURN row had ALREADY drifted, in a
 * way that is correct and deliberate: it renders `–` for `unconfigured` where the other three have
 * no such branch. That distinction is the whole point of `unconfigured` (a cross beside "check your
 * network or firewall" reads as the user's fault; this deployment simply has no relay set), and
 * keeping it while removing the duplication is what the table below does.
 */

/** The states a single connectivity check can be in, as `ModalHost` assigns them. */
export type ConnectivityState = 'pending' | 'passed' | 'failed' | 'unconfigured';

/** The four checks, in the order the modal lists them. */
export type ConnectivityKey = 'udp' | 'tcp' | 'stun' | 'turn';

export interface ConnectivityRow {
  key: ConnectivityKey;
  label: string;
  /** The last row carries `mb-4`; the three above it `mb-3`. Captured spacing, not a pattern. */
  spacing: 'mb-3' | 'mb-4';
  /**
   * Only TURN has one, and only while unconfigured. Held here rather than as an `{#if key === …}`
   * in the markup so the exception is data with a reason beside it, not a special case in a loop.
   */
  unconfiguredTitle?: string;
}

export const CONNECTIVITY_ROWS: readonly ConnectivityRow[] = [
  { key: 'udp', label: 'UDP Enabled', spacing: 'mb-3' },
  { key: 'tcp', label: 'TCP Enabled', spacing: 'mb-3' },
  { key: 'stun', label: 'STUN Server Connectivity', spacing: 'mb-3' },
  {
    key: 'turn',
    label: 'TURN Server Connectivity',
    spacing: 'mb-4',
    unconfiguredTitle: 'No TURN relay is configured for this deployment'
  }
];

/**
 * The glyph a row shows.
 *
 * `isTestRunning` only changes the PENDING glyph: a run in progress shows `...`, and a check that
 * has not been run yet shows `●`. Every other state ignores it.
 */
export function connectivityGlyph(state: ConnectivityState, isTestRunning: boolean): string {
  if (state === 'pending') return isTestRunning ? '...' : '●';
  if (state === 'passed') return '✔';
  /*
    `–` and NOT `✖`. An unconfigured relay is a property of the deployment, not a fault the viewer
    can act on, and the message beside this list tells them to check their network or firewall.
  */
  if (state === 'unconfigured') return '–';
  return '✖';
}

/**
 * The row's own status classes — `KB`-shaped, the same as every other conditional class in the room:
 * an object whose truthy keys are added.
 *
 * `unconfigured` deliberately maps to NEITHER. It is not a pass and it is not a failure, so the row
 * keeps its neutral styling, which is what the captured `–` is there to say.
 */
export function connectivityRowClasses(state: ConnectivityState) {
  return { passed: state === 'passed', failed: state === 'failed' };
}
