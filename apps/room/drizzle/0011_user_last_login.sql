-- The user modal's Last Login row, and the index that makes its authorization check bounded.
--
-- `users.last_login_at` is the reference's `userXref.lastLogin`. It is a column rather than a query
-- over `sessions` because `sessions` cannot answer it: `createSessionFor` deletes every prior row
-- for the account before inserting, and `logout` deletes the row outright, so the table holds at
-- most one row per person and nothing at all once they sign out. See `server/db/schema.ts`.
--
-- Nullable with NO default. An account that has never logged in since this column existed has an
-- unknown last login, and `0` would render as 1 January 1970 for every pre-existing row. The modal
-- shows `n/a` for null, which is what the reference shows for a missing `lastLogin`.
--
-- The ALTER cannot carry IF NOT EXISTS: SQLite has no `ADD COLUMN IF NOT EXISTS`, and `0003`,
-- `0004` and `0010` set the precedent. Re-running is prevented by the runner.

ALTER TABLE `users` ADD `last_login_at` integer;
--> statement-breakpoint
-- "Has this person ever spoken in THIS room?" — the scope check that decides whether a presenter
-- may read another account's address at all. Without this index it is a full scan of `messages` on
-- every user modal opened for somebody who is not on the roster, growing with the room's whole
-- history. The room leads because it is the equality that eliminates the most, and the pair alone
-- answers the query from the index without touching a row.
CREATE INDEX IF NOT EXISTS `messages_room_sender_idx` ON `messages` (`room_short_code`,`sender_id`);
