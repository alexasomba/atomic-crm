ALTER TABLE `deals` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `deals` ADD `position` integer DEFAULT 0 NOT NULL;