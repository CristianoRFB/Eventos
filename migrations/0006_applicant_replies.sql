-- F6 applicant response: encrypted, per-requested revision, tenant- and edition-scoped.
-- Does not store plaintext or a new applicant identity.
CREATE TABLE application_replies (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL,
  edition_id text NOT NULL,
  application_id text NOT NULL,
  requested_revision integer NOT NULL,
  reply_ciphertext text,
  created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (organization_id,edition_id,application_id)
    REFERENCES exhibitor_applications(organization_id,edition_id,id),
  CONSTRAINT "application_reply_revision" CHECK (requested_revision>=1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX application_replies_once_per_request
ON application_replies(organization_id,application_id,requested_revision);
--> statement-breakpoint
CREATE INDEX application_replies_by_application
ON application_replies(organization_id,application_id,created_at);
--> statement-breakpoint
CREATE TRIGGER application_reply_identity_immutable
BEFORE UPDATE OF id,organization_id,edition_id,application_id,requested_revision,created_at
ON application_replies BEGIN SELECT RAISE(ABORT,'immutable_applicant_reply'); END;
--> statement-breakpoint
CREATE TRIGGER application_reply_redaction_only
BEFORE UPDATE OF reply_ciphertext ON application_replies
WHEN NEW.reply_ciphertext IS NOT NULL
BEGIN SELECT RAISE(ABORT,'application_reply_redaction_only'); END;
--> statement-breakpoint
CREATE TRIGGER application_reply_no_delete
BEFORE DELETE ON application_replies BEGIN SELECT RAISE(ABORT,'immutable_applicant_reply_audit'); END;
