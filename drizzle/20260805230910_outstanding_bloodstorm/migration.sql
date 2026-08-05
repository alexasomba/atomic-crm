CREATE TABLE `tags` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`color` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `size` integer;--> statement-breakpoint
ALTER TABLE `companies` ADD `linkedin_url` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `website` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `phone_number` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `address` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `zipcode` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `city` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `state_abbr` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `sales_id` integer REFERENCES sales(id);--> statement-breakpoint
ALTER TABLE `companies` ADD `context_links` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `country` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `description` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `revenue` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `tax_identifier` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `logo` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `email_json` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `phone_json` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `phone_1_number` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `phone_1_type` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `phone_2_number` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `phone_2_type` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `background` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `acquisition` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `first_seen` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `last_seen` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `has_newsletter` integer;--> statement-breakpoint
ALTER TABLE `contacts` ADD `status` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `sales_id` integer REFERENCES sales(id);--> statement-breakpoint
ALTER TABLE `contacts` ADD `linkedin_url` text;--> statement-breakpoint
ALTER TABLE `deals` ADD `contact_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `category` text;--> statement-breakpoint
ALTER TABLE `deals` ADD `description` text;--> statement-breakpoint
ALTER TABLE `deals` ADD `expected_closing_date` text;--> statement-breakpoint
ALTER TABLE `notes` ADD `deal_id` integer REFERENCES deals(id);--> statement-breakpoint
ALTER TABLE `notes` ADD `status` text;--> statement-breakpoint
ALTER TABLE `notes` ADD `attachments` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `type` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `text` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `done_date` text;