/** Durable source-to-target attribution for linked-room alert fan-out. */
export const sql = `
  CREATE TABLE alert_dispatch_links (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    source_dispatch_id INTEGER NOT NULL REFERENCES alert_dispatches(id) ON DELETE CASCADE,
    target_dispatch_id INTEGER NOT NULL REFERENCES alert_dispatches(id) ON DELETE CASCADE,
    target_room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    target_room_name TEXT NOT NULL,
    target_room_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX alert_dispatch_links_source_target_idx
    ON alert_dispatch_links(source_dispatch_id, target_room_id);
  CREATE UNIQUE INDEX alert_dispatch_links_target_dispatch_idx
    ON alert_dispatch_links(target_dispatch_id);
`;
