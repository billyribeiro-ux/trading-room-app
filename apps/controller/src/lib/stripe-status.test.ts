import { describe, expect, it } from 'vitest';
import { stripeStatusClass } from './stripe-status';

/**
 * The reference's own `getStripeStatusClass`, transcribed from the shape recorded at
 * `docs/reference/evidence-dumps-full-read.md:1363` (app.min.js @183507), as a NEGATIVE CONTROL.
 * Ours must agree with it on every status Stripe defines — this is a port, not an improvement, and
 * a test that only checked our own table would pass just as happily if the table were invented.
 */
function referenceGetStripeStatusClass(status: unknown): string {
  if (!status) return 'label-default';
  const s = ('' + status).toLowerCase();
  if (s === 'active' || s === 'trialing') return 'label-success';
  if (s === 'past_due' || s === 'paused') return 'label-warning';
  if (s === 'canceled' || s === 'unpaid' || s === 'incomplete' || s === 'incomplete_expired') return 'label-danger';
  return 'label-info';
}

/** Every subscription status Stripe currently documents. */
const STRIPE_STATUSES = [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid'
];

describe('stripeStatusClass', () => {
  it('agrees with the reference on every documented Stripe status', () => {
    for (const s of STRIPE_STATUSES) {
      expect(stripeStatusClass(s), s).toBe(referenceGetStripeStatusClass(s));
    }
  });

  it('maps each status to the class the evidence records', () => {
    /* Spelled out as well as diffed: if the negative control above were ever mis-transcribed, both
       it and our table would have to be wrong in the same way to get past this. */
    expect(stripeStatusClass('active')).toBe('label-success');
    expect(stripeStatusClass('trialing')).toBe('label-success');
    expect(stripeStatusClass('past_due')).toBe('label-warning');
    expect(stripeStatusClass('paused')).toBe('label-warning');
    expect(stripeStatusClass('canceled')).toBe('label-danger');
    expect(stripeStatusClass('unpaid')).toBe('label-danger');
    expect(stripeStatusClass('incomplete')).toBe('label-danger');
    expect(stripeStatusClass('incomplete_expired')).toBe('label-danger');
  });

  it('is grey for absent status — null, undefined and empty alike', () => {
    expect(stripeStatusClass(null)).toBe('label-default');
    expect(stripeStatusClass(undefined)).toBe('label-default');
    expect(stripeStatusClass('')).toBe('label-default');
  });

  it('is blue for a status this code predates, rather than guessing health or failure', () => {
    expect(stripeStatusClass('some_future_stripe_status')).toBe('label-info');
    expect(stripeStatusClass('active_but_weird')).toBe('label-info');
  });

  it('is case-insensitive, because the comparison is on a lower-cased copy', () => {
    expect(stripeStatusClass('ACTIVE')).toBe('label-success');
    expect(stripeStatusClass('Past_Due')).toBe('label-warning');
    expect(stripeStatusClass('Canceled')).toBe('label-danger');
  });

  it('never returns a class outside the five Bootstrap 3 contextual labels', () => {
    const allowed = new Set(['label-default', 'label-success', 'label-warning', 'label-danger', 'label-info']);
    for (const s of [...STRIPE_STATUSES, '', 'nonsense', 'ACTIVE']) {
      expect(allowed.has(stripeStatusClass(s)), s).toBe(true);
    }
  });
});
