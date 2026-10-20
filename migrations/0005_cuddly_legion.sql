CREATE TABLE `application_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`application_id` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`application_id`) REFERENCES `exhibitor_applications`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exhibitor_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`submission_id` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`applicant_message` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`organization_id`,`submission_id`) REFERENCES `form_submissions`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`edition_id`) REFERENCES `editions`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "applications_status" CHECK("exhibitor_applications"."status" IN ('submitted','needs_info','approved','rejected')),
	CONSTRAINT "applications_revision" CHECK("exhibitor_applications"."revision">=1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_org_id` ON `exhibitor_applications` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applications_submission` ON `exhibitor_applications` (`organization_id`,`submission_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applications_edition_id` ON `exhibitor_applications` (`organization_id`,`edition_id`,`id`);--> statement-breakpoint
CREATE TABLE `form_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`form_id` text NOT NULL,
	`revision` integer NOT NULL,
	`definition_json` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`form_id`) REFERENCES `forms`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "form_definitions_json" CHECK(json_valid("form_definitions"."definition_json") AND json_type("form_definitions"."definition_json")='object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `form_definitions_org_id` ON `form_definitions` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `form_definitions_org_form_id` ON `form_definitions` (`organization_id`,`form_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `form_definitions_version` ON `form_definitions` (`organization_id`,`form_id`,`revision`);--> statement-breakpoint
CREATE TABLE `form_fields` (
	`organization_id` text NOT NULL,
	`definition_id` text NOT NULL,
	`field_key` text NOT NULL,
	`field_json` text NOT NULL,
	PRIMARY KEY(`organization_id`, `definition_id`, `field_key`),
	FOREIGN KEY (`organization_id`,`definition_id`) REFERENCES `form_definitions`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "form_fields_json" CHECK(json_valid("form_fields"."field_json"))
);
--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`form_id` text NOT NULL,
	`definition_id` text NOT NULL,
	`idempotency_hash` text NOT NULL,
	`payload_hash` text NOT NULL,
	`receipt_hash` text NOT NULL,
	`answers_ciphertext` text,
	`profile_ciphertext` text,
	`listing_opt_in` integer DEFAULT 0 NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`receipt_expires_at` text NOT NULL,
	`retention_until` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`organization_id`,`edition_id`,`form_id`) REFERENCES `forms`(`organization_id`,`edition_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`form_id`,`definition_id`) REFERENCES `form_definitions`(`organization_id`,`form_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "form_submissions_state" CHECK("form_submissions"."state" IN ('active','withdrawn','purged')),
	CONSTRAINT "form_submissions_optin" CHECK("form_submissions"."listing_opt_in" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `form_submissions_receipt_hash_unique` ON `form_submissions` (`receipt_hash`);--> statement-breakpoint
CREATE INDEX `form_submissions_retention` ON `form_submissions` (`organization_id`,`retention_until`);--> statement-breakpoint
CREATE UNIQUE INDEX `form_submissions_org_id` ON `form_submissions` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `form_submissions_idempotency` ON `form_submissions` (`organization_id`,`form_id`,`idempotency_hash`);--> statement-breakpoint
CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`name` text NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`edition_id`) REFERENCES `editions`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "forms_state" CHECK("forms"."state" IN ('draft','open','closed')),
	CONSTRAINT "forms_revision" CHECK("forms"."revision">=1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_org_id` ON `forms` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `forms_org_edition_id` ON `forms` (`organization_id`,`edition_id`,`id`);--> statement-breakpoint
CREATE TABLE `public_form_rate_limits` (
	`organization_id` text NOT NULL,
	`form_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`bucket` integer NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`organization_id`, `form_id`, `key_hash`, `bucket`),
	FOREIGN KEY (`organization_id`,`form_id`) REFERENCES `forms`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "form_rate_count" CHECK("public_form_rate_limits"."count">=1 AND "public_form_rate_limits"."count"<=10)
);
--> statement-breakpoint
CREATE TABLE `public_profile_sources` (
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`exhibitor_id` text NOT NULL,
	`application_id` text NOT NULL,
	PRIMARY KEY(`organization_id`, `edition_id`, `exhibitor_id`),
	FOREIGN KEY (`organization_id`,`edition_id`,`application_id`) REFERENCES `exhibitor_applications`(`organization_id`,`edition_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_profile_application` ON `public_profile_sources` (`organization_id`,`application_id`);
--> statement-breakpoint
CREATE TRIGGER form_definitions_no_update BEFORE UPDATE ON form_definitions BEGIN SELECT RAISE(ABORT,'immutable_form_definition'); END;
CREATE TRIGGER form_definitions_no_delete BEFORE DELETE ON form_definitions BEGIN SELECT RAISE(ABORT,'immutable_form_definition'); END;
CREATE TRIGGER form_fields_no_update BEFORE UPDATE ON form_fields BEGIN SELECT RAISE(ABORT,'immutable_form_definition'); END;
CREATE TRIGGER form_fields_no_delete BEFORE DELETE ON form_fields BEGIN SELECT RAISE(ABORT,'immutable_form_definition'); END;
CREATE TRIGGER application_events_no_update BEFORE UPDATE ON application_events BEGIN SELECT RAISE(ABORT,'immutable_application_audit'); END;
CREATE TRIGGER application_events_no_delete BEFORE DELETE ON application_events BEGIN SELECT RAISE(ABORT,'immutable_application_audit'); END;
CREATE TRIGGER public_profile_sources_no_update BEFORE UPDATE ON public_profile_sources BEGIN SELECT RAISE(ABORT,'immutable_profile_source'); END;
CREATE TRIGGER public_profile_sources_no_delete BEFORE DELETE ON public_profile_sources BEGIN SELECT RAISE(ABORT,'immutable_profile_source'); END;
CREATE TRIGGER forms_identity_immutable BEFORE UPDATE OF id,organization_id,edition_id ON forms BEGIN SELECT RAISE(ABORT,'immutable_form_scope'); END;
CREATE TRIGGER submissions_identity_immutable BEFORE UPDATE OF id,organization_id,edition_id,form_id,definition_id,idempotency_hash,payload_hash,receipt_hash,receipt_expires_at,retention_until ON form_submissions BEGIN SELECT RAISE(ABORT,'immutable_submission_identity'); END;
CREATE TRIGGER submissions_redaction_only BEFORE UPDATE ON form_submissions
WHEN (NEW.answers_ciphertext IS NOT OLD.answers_ciphertext AND NEW.answers_ciphertext IS NOT NULL) OR (NEW.profile_ciphertext IS NOT OLD.profile_ciphertext AND NEW.profile_ciphertext IS NOT NULL) OR (OLD.state!='active' AND NEW.state='active') OR (NEW.state!='active' AND (NEW.answers_ciphertext IS NOT NULL OR NEW.profile_ciphertext IS NOT NULL OR NEW.listing_opt_in!=0))
BEGIN SELECT RAISE(ABORT,'submission_redaction_only'); END;
CREATE TRIGGER applications_submission_scope BEFORE INSERT ON exhibitor_applications
WHEN NOT EXISTS(SELECT 1 FROM form_submissions WHERE organization_id=NEW.organization_id AND edition_id=NEW.edition_id AND id=NEW.submission_id)
BEGIN SELECT RAISE(ABORT,'application_scope_mismatch'); END;
CREATE TRIGGER applications_identity_immutable BEFORE UPDATE OF id,organization_id,edition_id,submission_id ON exhibitor_applications BEGIN SELECT RAISE(ABORT,'immutable_application_identity'); END;
CREATE TRIGGER profile_source_requires_consent BEFORE INSERT ON public_profile_sources
WHEN NOT EXISTS(SELECT 1 FROM exhibitor_applications a JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id WHERE a.organization_id=NEW.organization_id AND a.edition_id=NEW.edition_id AND a.id=NEW.application_id AND a.status='approved' AND s.state='active' AND s.listing_opt_in=1 AND s.retention_until>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
BEGIN SELECT RAISE(ABORT,'profile_consent_required'); END;
