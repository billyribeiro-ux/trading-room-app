CREATE TABLE `poll_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`poll_id` integer NOT NULL,
	`sender_id` integer NOT NULL,
	`choice_index` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `poll_answers_poll_sender_unique` ON `poll_answers` (`poll_id`,`sender_id`);--> statement-breakpoint
CREATE INDEX `poll_answers_poll_created_idx` ON `poll_answers` (`poll_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `polls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` integer NOT NULL,
	`question` text NOT NULL,
	`choices_json` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `polls_status_created_idx` ON `polls` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `saved_polls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question` text NOT NULL,
	`choices_json` text NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
