/**
 * Email verification.
 *
 * Until now anybody could register with an address they did not own and be signed in immediately.
 * `docs/OUTSTANDING.md` has carried that as HIGH (§1b.3, §1b.4) since the first live test.
 *
 * ## Existing accounts are grandfathered, deliberately
 *
 * `email_verified_at` backfills to `created_at` for every row that already exists. Retroactively
 * marking the owner's own account unverified — on a deployment that cannot yet send mail — would
 * lock them out of the product with no way back in. Verification applies from here forward.
 *
 * This is the first migration that is NOT idempotent, which is the entire reason the migrator
 * exists: the backfill below must run exactly once.
 */
export const sql = `
    ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

    /*
      Grandfather every account that predates verification. Written as a one-shot statement rather
      than a column DEFAULT: a DEFAULT would also mark every FUTURE row verified, which is the
      opposite of the point.
    */
    UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

    CREATE TABLE email_verification_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      email TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX email_verification_tokens_user_idx ON email_verification_tokens(user_id);
    CREATE INDEX email_verification_tokens_expires_idx ON email_verification_tokens(expires_at);
`;
