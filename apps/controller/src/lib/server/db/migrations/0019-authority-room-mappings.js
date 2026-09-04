/**
 * Stable ids linking transitional controller rooms to canonical Rust rooms.
 *
 * The column is nullable so schema deployment can precede the offline room converter. Runtime
 * room authority refuses an absent or unreconciled mapping. The unique constraint prevents two
 * legacy rooms from claiming one canonical room; the target conversion ledger independently
 * enforces the reverse relation.
 */
export const sql = `
  ALTER TABLE rooms
    ADD COLUMN authority_room_id UUID,
    ADD COLUMN authority_reconciled_at TIMESTAMPTZ;

  ALTER TABLE rooms
    ADD CONSTRAINT rooms_authority_room_id_unique
    UNIQUE (authority_room_id);
`;
