CREATE TABLE `note_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_id` integer NOT NULL,
	`content_html` text,
	`updated_by_id` integer,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `note_versions_note_version_unique` ON `note_versions` (`note_id`,`version`);--> statement-breakpoint
CREATE INDEX `note_versions_note_created_idx` ON `note_versions` (`note_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`content_html` text,
	`is_welcome_mat` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	`updated_by_id` integer,
	`deleted_at` integer,
	`deleted_by_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deleted_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notes_position_created_idx` ON `notes` (`position`,`created_at`);--> statement-breakpoint
CREATE INDEX `notes_deleted_position_idx` ON `notes` (`deleted_at`,`position`);