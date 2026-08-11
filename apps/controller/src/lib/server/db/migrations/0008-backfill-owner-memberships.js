/**
 * Seat the owner in rooms created before owners were seated.
 *
 * `apps/room/TODO.md` gap 31. `provisionRoom` inserts a role-0 membership for the owner as of
 * 2026-08-07; every room created before that has none. Its owner therefore reads as
 * `member: null`, which means **they are not a presenter in their own room** — the room resolves
 * role from the membership and fails closed to `member` when there is none.
 *
 * Three separate pieces of this repository presume that row exists, and none of them can fire while
 * it is missing: `roleLabel` maps `role === 0` to "Owner", `applyManyOpcode` skips role 0 so bulk
 * actions cannot touch the owner, and `shouldRemoveAsNonPresenter` preserves "only the owner and a
 * true presenter". That last one is the sharp edge — "Remove non-presenters" would have removed
 * nobody's owner because there was no owner row to preserve, but it also means the owner was never
 * protected by name.
 *
 * ## Who the owner is, and why this is not a guess
 *
 * `accounts.owner_email` is explicit and unique, written at registration from the registering
 * user's own address, and `provisionRoom` is called with that user's id. So the owner of a room is
 * the user in that room's account whose email matches `accounts.owner_email`. This migration joins
 * exactly that, rather than picking the lowest user id and hoping.
 *
 * Compared case-insensitively: `users.email` and `accounts.owner_email` are written by different
 * paths, and a single capitalised address would otherwise leave that owner unseated with no error.
 *
 * ## What it deliberately does NOT do
 *
 * **It never changes an existing row.** If the owner already has a membership at some other role —
 * invited as a participant, demoted deliberately — that is a decision somebody made, and a
 * migration that silently promoted them to role 0 would overwrite it with no way to tell afterwards
 * that it had. The `WHERE NOT EXISTS` is on the (room, user) pair, so those rooms are skipped and
 * left exactly as they are.
 *
 * That is the honest limit of this backfill: it fixes "the owner has no row", which is gap 31, and
 * not "the owner has the wrong row", which nobody has reported and which cannot be distinguished
 * from a deliberate demotion.
 *
 * ## Idempotent by construction
 *
 * `room_users_unique_idx` is unique on `(room_id, user_id)`, so `ON CONFLICT DO NOTHING` makes a
 * second run a no-op even if the `NOT EXISTS` were somehow raced. Both guards are kept: the
 * `NOT EXISTS` is what makes the intent readable, the `ON CONFLICT` is what makes it safe.
 *
 * `created_at` is `now()` rather than the room's own timestamp. The row is being created now and
 * saying otherwise would backdate an audit trail to a membership that did not exist.
 */
export const sql = `
  INSERT INTO room_users (room_id, user_id, role, created_at)
  SELECT r.id, u.id, 0, now()
    FROM rooms r
    JOIN accounts a ON a.id = r.account_id
    JOIN users u
      ON u.account_id = a.id
     AND lower(u.email) = lower(a.owner_email)
   WHERE NOT EXISTS (
           SELECT 1 FROM room_users ru
            WHERE ru.room_id = r.id
              AND ru.user_id = u.id
         )
  ON CONFLICT DO NOTHING;
`;
