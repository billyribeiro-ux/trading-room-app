/**
 * Stable ids linking the transitional controller rows to canonical Rust authority rows.
 *
 * Nullable is the safe rollout shape: the schema may ship before the offline importer runs. A
 * runtime configured for Rust authority refuses null rather than deriving or allocating an id.
 * UNIQUE makes the relation one-to-one in this database; the Rust target independently enforces
 * the reverse mapping in `legacy_entity_mappings`.
 */
export const sql = `
  ALTER TABLE accounts
    ADD COLUMN authority_enterprise_id UUID,
    ADD COLUMN authority_reconciled_at TIMESTAMPTZ;

  ALTER TABLE accounts
    ADD CONSTRAINT accounts_authority_enterprise_id_unique
    UNIQUE (authority_enterprise_id);

  ALTER TABLE users
    ADD COLUMN authority_user_id UUID,
    ADD COLUMN authority_reconciled_at TIMESTAMPTZ;

  ALTER TABLE users
    ADD CONSTRAINT users_authority_user_id_unique
    UNIQUE (authority_user_id);
`;
