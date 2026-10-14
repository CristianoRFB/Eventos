CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_key_unique` ON `rate_limit` (`key`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`diff_safe_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "audit_events_diff_check" CHECK(json_valid("audit_events"."diff_safe_json") AND json_type("audit_events"."diff_safe_json") = 'object')
);
--> statement-breakpoint
CREATE INDEX `audit_events_org_created_idx` ON `audit_events` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_events_org_resource_idx` ON `audit_events` (`organization_id`,`resource_type`,`resource_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `audit_events_org_id_unique` ON `audit_events` (`organization_id`,`id`);--> statement-breakpoint
CREATE TABLE `brand_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`tokens_json` text DEFAULT '{}' NOT NULL,
	`logo_asset_id` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`logo_asset_id`) REFERENCES `media_assets`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "brand_profiles_name_check" CHECK(length(trim("brand_profiles"."name")) > 0),
	CONSTRAINT "brand_profiles_revision_check" CHECK("brand_profiles"."revision" >= 1),
	CONSTRAINT "brand_profiles_tokens_check" CHECK(json_valid("brand_profiles"."tokens_json") AND json_type("brand_profiles"."tokens_json") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_profiles_org_id_unique` ON `brand_profiles` (`organization_id`,`id`);--> statement-breakpoint
CREATE TABLE `editions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`event_id` text NOT NULL,
	`edition_key` text NOT NULL,
	`name` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`time_zone` text DEFAULT 'America/Sao_Paulo' NOT NULL,
	`start_at` text,
	`end_at` text,
	`external_ticket_url` text,
	`brand_profile_id` text,
	`tokens_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`event_id`) REFERENCES `events`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`brand_profile_id`) REFERENCES `brand_profiles`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "editions_key_check" CHECK(length("editions"."edition_key") BETWEEN 1 AND 100 AND "editions"."edition_key" = lower("editions"."edition_key") AND "editions"."edition_key" NOT GLOB '*[^a-z0-9-]*'),
	CONSTRAINT "editions_name_check" CHECK(length(trim("editions"."name")) > 0),
	CONSTRAINT "editions_status_check" CHECK("editions"."status" IN ('draft','active','archived')),
	CONSTRAINT "editions_revision_check" CHECK("editions"."revision" >= 1),
	CONSTRAINT "editions_interval_check" CHECK("editions"."start_at" IS NULL OR "editions"."end_at" IS NULL OR "editions"."end_at" > "editions"."start_at"),
	CONSTRAINT "editions_tokens_check" CHECK(json_valid("editions"."tokens_json") AND json_type("editions"."tokens_json") = 'object')
);
--> statement-breakpoint
CREATE INDEX `editions_org_event_status_idx` ON `editions` (`organization_id`,`event_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `editions_org_id_unique` ON `editions` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `editions_org_event_key_unique` ON `editions` (`organization_id`,`event_id`,`edition_key`);--> statement-breakpoint
CREATE TABLE `event_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`permissions_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`event_id`) REFERENCES `events`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`user_id`) REFERENCES `memberships`(`organization_id`,`user_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "event_assignments_permissions_check" CHECK(json_valid("event_assignments"."permissions_json") AND json_type("event_assignments"."permissions_json") = 'array')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_assignments_org_id_unique` ON `event_assignments` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_assignments_org_event_user_unique` ON `event_assignments` (`organization_id`,`event_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`brand_profile_id` text,
	`tokens_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`brand_profile_id`) REFERENCES `brand_profiles`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "events_slug_check" CHECK(length("events"."slug") BETWEEN 1 AND 100 AND "events"."slug" = lower("events"."slug") AND "events"."slug" NOT GLOB '*[^a-z0-9-]*'),
	CONSTRAINT "events_name_check" CHECK(length(trim("events"."name")) > 0),
	CONSTRAINT "events_status_check" CHECK("events"."status" IN ('draft','active','archived')),
	CONSTRAINT "events_revision_check" CHECK("events"."revision" >= 1),
	CONSTRAINT "events_tokens_check" CHECK(json_valid("events"."tokens_json") AND json_type("events"."tokens_json") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_org_id_unique` ON `events` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_org_slug_unique` ON `events` (`organization_id`,`slug`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email_hash` text NOT NULL,
	`token_hash` text NOT NULL,
	`role` text NOT NULL,
	`event_id` text,
	`invited_by` text NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`event_id`) REFERENCES `events`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "invitations_role_check" CHECK("invitations"."role" IN ('organization_owner','organization_admin','event_manager','content_editor','publisher','reviewer_staff')),
	CONSTRAINT "invitations_token_hash_check" CHECK(length("invitations"."token_hash") = 64 AND "invitations"."token_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "invitations_email_hash_check" CHECK(length("invitations"."email_hash") = 64 AND "invitations"."email_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "invitations_expiry_check" CHECK("invitations"."expires_at" > "invitations"."created_at"),
	CONSTRAINT "invitations_acceptance_check" CHECK("invitations"."accepted_at" IS NULL OR ("invitations"."revoked_at" IS NULL AND "invitations"."accepted_at" <= "invitations"."expires_at"))
);
--> statement-breakpoint
CREATE INDEX `invitations_org_email_idx` ON `invitations` (`organization_id`,`email_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_org_id_unique` ON `invitations` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_token_hash_unique` ON `invitations` (`token_hash`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`event_id` text,
	`edition_id` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`r2_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`original_name` text NOT NULL,
	`license_status` text DEFAULT 'pending' NOT NULL,
	`license_note` text DEFAULT '' NOT NULL,
	`alt_text` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`uploaded_by` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`event_id`) REFERENCES `events`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`edition_id`) REFERENCES `editions`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "media_assets_owner_check" CHECK((
      ("media_assets"."owner_type" = 'organization' AND "media_assets"."owner_id" = "media_assets"."organization_id" AND "media_assets"."event_id" IS NULL AND "media_assets"."edition_id" IS NULL)
      OR ("media_assets"."owner_type" = 'event' AND "media_assets"."owner_id" = "media_assets"."event_id" AND "media_assets"."event_id" IS NOT NULL AND "media_assets"."edition_id" IS NULL)
      OR ("media_assets"."owner_type" = 'edition' AND "media_assets"."owner_id" = "media_assets"."edition_id" AND "media_assets"."edition_id" IS NOT NULL AND "media_assets"."event_id" IS NULL)
    )),
	CONSTRAINT "media_assets_visibility_check" CHECK("media_assets"."visibility" IN ('private','public')),
	CONSTRAINT "media_assets_license_check" CHECK("media_assets"."license_status" IN ('pending','licensed','owned','rejected')),
	CONSTRAINT "media_assets_public_license_check" CHECK("media_assets"."visibility" != 'public' OR "media_assets"."license_status" IN ('licensed','owned')),
	CONSTRAINT "media_assets_status_check" CHECK("media_assets"."status" IN ('ready','archived')),
	CONSTRAINT "media_assets_size_check" CHECK("media_assets"."size" > 0 AND "media_assets"."size" <= 10485760),
	CONSTRAINT "media_assets_key_scope_check" CHECK(substr("media_assets"."r2_key", 1, length('org/' || "media_assets"."organization_id" || '/')) = 'org/' || "media_assets"."organization_id" || '/'),
	CONSTRAINT "media_assets_revision_check" CHECK("media_assets"."revision" >= 1)
);
--> statement-breakpoint
CREATE INDEX `media_assets_org_owner_idx` ON `media_assets` (`organization_id`,`owner_type`,`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_org_id_unique` ON `media_assets` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_r2_key_unique` ON `media_assets` (`r2_key`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "memberships_role_check" CHECK("memberships"."role" IN ('organization_owner','organization_admin','event_manager','content_editor','publisher','reviewer_staff')),
	CONSTRAINT "memberships_status_check" CHECK("memberships"."status" IN ('active','revoked')),
	CONSTRAINT "memberships_revision_check" CHECK("memberships"."revision" >= 1)
);
--> statement-breakpoint
CREATE INDEX `memberships_user_status_idx` ON `memberships` (`user_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_org_user_unique` ON `memberships` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_org_id_unique` ON `memberships` (`organization_id`,`id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`timezone` text DEFAULT 'America/Sao_Paulo' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`tokens_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "organizations_status_check" CHECK("organizations"."status" IN ('active','suspended','archived')),
	CONSTRAINT "organizations_slug_check" CHECK(length("organizations"."slug") BETWEEN 1 AND 80 AND "organizations"."slug" = lower("organizations"."slug") AND "organizations"."slug" NOT GLOB '*[^a-z0-9-]*'),
	CONSTRAINT "organizations_name_check" CHECK(length(trim("organizations"."name")) > 0),
	CONSTRAINT "organizations_revision_check" CHECK("organizations"."revision" >= 1),
	CONSTRAINT "organizations_tokens_check" CHECK(json_valid("organizations"."tokens_json") AND json_type("organizations"."tokens_json") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `platform_owners` (
	`user_id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`name` text NOT NULL,
	`address_public` text DEFAULT '' NOT NULL,
	`geodata_json` text,
	`accessibility` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`edition_id`) REFERENCES `editions`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "venues_name_check" CHECK(length(trim("venues"."name")) > 0),
	CONSTRAINT "venues_revision_check" CHECK("venues"."revision" >= 1),
	CONSTRAINT "venues_geodata_check" CHECK("venues"."geodata_json" IS NULL OR (json_valid("venues"."geodata_json") AND json_type("venues"."geodata_json") = 'object'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venues_org_id_unique` ON `venues` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `venues_org_edition_id_unique` ON `venues` (`organization_id`,`edition_id`,`id`);