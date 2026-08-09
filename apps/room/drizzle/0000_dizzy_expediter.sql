CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` integer NOT NULL,
	`kind` text DEFAULT 'text' NOT NULL,
	`body` text NOT NULL,
	`target_url` text,
	`non_trade` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room` text DEFAULT 'main' NOT NULL,
	`sender_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shared_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`room_layout` text DEFAULT 'left' NOT NULL,
	`chat_text_size` integer DEFAULT 16 NOT NULL,
	`compact_alerts` integer DEFAULT false NOT NULL,
	`compact_chat` integer DEFAULT false NOT NULL,
	`do_not_disturb` integer DEFAULT false NOT NULL,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`avatar_url` text DEFAULT '/avatar.svg' NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`status` text DEFAULT 'offline' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);