/**
 * The eleven member columns the reference's user row reads and ours did not have.
 *
 * ## Why one migration and not four
 *
 * These arrived together, from one measurement. Every `user.*` reference in the reference's own
 * uncompiled template — `evidence-dumps/TIER1-fetched/views/page.manageSession.html:346-603` — was
 * diffed against this schema on 2026-08-13: **39 fields referenced, 24 already present, 15 absent.**
 * Two of the fifteen (`fcmTokens`, `fcmUnreged`) appear only inside a commented-out block in the
 * reference, so thirteen looked real.

 * **Eleven are.** That first count came from a STRING diff, and two of the thirteen already existed
 * under our own names: the reference's `user.pw` is our `has_password`, and its
 * `user.restrictPMUser` is our `restrict_pm_user` (differing only in case). A name diff cannot see
 * a rename. Both were dropped from this migration before it shipped — `IF NOT EXISTS` would have
 * made them harmless no-ops, but a migration that lists columns it does not create is a migration
 * that lies about what the schema gained.
 *
 * Doing them one at a time as each rendered control was noticed would have meant three or four
 * forward-only migrations for a single change. Migrations cannot be edited once shipped — that is
 * what happened permanently to the legacy local database here — so the shape has to be right the
 * first time, and the way to get it right is to measure the whole surface before writing any of it.
 *
 * ## What was actually wrong, and how the DOM capture hid it
 *
 * Four icons in our user row were hardcoded `hidden`, under a comment reasoning that the capture
 * showed `ng-show="false"` and that this was "a literal, not an expression over data". The template
 * shows all four INTERPOLATE:
 *
 *     ng-show="{{sess.fileAccessCaseByCase && user.hasFileAccess}}"
 *     ng-show="{{sess.ptrMobileAppCaseByCaseEnabled && user.hasMobileApp}}"
 *     ng-show="{{!sess.ptrMobileAppCaseByCaseEnabled && user.alerterAppTokens.length >0}}"
 *     ng-show="{{!sess.ptrMobileAppCaseByCaseEnabled && user.alerterAppFCMUserOff}}"
 *
 * `{{expr}}` evaluated to the *string* `false` because the captured room had both case-by-case
 * settings off and zero users loaded. A conditional that happens to be false is indistinguishable
 * in a render from markup that is always false. Only the source separates them, which is the whole
 * argument for reading templates rather than captures.
 *
 * ## Column choices
 *
 * **Booleans are NOT NULL DEFAULT FALSE.** Every existing member predates these features, and
 * "false" is exactly what that means for all of them — no permission granted, no app paired, no
 * notifications disabled. A nullable boolean would force `?? false` at every read for a state that
 * cannot occur, which `0006` already established as the wrong trade.
 *
 * **`stripe_last_paid_amount` is BIGINT.** It is money in minor units, and this repository's money
 * rule is `i64` / `BIGINT` / `number` end to end, never `i32` and never a float. Stripe amounts are
 * already integers in the smallest currency unit, so nothing is converted on the way in. The
 * companion `stripe_last_paid_currency` is what decides the scale on the way out — the reference's
 * own formatter divides by 100 unconditionally and therefore renders every zero-decimal currency
 * (JPY, KRW, VND and thirteen more) a hundredfold low. `$lib/money` already handles that correctly
 * and is what this column must be rendered through.
 *
 * **Stripe timestamps are `timestamptz`.** They describe instants that cross timezones — a billing
 * period end read from a server in another region is the same instant or it is a billing bug.
 *
 * **`alerter_app_fcm_user_off` is stated positively as stored, negatively as named.** It is the
 * reference's own name and it means "this member turned their push notifications off", so `true`
 * suppresses. Renaming it to `alerterAppFcmUserOn` would have been tidier and would have silently
 * inverted the meaning of every existing row the first time anyone synced from the reference.
 *
 * ## Nothing is backfilled
 *
 * Every column is additive with a default that is already true of every existing row. There is no
 * `UPDATE` here, so this migration is safe to interrupt and re-run — the `IF NOT EXISTS` guards make
 * each statement idempotent even though the runner applies it exactly once.
 */
export const sql = `
  ALTER TABLE room_users
    -- Per-member file-drive access, gated by the room's own \`fileAccessCaseByCase\`.
    ADD COLUMN IF NOT EXISTS has_file_access BOOLEAN NOT NULL DEFAULT FALSE,

    -- Per-member mobile app access, gated by the room's \`ptrMobileAppCaseByCaseEnabled\`.
    ADD COLUMN IF NOT EXISTS has_mobile_app BOOLEAN NOT NULL DEFAULT FALSE,

    -- The member switched their own push notifications off. TRUE suppresses.
    ADD COLUMN IF NOT EXISTS alerter_app_fcm_user_off BOOLEAN NOT NULL DEFAULT FALSE,

    -- Rendered under the name in red when present; the account handle, not the numeric id.
    ADD COLUMN IF NOT EXISTS discord_username TEXT,

    -- Marketplace / Stripe. NULL everywhere until a member actually subscribes: unlike the booleans
    -- above, "no subscription" and "a subscription with no recorded payment" are different facts and
    -- must not collapse into one value.
    ADD COLUMN IF NOT EXISTS is_marketplace_user BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
    ADD COLUMN IF NOT EXISTS stripe_last_paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS stripe_last_payment_failure_at TIMESTAMPTZ,
    -- BIGINT: money in minor units, i64 end to end. See the note above.
    ADD COLUMN IF NOT EXISTS stripe_last_paid_amount BIGINT,
    -- Decides the scale for the amount above. Without it, JPY renders 100x low.
    ADD COLUMN IF NOT EXISTS stripe_last_paid_currency TEXT;
`;
