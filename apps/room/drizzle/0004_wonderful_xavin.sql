ALTER TABLE `alerts` ADD `reactions_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `reactions_json` text DEFAULT '{}' NOT NULL;