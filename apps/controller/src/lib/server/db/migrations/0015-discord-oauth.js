/** One-time OAuth state. Discord access tokens are intentionally not retained. */
export const sql = `
  CREATE TABLE discord_oauth_states (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    state_hash TEXT NOT NULL UNIQUE,
    room_user_id INTEGER NOT NULL REFERENCES room_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX discord_oauth_states_expiry_idx ON discord_oauth_states(expires_at);
`;
