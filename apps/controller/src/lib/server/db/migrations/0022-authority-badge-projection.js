/**
 * Monotonic proof for the controller's temporary badge projection.
 *
 * Badge ids remain local integers at the room-compatibility seam. The UUID, revision, and content
 * digest prove which canonical Rust row each integer represents; roles are persisted because the
 * captured account editor reads and writes them end to end.
 */
export const sql = `
  ALTER TABLE badges
    ADD COLUMN authority_badge_id UUID,
    ADD COLUMN authority_revision BIGINT,
    ADD COLUMN authority_content_hash TEXT,
    ADD COLUMN authority_reconciled_at TIMESTAMPTZ,
    ADD COLUMN auto_assign_roles_json TEXT NOT NULL DEFAULT '[]';

  ALTER TABLE badges
    ADD CONSTRAINT badges_authority_revision_nonnegative
    CHECK (authority_revision IS NULL OR authority_revision >= 0),
    ADD CONSTRAINT badges_authority_content_hash_shape
    CHECK (authority_content_hash IS NULL OR authority_content_hash ~ '^[0-9a-f]{64}$');

  CREATE UNIQUE INDEX badges_authority_badge_idx
    ON badges (authority_badge_id);
`;
