-- The chat archive: `archiveLogs` sweeps messages into one of these, `unarchiveLogs` restores it.
-- See `server/db/schema.ts` for why the archive is a row with an identity rather than a per-message
-- flag, and `server/chat-log.ts` for the exclusion that makes the pointer mean anything.
--
-- The ALTER cannot carry IF NOT EXISTS: SQLite has no `ADD COLUMN IF NOT EXISTS`, and `0003`/`0004`
-- set the precedent by adding thirteen columns the same way. Re-running is prevented by the runner.

CREATE TABLE IF NOT EXISTS `chat_archives` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_short_code` text NOT NULL,
	`channel` text NOT NULL,
	`older_than` integer NOT NULL,
	`archived_at` integer NOT NULL,
	`archived_by_user_id` integer NOT NULL,
	`message_count` integer NOT NULL,
	FOREIGN KEY (`archived_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chat_archives_room_idx` ON `chat_archives` (`room_short_code`,`archived_at`);
--> statement-breakpoint
ALTER TABLE `messages` ADD `archive_id` integer REFERENCES `chat_archives`(`id`);
