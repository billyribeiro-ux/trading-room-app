/**
 * The Bootstrap label class for a Stripe subscription status.
 *
 * This is the reference's `getStripeStatusClass(status)`, read out of its bundle at
 * `app.min.js` offset 183507 and transcribed in
 * `docs/reference/evidence-dumps-full-read.md:1363`. The bundle itself is not committed — the
 * `TIER1-fetched/README.md` carries its URL, byte count and SHA-256 so the read is reproducible.
 *
 * It is a straight port. Every mapping below is the reference's, including the ones I would not
 * have chosen:
 *
 * - `paused` is a WARNING, not a danger, even though a paused subscription collects no money.
 * - `incomplete_expired` is a danger while a bare `incomplete` is too — the reference does not
 *   distinguish "not finished yet" from "will never finish".
 * - Anything unrecognised is `label-info`, a BLUE badge. Stripe adds statuses over time, so an
 *   unknown value is more likely a new Stripe status than a corrupt row, and blue says "something
 *   is here that this code predates" rather than asserting health or failure. That is the right
 *   default and it is worth keeping.
 *
 * The one thing NOT ported is the reference's `formatStripeAmount`, whose unconditional divide-by-
 * 100 renders every zero-decimal currency a hundredfold low. Use `formatMoney` from `#lib/money.js`;
 * `money.test.ts` holds the reference implementation as a negative control.
 */

/** The Bootstrap 3 contextual label classes this can return. Deny-by-default: nothing else. */
export type StripeStatusClass = 'label-default' | 'label-success' | 'label-warning' | 'label-danger' | 'label-info';

/*
  Frozen sets rather than a switch, so the membership is data and reads as a table. The comparison
  is `String(status).toLowerCase()` in the reference, hence lower-case keys and the normalisation
  below — a status arriving as `"Active"` from a differently-cased Stripe payload must not fall
  through to `label-info`.
*/
const SUCCESS = new Set(['active', 'trialing']);
const WARNING = new Set(['past_due', 'paused']);
const DANGER = new Set(['canceled', 'unpaid', 'incomplete', 'incomplete_expired']);

export function stripeStatusClass(status: string | null | undefined): StripeStatusClass {
  /*
    Falsy is `label-default`, matching the reference's leading `!status` test. This covers null,
    undefined AND the empty string — a member with a Stripe record but no status yet is grey, not
    blue, because grey means "no information" and blue means "information this code does not
    recognise". Those are different facts and the reference is right to separate them.
  */
  if (!status) return 'label-default';

  const normalised = String(status).toLowerCase();
  if (SUCCESS.has(normalised)) return 'label-success';
  if (WARNING.has(normalised)) return 'label-warning';
  if (DANGER.has(normalised)) return 'label-danger';
  return 'label-info';
}
