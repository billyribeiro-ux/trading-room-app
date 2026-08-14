/**
 * `stream_ingest_keys` — the credential OBS or XSplit publishes with.
 *
 * ## What it is for
 *
 * A presenter may stream into a room from an external encoder as well as from the browser. The
 * reference shows them a link and a key, and offers a "New Link" button that mints a fresh one:
 *
 * ```js
 * const i = yield e.appService.invokeAdminCmd('getRTMPToken');   // -> { rtmpToken }
 * e.appService.globals.mtxToken = i.rtmpToken;
 * ```
 *
 * (`main.d6d3c112b59b7d0d.js` byte 2169850. The whole contract is written out in
 * `apps/room/docs/OBS-XSPLIT-INGEST.md`.)
 *
 * ## Why a table rather than a column on `room_users`
 *
 * The key is not a property of a membership; it is a CREDENTIAL, and credentials have a lifecycle a
 * membership does not: minted, rotated, revoked, and — the part that decides this — **replaced while
 * the old one is still in flight**. "New Link" must invalidate the previous key the moment it is
 * pressed, and a presenter who is mid-stream on the old key must be cut off rather than silently kept
 * alive. A row with its own `created_at` and a uniqueness constraint expresses that; a column
 * overwritten in place cannot say when it changed or that it ever did.
 *
 * It is also the table an auth check reads on every publish attempt, several times a second in the
 * worst case. Keeping it narrow, and indexed on the thing that is actually looked up, matters more
 * here than saving a join.
 *
 * ## The lookup is by KEY, not by room
 *
 * The media server asks one question — "may this key publish to this path?" — so the key is the
 * primary lookup and carries its own unique index. The room and user are what the answer is
 * ABOUT, not how it is found.
 *
 * ## Not a `*_cents` value, so not `BIGINT`
 *
 * The repository's money rule does not apply. `id` is an identity column like every other table
 * here.
 *
 * ## One live key per presenter per room
 *
 * `UNIQUE (room_id, user_id)` — pressing "New Link" UPDATES the row rather than accumulating
 * history. A revoked key must stop working, and the honest way to guarantee that is for it to stop
 * existing: keeping old rows around would mean the auth check had to remember which of several keys
 * was current, and the first bug in that logic is a revoked credential that still publishes.
 */
export const sql = `
  CREATE TABLE IF NOT EXISTS stream_ingest_keys (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- The secret the encoder presents. Opaque, high-entropy, and never derived from anything
    -- guessable: a key that can be computed from a room code is not a credential.
    ingest_key TEXT NOT NULL,
    -- The MediaMTX path this key may publish to, stored rather than recomputed so that a rename of
    -- the presenter cannot silently widen what an already-issued key is allowed to do.
    ingest_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Rotation is an UPDATE, so this moves. It is the evidence for "when was this key last minted",
    -- which is the first question asked when a stream key leaks.
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- The auth check looks a key up directly; make that the fast path and enforce that two rooms can
  -- never be issued the same secret.
  CREATE UNIQUE INDEX IF NOT EXISTS stream_ingest_keys_key_idx
    ON stream_ingest_keys (ingest_key);

  -- One live key per presenter per room. "New Link" updates this row; it does not add another.
  CREATE UNIQUE INDEX IF NOT EXISTS stream_ingest_keys_room_user_idx
    ON stream_ingest_keys (room_id, user_id);
`;
