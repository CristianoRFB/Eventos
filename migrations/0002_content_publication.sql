CREATE TABLE `content_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`revision` integer NOT NULL,
	`content_json` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`edition_id`) REFERENCES `editions`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_drafts_revision_check" CHECK("content_drafts"."revision" >= 1),
	CONSTRAINT "content_drafts_json_check" CHECK(json_valid("content_drafts"."content_json") AND json_type("content_drafts"."content_json") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_drafts_org_id_unique` ON `content_drafts` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_drafts_edition_revision_unique` ON `content_drafts` (`organization_id`,`edition_id`,`revision`);--> statement-breakpoint
CREATE TABLE `content_faq_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`page_id` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`page_id`) REFERENCES `pages`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_faq_question_check" CHECK(length(trim("content_faq_items"."question")) > 0),
	CONSTRAINT "content_faq_answer_check" CHECK(length(trim("content_faq_items"."answer")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_faq_org_id_unique` ON `content_faq_items` (`organization_id`,`id`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`draft_id`) REFERENCES `content_drafts`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "pages_slug_check" CHECK("pages"."slug" = 'home' OR ("pages"."slug" = lower("pages"."slug") AND "pages"."slug" NOT GLOB '*[^a-z0-9-]*' AND length("pages"."slug") BETWEEN 1 AND 100)),
	CONSTRAINT "pages_title_check" CHECK(length(trim("pages"."title")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_org_id_unique` ON `pages` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pages_draft_slug_unique` ON `pages` (`organization_id`,`draft_id`,`slug`);--> statement-breakpoint
CREATE TABLE `content_redirects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`from_slug` text NOT NULL,
	`to_slug` text NOT NULL,
	`status_code` integer DEFAULT 301 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`edition_id`) REFERENCES `editions`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "content_redirects_code_check" CHECK("content_redirects"."status_code" IN (301, 302))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_redirects_org_id_unique` ON `content_redirects` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_redirects_source_unique` ON `content_redirects` (`organization_id`,`edition_id`,`from_slug`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`page_id` text NOT NULL,
	`type` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`content_json` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`page_id`) REFERENCES `pages`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sections_type_check" CHECK("sections"."type" IN ('hero','cards','agenda','cta','faq','sponsors','gallery','text')),
	CONSTRAINT "sections_json_check" CHECK(json_valid("sections"."content_json") AND json_type("sections"."content_json") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sections_org_id_unique` ON `sections` (`organization_id`,`id`);--> statement-breakpoint
CREATE TABLE `domain_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`hostname` text NOT NULL,
	`destination` text NOT NULL,
	`destination_id` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`ownership_verified` integer DEFAULT false NOT NULL,
	`hostname_status` text,
	`ssl_status` text,
	`dns_verified` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`destination_id`) REFERENCES `editions`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "domain_bindings_version_check" CHECK("domain_bindings"."version" >= 1),
	CONSTRAINT "domain_bindings_status_check" CHECK("domain_bindings"."status" IN ('requested','ownership_pending','tls_pending','dns_pending','active','suspended','releasing','released','failed')),
	CONSTRAINT "domain_bindings_hostname_check" CHECK(length("domain_bindings"."hostname") BETWEEN 3 AND 253 AND "domain_bindings"."hostname" = lower("domain_bindings"."hostname"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domain_bindings_hostname_unique` ON `domain_bindings` (`hostname`);--> statement-breakpoint
CREATE UNIQUE INDEX `domain_bindings_org_id_unique` ON `domain_bindings` (`organization_id`,`id`);--> statement-breakpoint
CREATE TABLE `edition_publication_pointers` (
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`publication_id` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`edition_id`) REFERENCES `editions`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`edition_id`,`publication_id`) REFERENCES `publications`(`organization_id`,`edition_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "edition_publication_revision_check" CHECK("edition_publication_pointers"."revision" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `edition_publication_pointers_pk` ON `edition_publication_pointers` (`organization_id`,`edition_id`);--> statement-breakpoint
CREATE TABLE `publications` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`source_draft_id` text NOT NULL,
	`revision` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_by` text NOT NULL,
	`rollback_of_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`edition_id`) REFERENCES `editions`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`source_draft_id`) REFERENCES `content_drafts`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`rollback_of_id`) REFERENCES `publications`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "publications_revision_check" CHECK("publications"."revision" >= 1),
	CONSTRAINT "publications_json_check" CHECK(json_valid("publications"."snapshot_json") AND json_type("publications"."snapshot_json") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publications_org_id_unique` ON `publications` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `publications_edition_id_unique` ON `publications` (`organization_id`,`edition_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `publications_edition_revision_unique` ON `publications` (`organization_id`,`edition_id`,`revision`);--> statement-breakpoint

-- Editorial revisions and snapshots are append-only. Only the pointer may move,
-- and every move advances exactly one publication revision.
CREATE TRIGGER content_drafts_no_update BEFORE UPDATE ON content_drafts
BEGIN SELECT RAISE(ABORT, 'immutable_content_draft'); END;--> statement-breakpoint
CREATE TRIGGER content_drafts_no_delete BEFORE DELETE ON content_drafts
BEGIN SELECT RAISE(ABORT, 'immutable_content_draft'); END;--> statement-breakpoint
CREATE TRIGGER pages_no_update BEFORE UPDATE ON pages
BEGIN SELECT RAISE(ABORT, 'immutable_content_page'); END;--> statement-breakpoint
CREATE TRIGGER pages_no_delete BEFORE DELETE ON pages
BEGIN SELECT RAISE(ABORT, 'immutable_content_page'); END;--> statement-breakpoint
CREATE TRIGGER sections_no_update BEFORE UPDATE ON sections
BEGIN SELECT RAISE(ABORT, 'immutable_content_section'); END;--> statement-breakpoint
CREATE TRIGGER sections_no_delete BEFORE DELETE ON sections
BEGIN SELECT RAISE(ABORT, 'immutable_content_section'); END;--> statement-breakpoint
CREATE TRIGGER content_faq_no_update BEFORE UPDATE ON content_faq_items
BEGIN SELECT RAISE(ABORT, 'immutable_content_faq'); END;--> statement-breakpoint
CREATE TRIGGER content_faq_no_delete BEFORE DELETE ON content_faq_items
BEGIN SELECT RAISE(ABORT, 'immutable_content_faq'); END;--> statement-breakpoint
CREATE TRIGGER publications_no_update BEFORE UPDATE ON publications
BEGIN SELECT RAISE(ABORT, 'immutable_publication'); END;--> statement-breakpoint
CREATE TRIGGER publications_no_delete BEFORE DELETE ON publications
BEGIN SELECT RAISE(ABORT, 'immutable_publication'); END;--> statement-breakpoint
CREATE TRIGGER edition_publication_pointer_update_guard BEFORE UPDATE ON edition_publication_pointers
WHEN NEW.organization_id != OLD.organization_id OR NEW.edition_id != OLD.edition_id OR NEW.revision != OLD.revision + 1
BEGIN SELECT RAISE(ABORT, 'invalid_publication_pointer_update'); END;--> statement-breakpoint
CREATE TRIGGER edition_publication_pointer_no_delete BEFORE DELETE ON edition_publication_pointers
BEGIN SELECT RAISE(ABORT, 'immutable_publication_pointer'); END;
