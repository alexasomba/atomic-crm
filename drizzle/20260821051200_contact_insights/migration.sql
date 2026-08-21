CREATE TABLE `contact_insights` (
	`contact_id` integer PRIMARY KEY NOT NULL,
	`lifecycle_stage` text,
	`lead_score` integer DEFAULT 0 NOT NULL,
	`last_activity_date` text,
	`last_activity_type` text,
	`renewal_amount` integer,
	`renewal_date` text,
	`renewal_forecast_category` text,
	`renewal_probability` integer,
	`contract_attachment_id` text,
	`economic_buyer_identified` integer DEFAULT false NOT NULL,
	`budget_confirmed` integer DEFAULT false NOT NULL,
	`legal_review_status` text,
	`security_review_status` text,
	`champion_confidence` text,
	`competitor` text,
	`next_best_action` text,
	`notes_summary` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`),
	FOREIGN KEY (`contract_attachment_id`) REFERENCES `attachments`(`id`)
);

CREATE INDEX `contact_insights_lead_score_idx` ON `contact_insights` (`lead_score`);
CREATE INDEX `contact_insights_forecast_idx` ON `contact_insights` (`renewal_forecast_category`);

CREATE TABLE `copilot_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`action_type` text NOT NULL,
	`tool_name` text,
	`contact_name` text,
	`company_name` text,
	`summary` text DEFAULT '' NOT NULL,
	`sales_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`sales_id`) REFERENCES `sales`(`id`)
);

CREATE INDEX `copilot_audit_created_at_idx` ON `copilot_audit` (`created_at`);
