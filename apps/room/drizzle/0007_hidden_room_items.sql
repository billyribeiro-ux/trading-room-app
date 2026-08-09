CREATE TABLE IF NOT EXISTS `hidden_room_items` (
	`evidence_key` text PRIMARY KEY NOT NULL,
	`hidden_by_user_id` integer NOT NULL,
	`hidden_at` integer NOT NULL,
	FOREIGN KEY (`hidden_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
