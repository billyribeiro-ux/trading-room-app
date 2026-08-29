-- Per-member admin notes (`#user-modal`'s notes tab), plus the server-side grant that gates writing
-- them. See `server/db/schema.ts` for both, and `server/user-notes.ts` for the access rule.
--
-- The two CREATEs carry IF NOT EXISTS. The ALTER cannot: SQLite has no `ADD COLUMN IF NOT EXISTS`,
-- and `0003`/`0004` set the precedent by adding thirteen columns the same way. Re-running is
-- prevented by the runner rather than by the statement, which is the honest description of what
-- "idempotent" means for a column add on this engine.

CREATE TABLE IF NOT EXISTS `user_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_short_code` text NOT NULL,
	`subject_user_id` integer NOT NULL,
	`author_user_id` integer NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subject_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_notes_room_subject_idx` ON `user_notes` (`room_short_code`,`subject_user_id`,`created_at`);
--> statement-breakpoint
ALTER TABLE `sessions` ADD `notes_access_at` integer;
