-- A statement-atomic last-owner check remains safe under competing requests.
CREATE TRIGGER memberships_last_owner_update BEFORE UPDATE OF role,status ON memberships
WHEN OLD.role='organization_owner' AND OLD.status='active'
 AND (NEW.role!='organization_owner' OR NEW.status!='active')
 AND NOT EXISTS(SELECT 1 FROM memberships WHERE organization_id=OLD.organization_id AND id!=OLD.id AND role='organization_owner' AND status='active')
BEGIN SELECT RAISE(ABORT, 'last_owner'); END;
CREATE TRIGGER memberships_last_owner_delete BEFORE DELETE ON memberships
WHEN OLD.role='organization_owner' AND OLD.status='active'
 AND NOT EXISTS(SELECT 1 FROM memberships WHERE organization_id=OLD.organization_id AND id!=OLD.id AND role='organization_owner' AND status='active')
BEGIN SELECT RAISE(ABORT, 'last_owner'); END;
CREATE TRIGGER memberships_identity_immutable BEFORE UPDATE OF organization_id,user_id,id ON memberships
WHEN NEW.organization_id!=OLD.organization_id OR NEW.user_id!=OLD.user_id OR NEW.id!=OLD.id
BEGIN SELECT RAISE(ABORT, 'immutable_membership_identity'); END;
CREATE TRIGGER memberships_no_replace BEFORE INSERT ON memberships
WHEN EXISTS(SELECT 1 FROM memberships WHERE id=NEW.id OR (organization_id=NEW.organization_id AND user_id=NEW.user_id))
BEGIN SELECT RAISE(ABORT, 'membership_exists'); END;
CREATE TRIGGER audit_events_no_replace BEFORE INSERT ON audit_events
WHEN EXISTS(SELECT 1 FROM audit_events WHERE id=NEW.id)
BEGIN SELECT RAISE(ABORT, 'immutable_audit'); END;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events
BEGIN SELECT RAISE(ABORT, 'immutable_audit'); END;
CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events
BEGIN SELECT RAISE(ABORT, 'immutable_audit'); END;
