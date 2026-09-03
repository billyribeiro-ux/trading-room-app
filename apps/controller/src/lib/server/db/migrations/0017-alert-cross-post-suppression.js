/** Preserve the per-alert linked-room suppression as part of the idempotent dispatch input. */
export const sql = `
  ALTER TABLE alert_dispatches
    ADD COLUMN dont_cross_post BOOLEAN NOT NULL DEFAULT FALSE;
`;
