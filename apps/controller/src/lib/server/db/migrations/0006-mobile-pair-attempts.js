/**
 * A failed-attempt counter on the mobile pair code, so a six-digit PIN cannot be brute-forced.
 *
 * ## Why a column rather than a rate limiter
 *
 * The pair code is six digits — **one million combinations**, and the app-facing pairing endpoint
 * is public by necessity: a phone that has never paired holds no credential to authenticate with.
 * Without a counter, an attacker who knows a room's short code and a member's email address can
 * simply try every PIN and bind their own device to that member's alerts.
 *
 * The obvious answer is a rate limiter, and it is the wrong one here. This controller runs
 * **serverless on Vercel**, so an in-process counter lives and dies with one instance and shares
 * nothing with the next — it would look like protection and provide almost none. The state has to
 * be durable, and the row being attacked is the natural place to keep it.
 *
 * `login-attempts.ts` already establishes the pattern for this codebase: count failures against
 * durable state rather than trusting the caller to slow down.
 *
 * ## What the counter does
 *
 * Five failures invalidates the code — the endpoint clears it, and the owner has to issue a new one
 * from the manage page. That is a deliberate trade: a member who fat-fingers their PIN five times
 * has to ask for another, which is mildly annoying and takes one click; an attacker gets five
 * guesses out of a million and then the target they were attacking no longer exists.
 *
 * Resetting on success matters as much as counting: a member who mistypes twice and then succeeds
 * must not carry two failures into their next pairing months later.
 *
 * ## Why NOT NULL DEFAULT 0
 *
 * Every existing row has never been attempted, and that is exactly what zero means. A nullable
 * column would make every read handle "unknown" for a state that cannot occur, and the first thing
 * anyone would write is `?? 0`.
 */
export const sql = `
  ALTER TABLE room_users
    ADD COLUMN IF NOT EXISTS mobile_pair_attempts INTEGER NOT NULL DEFAULT 0;
`;
