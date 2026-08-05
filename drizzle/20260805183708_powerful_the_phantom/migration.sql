CREATE TABLE `activities` (
	`id` integer PRIMARY KEY,
	`contact_id` integer,
	`sales_id` integer,
	`type` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_activities_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`),
	CONSTRAINT `fk_activities_sales_id_sales_id_fk` FOREIGN KEY (`sales_id`) REFERENCES `sales`(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY,
	`note_id` integer,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_attachments_note_id_notes_id_fk` FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`sector` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `configuration` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`job_title` text,
	`company_id` integer,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_contacts_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` integer PRIMARY KEY,
	`contact_id` integer,
	`company_id` integer,
	`sales_id` integer,
	`name` text NOT NULL,
	`amount` integer,
	`stage` text NOT NULL,
	`status` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_deals_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`),
	CONSTRAINT `fk_deals_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_deals_sales_id_sales_id_fk` FOREIGN KEY (`sales_id`) REFERENCES `sales`(`id`)
);
--> statement-breakpoint
CREATE TABLE `inbound_email_events` (
	`id` text PRIMARY KEY,
	`message_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY,
	`contact_id` integer,
	`company_id` integer,
	`sales_id` integer,
	`title` text,
	`content` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_notes_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`),
	CONSTRAINT `fk_notes_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_notes_sales_id_sales_id_fk` FOREIGN KEY (`sales_id`) REFERENCES `sales`(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY,
	`user_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`disabled` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY,
	`contact_id` integer,
	`company_id` integer,
	`sales_id` integer,
	`title` text NOT NULL,
	`description` text,
	`status` text NOT NULL,
	`due_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_tasks_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`),
	CONSTRAINT `fk_tasks_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_tasks_sales_id_sales_id_fk` FOREIGN KEY (`sales_id`) REFERENCES `sales`(`id`)
);
--> statement-breakpoint
CREATE INDEX `activities_contact_id_idx` ON `activities` (`contact_id`);--> statement-breakpoint
CREATE INDEX `attachments_note_id_idx` ON `attachments` (`note_id`);--> statement-breakpoint
CREATE INDEX `companies_name_idx` ON `companies` (`name`);--> statement-breakpoint
CREATE INDEX `contacts_company_id_idx` ON `contacts` (`company_id`);--> statement-breakpoint
CREATE INDEX `contacts_email_idx` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `deals_status_stage_idx` ON `deals` (`status`,`stage`);--> statement-breakpoint
CREATE UNIQUE INDEX `inbound_email_message_id_idx` ON `inbound_email_events` (`message_id`);--> statement-breakpoint
CREATE INDEX `notes_contact_id_idx` ON `notes` (`contact_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_email_idx` ON `sales` (`email`);--> statement-breakpoint
CREATE INDEX `tasks_contact_id_idx` ON `tasks` (`contact_id`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`due_date`);