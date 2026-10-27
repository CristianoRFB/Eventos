-- F6 controlled rewrap: original encrypted columns remain immutable/redaction-only.
-- Rewrapped AES-GCM envelopes live in a tenant-scoped shadow record, and the
-- original remains accessible for rollback until normal retention clears it.
CREATE TABLE private_cipher_rewraps (
  organization_id text NOT NULL,
  source_kind text NOT NULL,
  source_id text NOT NULL,
  field_name text NOT NULL,
  source_hash text NOT NULL,
  rewrapped_ciphertext text NOT NULL,
  created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  PRIMARY KEY(organization_id,source_kind,source_id,field_name),
  CONSTRAINT rewrap_source_kind CHECK(source_kind IN ('submission','reply')),
  CONSTRAINT rewrap_field CHECK(
    (source_kind='submission' AND field_name IN ('answers','profile')) OR
    (source_kind='reply' AND field_name='reply')
  ),
  CONSTRAINT rewrap_source_hash CHECK(length(source_hash)=64 AND source_hash NOT GLOB '*[^0-9a-f]*'),
  CONSTRAINT rewrap_envelope CHECK(rewrapped_ciphertext LIKE 'v2.%')
);
--> statement-breakpoint
CREATE INDEX rewrap_by_tenant ON private_cipher_rewraps(organization_id,source_kind,source_id);
--> statement-breakpoint
CREATE TRIGGER rewrap_insert_live BEFORE INSERT ON private_cipher_rewraps
WHEN NOT (
  (NEW.source_kind='submission' AND EXISTS(
    SELECT 1 FROM form_submissions s WHERE s.organization_id=NEW.organization_id
      AND s.id=NEW.source_id AND s.state='active'
      AND s.retention_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')
      AND ((NEW.field_name='answers' AND s.answers_ciphertext IS NOT NULL)
        OR (NEW.field_name='profile' AND s.profile_ciphertext IS NOT NULL))
  )) OR
  (NEW.source_kind='reply' AND EXISTS(
    SELECT 1 FROM application_replies r
    JOIN exhibitor_applications a ON a.organization_id=r.organization_id AND a.id=r.application_id
    JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
    WHERE r.organization_id=NEW.organization_id AND r.id=NEW.source_id
      AND r.reply_ciphertext IS NOT NULL AND s.state='active'
      AND s.retention_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')
  ))
) BEGIN SELECT RAISE(ABORT,'rewrap_source_not_live'); END;
--> statement-breakpoint
CREATE TRIGGER rewrap_scope_immutable BEFORE UPDATE OF organization_id,source_kind,source_id,field_name,source_hash,created_at
ON private_cipher_rewraps BEGIN SELECT RAISE(ABORT,'rewrap_scope_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER rewrap_update_live BEFORE UPDATE OF rewrapped_ciphertext ON private_cipher_rewraps
WHEN NOT (
  (OLD.source_kind='submission' AND EXISTS(
    SELECT 1 FROM form_submissions s WHERE s.organization_id=OLD.organization_id
      AND s.id=OLD.source_id AND s.state='active'
      AND s.retention_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')
      AND ((OLD.field_name='answers' AND s.answers_ciphertext IS NOT NULL)
        OR (OLD.field_name='profile' AND s.profile_ciphertext IS NOT NULL))
  )) OR
  (OLD.source_kind='reply' AND EXISTS(
    SELECT 1 FROM application_replies r
    JOIN exhibitor_applications a ON a.organization_id=r.organization_id AND a.id=r.application_id
    JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
    WHERE r.organization_id=OLD.organization_id AND r.id=OLD.source_id
      AND r.reply_ciphertext IS NOT NULL AND s.state='active'
      AND s.retention_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')
  ))
) BEGIN SELECT RAISE(ABORT,'rewrap_source_not_live'); END;
--> statement-breakpoint
CREATE TRIGGER rewrap_delete_with_submission AFTER UPDATE ON form_submissions
WHEN NEW.state!='active' OR (OLD.answers_ciphertext IS NOT NULL AND NEW.answers_ciphertext IS NULL)
  OR (OLD.profile_ciphertext IS NOT NULL AND NEW.profile_ciphertext IS NULL)
BEGIN
  DELETE FROM private_cipher_rewraps WHERE organization_id=NEW.organization_id
    AND source_kind='submission' AND source_id=NEW.id
    AND (NEW.state!='active' OR
      (field_name='answers' AND NEW.answers_ciphertext IS NULL) OR
      (field_name='profile' AND NEW.profile_ciphertext IS NULL));
  DELETE FROM private_cipher_rewraps WHERE organization_id=NEW.organization_id
    AND source_kind='reply'
    AND source_id IN (
      SELECT r.id FROM application_replies r
      JOIN exhibitor_applications a ON a.organization_id=r.organization_id AND a.id=r.application_id
      WHERE a.organization_id=NEW.organization_id AND a.submission_id=NEW.id
    )
    AND NEW.state!='active';
END;
--> statement-breakpoint
CREATE TRIGGER rewrap_delete_with_reply AFTER UPDATE OF reply_ciphertext ON application_replies
WHEN NEW.reply_ciphertext IS NULL
BEGIN
  DELETE FROM private_cipher_rewraps WHERE organization_id=NEW.organization_id
    AND source_kind='reply' AND source_id=NEW.id;
END;
