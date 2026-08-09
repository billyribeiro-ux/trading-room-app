CREATE TABLE IF NOT EXISTS `captured_item_overrides` (
	`evidence_key` text PRIMARY KEY NOT NULL,
	`answered` integer,
	`body` text,
	`reactions_json` text,
	`updated_by_user_id` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
