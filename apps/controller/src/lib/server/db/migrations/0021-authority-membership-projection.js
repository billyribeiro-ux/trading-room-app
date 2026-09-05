/**
 * Monotonic proof for the controller's temporary membership read projection.
 * Null means the legacy row has not passed the offline membership converter.
 */
export const sql = `
  ALTER TABLE room_users
    ADD COLUMN authority_member_id UUID,
    ADD COLUMN authority_revision BIGINT,
    ADD COLUMN authority_content_hash TEXT,
    ADD COLUMN authority_reconciled_at TIMESTAMPTZ;

  ALTER TABLE room_users
    ADD CONSTRAINT room_users_authority_revision_nonnegative
    CHECK (authority_revision IS NULL OR authority_revision >= 0),
    ADD CONSTRAINT room_users_authority_content_hash_shape
    CHECK (authority_content_hash IS NULL OR authority_content_hash ~ '^[0-9a-f]{64}$');

  CREATE UNIQUE INDEX room_users_authority_member_idx
    ON room_users (authority_member_id);
`;
