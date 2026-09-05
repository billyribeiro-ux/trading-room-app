/**
 * Monotonic proof for the controller's temporary account-administrator projection.
 *
 * `admin_users.password_hash` used to look like a login credential, but no login query ever read
 * this table.  Canonical mode stores no password or hash in the projection; credentials live only
 * in Rust/PostgreSQL `users`.  Legacy rows retain their hashes until conversion/rollback ends.
 */
export const sql = `
  DO $$
  DECLARE duplicate_account INTEGER;
  BEGIN
    SELECT account_id INTO duplicate_account
      FROM admin_users
     GROUP BY account_id, lower(email)
    HAVING count(*) > 1
     ORDER BY account_id
     LIMIT 1;
    IF duplicate_account IS NOT NULL THEN
      RAISE EXCEPTION
        'account % has duplicate case-insensitive administrator emails; reconcile before migration',
        duplicate_account;
    END IF;
  END
  $$;

  ALTER TABLE admin_users
    ALTER COLUMN password_hash DROP NOT NULL,
    ADD COLUMN authority_user_id UUID,
    ADD COLUMN authority_revision BIGINT,
    ADD COLUMN authority_content_hash TEXT,
    ADD COLUMN authority_reconciled_at TIMESTAMPTZ;

  ALTER TABLE admin_users
    ADD CONSTRAINT admin_users_authority_revision_nonnegative
    CHECK (authority_revision IS NULL OR authority_revision >= 0),
    ADD CONSTRAINT admin_users_authority_content_hash_shape
    CHECK (authority_content_hash IS NULL OR authority_content_hash ~ '^[0-9a-f]{64}$');

  CREATE UNIQUE INDEX admin_users_authority_user_idx
    ON admin_users (authority_user_id);
  CREATE UNIQUE INDEX admin_users_account_email_ci_idx
    ON admin_users (account_id, lower(email));
`;
