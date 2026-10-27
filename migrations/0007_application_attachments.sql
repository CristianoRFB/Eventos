-- Private applicant images, never published as media assets.
-- Foreign key checks and count trigger prevent cross-tenant references and races.
CREATE TABLE application_attachments (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL,
  edition_id text NOT NULL,
  application_id text NOT NULL,
  object_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime text NOT NULL,
  byte_size integer NOT NULL,
  sha256 text NOT NULL,
  state text DEFAULT 'ready' NOT NULL,
  created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  removed_at text,
  FOREIGN KEY (organization_id,edition_id,application_id)
    REFERENCES exhibitor_applications(organization_id,edition_id,id),
  CONSTRAINT attachment_mime CHECK(mime IN ('image/png','image/jpeg','image/webp')),
  CONSTRAINT attachment_size CHECK(byte_size>0 AND byte_size<=2097152),
  CONSTRAINT attachment_hash CHECK(length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*'),
  CONSTRAINT attachment_key CHECK(object_key LIKE ('org/'||organization_id||'/applications/'||application_id||'/%')),
  CONSTRAINT attachment_state CHECK(state IN ('ready','delete_pending','deleted')),
  CONSTRAINT attachment_deleted_time CHECK((state='ready' AND removed_at IS NULL) OR (state='delete_pending') OR (state='deleted' AND removed_at IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX application_attachments_by_app ON application_attachments(organization_id,application_id,state);
--> statement-breakpoint
CREATE INDEX application_attachments_cleanup ON application_attachments(state,created_at);
--> statement-breakpoint
CREATE TRIGGER attachments_limit_per_application BEFORE INSERT ON application_attachments
WHEN (SELECT count(*) FROM application_attachments WHERE organization_id=NEW.organization_id AND application_id=NEW.application_id AND state!='deleted')>=3
BEGIN SELECT RAISE(ABORT,'attachment_limit'); END;
--> statement-breakpoint
CREATE TRIGGER attachment_identity_immutable BEFORE UPDATE OF id,organization_id,edition_id,application_id,object_key,mime,byte_size,sha256,created_at
ON application_attachments BEGIN SELECT RAISE(ABORT,'attachment_identity_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER attachment_state_forward_only BEFORE UPDATE OF state ON application_attachments
WHEN (OLD.state='deleted' AND NEW.state!='deleted') OR
(OLD.state='delete_pending' AND NEW.state='ready')
BEGIN SELECT RAISE(ABORT,'attachment_state_forward_only'); END;
