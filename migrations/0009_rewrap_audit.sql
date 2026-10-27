-- Durable, append-only audit of internal key rewrap operations.
-- Records key ids, never ciphertext, answers, email, or key material.
CREATE TABLE private_cipher_rewrap_events (
  id integer PRIMARY KEY AUTOINCREMENT,
  organization_id text NOT NULL,
  source_kind text NOT NULL,
  source_id text NOT NULL,
  field_name text NOT NULL,
  from_key text,
  to_key text NOT NULL,
  action text NOT NULL,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CONSTRAINT cipher_rewrap_event_action CHECK(action IN ('created','rotated'))
);
--> statement-breakpoint
CREATE INDEX rewrap_events_by_source
 ON private_cipher_rewrap_events(organization_id,source_kind,source_id,created_at);
--> statement-breakpoint
CREATE TRIGGER rewrap_events_immutable_update BEFORE UPDATE ON private_cipher_rewrap_events
BEGIN SELECT RAISE(ABORT,'immutable_rewrap_audit'); END;
--> statement-breakpoint
CREATE TRIGGER rewrap_events_immutable_delete BEFORE DELETE ON private_cipher_rewrap_events
BEGIN SELECT RAISE(ABORT,'immutable_rewrap_audit'); END;
--> statement-breakpoint
CREATE TRIGGER rewrap_event_insert AFTER INSERT ON private_cipher_rewraps
BEGIN
 INSERT INTO private_cipher_rewrap_events(organization_id,source_kind,source_id,field_name,from_key,to_key,action)
 VALUES(NEW.organization_id,NEW.source_kind,NEW.source_id,NEW.field_name,
  'legacy',
  substr(NEW.rewrapped_ciphertext,4,instr(substr(NEW.rewrapped_ciphertext,4),'.')-1),
  'created');
END;
--> statement-breakpoint
CREATE TRIGGER rewrap_event_rotate AFTER UPDATE OF rewrapped_ciphertext ON private_cipher_rewraps
WHEN OLD.rewrapped_ciphertext IS NOT NEW.rewrapped_ciphertext
BEGIN
 INSERT INTO private_cipher_rewrap_events(organization_id,source_kind,source_id,field_name,from_key,to_key,action)
 VALUES(NEW.organization_id,NEW.source_kind,NEW.source_id,NEW.field_name,
  substr(OLD.rewrapped_ciphertext,4,instr(substr(OLD.rewrapped_ciphertext,4),'.')-1),
  substr(NEW.rewrapped_ciphertext,4,instr(substr(NEW.rewrapped_ciphertext,4),'.')-1),
  'rotated');
END;
