CREATE TABLE `edition_sponsors` (
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`id` text NOT NULL,
	`data_json` text NOT NULL,
	FOREIGN KEY (`organization_id`,`edition_id`,`draft_id`) REFERENCES `content_drafts`(`organization_id`,`edition_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "edition_sponsors_json" CHECK(json_valid("edition_sponsors"."data_json") AND json_type("edition_sponsors"."data_json")='object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `edition_sponsors_scope_id` ON `edition_sponsors` (`organization_id`,`draft_id`,`id`);--> statement-breakpoint
CREATE TABLE `exhibitors` (
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`id` text NOT NULL,
	`data_json` text NOT NULL,
	FOREIGN KEY (`organization_id`,`edition_id`,`draft_id`) REFERENCES `content_drafts`(`organization_id`,`edition_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "exhibitors_json" CHECK(json_valid("exhibitors"."data_json") AND json_type("exhibitors"."data_json")='object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exhibitors_scope_id` ON `exhibitors` (`organization_id`,`draft_id`,`id`);--> statement-breakpoint
CREATE TABLE `guests` (
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`id` text NOT NULL,
	`data_json` text NOT NULL,
	FOREIGN KEY (`organization_id`,`edition_id`,`draft_id`) REFERENCES `content_drafts`(`organization_id`,`edition_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "guests_json" CHECK(json_valid("guests"."data_json") AND json_type("guests"."data_json")='object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guests_scope_id` ON `guests` (`organization_id`,`draft_id`,`id`);--> statement-breakpoint
CREATE TABLE `participations` (
	`organization_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`program_id` text NOT NULL,
	`guest_id` text NOT NULL,
	PRIMARY KEY(`organization_id`, `draft_id`, `program_id`, `guest_id`),
	FOREIGN KEY (`organization_id`,`draft_id`,`program_id`) REFERENCES `program_items`(`organization_id`,`draft_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`draft_id`,`guest_id`) REFERENCES `guests`(`organization_id`,`draft_id`,`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `program_items` (
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`id` text NOT NULL,
	`data_json` text NOT NULL,
	`stage_id` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	FOREIGN KEY (`organization_id`,`edition_id`,`draft_id`) REFERENCES `content_drafts`(`organization_id`,`edition_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`draft_id`,`stage_id`) REFERENCES `stages`(`organization_id`,`draft_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "program_items_json" CHECK(json_valid("program_items"."data_json") AND json_type("program_items"."data_json")='object'),
	CONSTRAINT "program_interval" CHECK("program_items"."end_at">"program_items"."start_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `program_items_scope_id` ON `program_items` (`organization_id`,`draft_id`,`id`);--> statement-breakpoint
CREATE TABLE `stages` (
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`id` text NOT NULL,
	`data_json` text NOT NULL,
	`venue_id` text,
	FOREIGN KEY (`organization_id`,`edition_id`,`draft_id`) REFERENCES `content_drafts`(`organization_id`,`edition_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`edition_id`,`venue_id`) REFERENCES `venues`(`organization_id`,`edition_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "stages_json" CHECK(json_valid("stages"."data_json") AND json_type("stages"."data_json")='object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stages_scope_id` ON `stages` (`organization_id`,`draft_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_drafts_edition_id_unique` ON `content_drafts` (`organization_id`,`edition_id`,`id`);
--> statement-breakpoint
CREATE TRIGGER program_items_stage_overlap BEFORE INSERT ON program_items
WHEN EXISTS(SELECT 1 FROM program_items WHERE organization_id=NEW.organization_id AND draft_id=NEW.draft_id AND stage_id=NEW.stage_id AND start_at<NEW.end_at AND end_at>NEW.start_at)
BEGIN SELECT RAISE(ABORT,'program_stage_conflict'); END;
--> statement-breakpoint
CREATE TRIGGER participations_guest_overlap BEFORE INSERT ON participations
WHEN EXISTS(
 SELECT 1 FROM program_items current_item
 JOIN participations existing ON existing.organization_id=NEW.organization_id AND existing.draft_id=NEW.draft_id AND existing.guest_id=NEW.guest_id
 JOIN program_items scheduled ON scheduled.organization_id=existing.organization_id AND scheduled.draft_id=existing.draft_id AND scheduled.id=existing.program_id
 WHERE current_item.organization_id=NEW.organization_id AND current_item.draft_id=NEW.draft_id AND current_item.id=NEW.program_id AND scheduled.id!=current_item.id AND scheduled.start_at<current_item.end_at AND scheduled.end_at>current_item.start_at
)
BEGIN SELECT RAISE(ABORT,'program_guest_conflict'); END;
--> statement-breakpoint
CREATE TRIGGER stages_no_update BEFORE UPDATE ON stages BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER stages_no_delete BEFORE DELETE ON stages BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER guests_no_update BEFORE UPDATE ON guests BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER guests_no_delete BEFORE DELETE ON guests BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER program_items_no_update BEFORE UPDATE ON program_items BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER program_items_no_delete BEFORE DELETE ON program_items BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER participations_no_update BEFORE UPDATE ON participations BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER participations_no_delete BEFORE DELETE ON participations BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER exhibitors_no_update BEFORE UPDATE ON exhibitors BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER exhibitors_no_delete BEFORE DELETE ON exhibitors BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER edition_sponsors_no_update BEFORE UPDATE ON edition_sponsors BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
CREATE TRIGGER edition_sponsors_no_delete BEFORE DELETE ON edition_sponsors BEGIN SELECT RAISE(ABORT,'immutable_editorial_revision'); END;
