CREATE TABLE `chat_mutes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`target_user_id` integer NOT NULL,
	`muted_by_user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`muted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `chat_mutes_target_expires_idx` ON `chat_mutes` (`target_user_id`,`expires_at`);--> statement-breakpoint
ALTER TABLE `alerts` ADD `is_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `alerts` ADD `background_color` text;--> statement-breakpoint
ALTER TABLE `alerts` ADD `font_color` text;--> statement-breakpoint
ALTER TABLE `alerts` ADD `question_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `alerts` ADD `question_answered` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `is_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `background_color` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `font_color` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `answered` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `reply_to_message_id` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `reply_to_name` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `reply_to_body` text;