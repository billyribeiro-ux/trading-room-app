/**
 * Revision proof for the controller's local runtime projection of canonical Rust settings.
 * Null means this row has never been reconciled from authority; zero is a valid empty document.
 */
export const sql = `
  ALTER TABLE room_settings
    ADD COLUMN authority_revision BIGINT,
    ADD COLUMN authority_reconciled_at TIMESTAMPTZ;

  ALTER TABLE room_settings
    ADD CONSTRAINT room_settings_authority_revision_nonnegative
    CHECK (authority_revision IS NULL OR authority_revision >= 0);
`;
