/** Durable, idempotent alert dispatches and per-member delivery outcomes. */
export const sql = `
  CREATE TABLE alert_dispatches (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    external_alert_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX alert_dispatches_room_idempotency_idx
    ON alert_dispatches(room_id, idempotency_key);
  CREATE INDEX alert_dispatches_room_alert_idx
    ON alert_dispatches(room_id, external_alert_id);

  CREATE TABLE alert_delivery_attempts (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    dispatch_id INTEGER NOT NULL REFERENCES alert_dispatches(id) ON DELETE CASCADE,
    room_user_id INTEGER REFERENCES room_users(id) ON DELETE SET NULL,
    recipient_key TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    reason TEXT,
    registration_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    pruned_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT alert_delivery_attempts_status_check
      CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'suppressed', 'no-registration'))
  );
  CREATE UNIQUE INDEX alert_delivery_attempts_dispatch_recipient_idx
    ON alert_delivery_attempts(dispatch_id, recipient_key);
  CREATE INDEX alert_delivery_attempts_dispatch_status_idx
    ON alert_delivery_attempts(dispatch_id, status);
`;
