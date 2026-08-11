/**
 * Give `room_sessions`'s two foreign keys an ON DELETE action, because without one they broke
 * every delete path in the product.
 *
 * Found by the adversarial review of 2026-08-11, in work shipped the same day, and confirmed at the
 * call sites rather than inferred from the DDL.
 *
 * ## What was broken
 *
 * `0007-room-sessions.js:50-51` declares:
 *
 *     room_id       INTEGER NOT NULL REFERENCES rooms(id),
 *     room_user_id  INTEGER REFERENCES room_users(id),
 *
 * with no action on either, so both default to `NO ACTION` — the parent row cannot be deleted while
 * a child references it. Every visit recorded by `recordVisit` is such a child, and it is written on
 * a public page load, so in practice every active room has them.
 *
 * That turns two ordinary operations into errors:
 *
 *  * **Deleting a room.** `rooms.ts:383-385` deletes `room_users`, then `room_settings`, then
 *    `rooms` — and never `room_sessions`. It fails on the FIRST statement, because the visits point
 *    at those memberships, and would fail again on the third.
 *  * **Removing a member.** `rooms.ts:196` (remove one), `:440` and `:940` (the bulk "remove
 *    non-presenters" loops) and `:454` each delete a `room_users` row. Each one fails as soon as
 *    that person has visited the room once.
 *
 * ## Why the two columns get DIFFERENT actions
 *
 * They are not symmetrical, and 0007's own docblock is what decides it — this migration is
 * enforcing the intent that file already wrote down, not inventing a policy.
 *
 * **`room_user_id` → SET NULL.** 0007 says a removed member "must not silently rewrite or erase
 * visits that already happened. A stats export is evidence of who was present." The column is
 * already nullable and the display name and email are copied onto the row *for exactly this case* —
 * a guest never has a membership at all. So dropping the membership must leave the visit standing
 * with its identity intact, which is precisely `SET NULL`. `CASCADE` here would delete last
 * quarter's attendance because somebody tidied the member list.
 *
 * **`room_id` → CASCADE.** A visit is meaningless without the room it was a visit to, and the room
 * is being deleted deliberately. There is no honest record to preserve.
 *
 * ## Why at the constraint and not in `deleteRoom`
 *
 * The house pattern elsewhere is an ordered manual delete — `room_settings` and `room_users` also
 * reference `rooms(id)` with no action, and `deleteRoom` deletes them by hand in the right order.
 * That pattern is fine for ONE call site and is why it has held so far.
 *
 * It does not fit here. The membership case has **five** call sites, four of them in loops, and the
 * correct behaviour there is not "delete the child" but "keep it and null one column" — which a
 * manual delete cannot express without extra code at each site, every one of which is a chance to
 * forget. Declaring it on the constraint means no future delete path can get it wrong, and it makes
 * the guarantee readable in the schema rather than in five places in `rooms.ts`.
 *
 * ## Idempotent by construction
 *
 * The constraints are dropped by BOTH names before being added: the PostgreSQL-generated
 * `room_sessions_room_id_fkey` that 0007's inline `REFERENCES` produced, and the explicit name added
 * below. Dropping the same name this migration adds is what makes a second run a no-op.
 *
 * The rewrite is `ALTER TABLE`-only and takes an ACCESS EXCLUSIVE lock for the duration of a
 * constraint validation on a table that is small today. It is deliberately not `NOT VALID` +
 * `VALIDATE`: skipping validation would leave the existing rows unchecked, and the whole point is
 * that they are consistent.
 */
export const sql = `
  ALTER TABLE room_sessions
    DROP CONSTRAINT IF EXISTS room_sessions_room_id_fkey,
    DROP CONSTRAINT IF EXISTS room_sessions_room_id_fk,
    DROP CONSTRAINT IF EXISTS room_sessions_room_user_id_fkey,
    DROP CONSTRAINT IF EXISTS room_sessions_room_user_id_fk;

  ALTER TABLE room_sessions
    ADD CONSTRAINT room_sessions_room_id_fk
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    ADD CONSTRAINT room_sessions_room_user_id_fk
      FOREIGN KEY (room_user_id) REFERENCES room_users(id) ON DELETE SET NULL;
`;
