-- A pointer must always name the immutable publication carrying that revision.
CREATE TRIGGER edition_publication_pointer_insert_target BEFORE INSERT ON edition_publication_pointers
WHEN NOT EXISTS (
  SELECT 1 FROM publications p
  WHERE p.organization_id=NEW.organization_id
    AND p.edition_id=NEW.edition_id
    AND p.id=NEW.publication_id
    AND p.revision=NEW.revision
)
BEGIN SELECT RAISE(ABORT, 'invalid_publication_pointer_target'); END;
--> statement-breakpoint
CREATE TRIGGER edition_publication_pointer_update_target BEFORE UPDATE OF publication_id,revision ON edition_publication_pointers
WHEN NOT EXISTS (
  SELECT 1 FROM publications p
  WHERE p.organization_id=NEW.organization_id
    AND p.edition_id=NEW.edition_id
    AND p.id=NEW.publication_id
    AND p.revision=NEW.revision
)
BEGIN SELECT RAISE(ABORT, 'invalid_publication_pointer_target'); END;
