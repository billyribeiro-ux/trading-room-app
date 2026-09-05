/** Monotonic proof for the controller's temporary recoverable customer API-key projection. */
export const sql = `
  ALTER TABLE api_keys
    ADD COLUMN authority_revision BIGINT,
    ADD COLUMN authority_content_hash TEXT,
    ADD COLUMN authority_reconciled_at TIMESTAMPTZ;

  ALTER TABLE api_keys
    ADD CONSTRAINT api_keys_authority_revision_nonnegative
    CHECK (authority_revision IS NULL OR authority_revision >= 0),
    ADD CONSTRAINT api_keys_authority_content_hash_shape
    CHECK (authority_content_hash IS NULL OR authority_content_hash ~ '^[0-9a-f]{64}$');
`;
