import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("tenant constraints in the versioned SQLite migrations", () => {
  let database: DatabaseSync;
  const run = (query: string, ...values: (string | number | null)[]) =>
    database.prepare(query).run(...values);

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys = ON");
    const migrationDirectory = resolve(process.cwd(), "migrations");
    const files = readdirSync(migrationDirectory)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    expect(
      files.length,
      "generate the Drizzle migration before running this suite",
    ).toBeGreaterThan(0);
    for (const file of files)
      database.exec(readFileSync(resolve(migrationDirectory, file), "utf8"));
    run(
      "INSERT INTO organizations (id,slug,name) VALUES (?,?,?)",
      "org-a",
      "org-a",
      "Organizadora A",
    );
    run(
      "INSERT INTO organizations (id,slug,name) VALUES (?,?,?)",
      "org-b",
      "org-b",
      "Organizadora B",
    );
    for (const key of ["a", "b"]) {
      run(
        "INSERT INTO user (id,name,email,created_at,updated_at) VALUES (?,?,?,?,?)",
        `user-${key}`,
        `Owner ${key}`,
        `owner-${key}@example.test`,
        1,
        1,
      );
      run(
        "INSERT INTO memberships (id,organization_id,user_id,role) VALUES (?,?,?,?)",
        `member-${key}`,
        `org-${key}`,
        `user-${key}`,
        "organization_owner",
      );
      run(
        "INSERT INTO events (id,organization_id,slug,name) VALUES (?,?,?,?)",
        `event-${key}`,
        `org-${key}`,
        "festival",
        `Evento ${key}`,
      );
      run(
        "INSERT INTO editions (id,organization_id,event_id,edition_key,name) VALUES (?,?,?,?,?)",
        `edition-${key}`,
        `org-${key}`,
        `event-${key}`,
        "2026",
        `Edição ${key}`,
      );
    }
  });

  afterEach(() => database?.close());

  it("permits repeated public slugs across organizations and rejects duplicates inside one", () => {
    expect(
      database
        .prepare("SELECT count(*) AS count FROM events WHERE slug = ?")
        .get("festival"),
    ).toMatchObject({ count: 2 });
    expect(() =>
      run(
        "INSERT INTO events (id,organization_id,slug,name) VALUES (?,?,?,?)",
        "event-a-duplicate",
        "org-a",
        "festival",
        "Duplicado",
      ),
    ).toThrow(/UNIQUE constraint/);
    expect(() =>
      run(
        "INSERT INTO editions (id,organization_id,event_id,edition_key,name) VALUES (?,?,?,?,?)",
        "edition-a-duplicate",
        "org-a",
        "event-a",
        "2026",
        "Duplicada",
      ),
    ).toThrow(/UNIQUE constraint/);
  });

  it("rejects cross-organization edition and venue references on inserts and updates", () => {
    expect(() =>
      run(
        "INSERT INTO editions (id,organization_id,event_id,edition_key,name) VALUES (?,?,?,?,?)",
        "forged-edition",
        "org-a",
        "event-b",
        "forged",
        "Forjada",
      ),
    ).toThrow(/FOREIGN KEY constraint/);
    expect(() =>
      run(
        "UPDATE editions SET event_id = ? WHERE id = ?",
        "event-b",
        "edition-a",
      ),
    ).toThrow(/FOREIGN KEY constraint/);
    expect(() =>
      run(
        "INSERT INTO venues (id,organization_id,edition_id,name) VALUES (?,?,?,?)",
        "forged-venue",
        "org-a",
        "edition-b",
        "Forjado",
      ),
    ).toThrow(/FOREIGN KEY constraint/);
    run(
      "INSERT INTO venues (id,organization_id,edition_id,name) VALUES (?,?,?,?)",
      "venue-a",
      "org-a",
      "edition-a",
      "Local A",
    );
    expect(
      database
        .prepare("SELECT edition_id FROM venues WHERE id = ?")
        .get("venue-a"),
    ).toMatchObject({ edition_id: "edition-a" });
  });

  it("requires event assignments to reference both an event and a membership in the same organization", () => {
    expect(() =>
      run(
        "INSERT INTO event_assignments (id,organization_id,event_id,user_id) VALUES (?,?,?,?)",
        "forged-event",
        "org-a",
        "event-b",
        "user-a",
      ),
    ).toThrow(/FOREIGN KEY constraint/);
    expect(() =>
      run(
        "INSERT INTO event_assignments (id,organization_id,event_id,user_id) VALUES (?,?,?,?)",
        "forged-member",
        "org-a",
        "event-a",
        "user-b",
      ),
    ).toThrow(/FOREIGN KEY constraint/);
    run(
      "INSERT INTO event_assignments (id,organization_id,event_id,user_id) VALUES (?,?,?,?)",
      "assignment-a",
      "org-a",
      "event-a",
      "user-a",
    );
    expect(
      database.prepare("SELECT count(*) AS count FROM event_assignments").get(),
    ).toMatchObject({ count: 1 });
  });

  const media = (
    id: string,
    organization: string,
    ownerType = "organization",
    ownerId = organization,
    eventId: string | null = null,
    editionId: string | null = null,
    visibility = "private",
    license = "owned",
    key = `org/${organization}/${id}.png`,
  ) =>
    run(
      "INSERT INTO media_assets (id,organization_id,owner_type,owner_id,event_id,edition_id,visibility,r2_key,mime,size,original_name,license_status,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      organization,
      ownerType,
      ownerId,
      eventId,
      editionId,
      visibility,
      key,
      "image/png",
      128,
      "image.png",
      license,
      organization === "org-a" ? "user-a" : "user-b",
    );

  it("enforces media owner shape, tenant foreign keys, object prefix, and public licensing", () => {
    media("asset-a", "org-a");
    media("asset-event-a", "org-a", "event", "event-a", "event-a");
    media(
      "asset-edition-a",
      "org-a",
      "edition",
      "edition-a",
      null,
      "edition-a",
    );
    expect(() =>
      media("wrong-org-owner", "org-a", "organization", "org-b"),
    ).toThrow(/CHECK constraint/);
    expect(() =>
      media("wrong-event", "org-a", "event", "event-b", "event-b"),
    ).toThrow(/FOREIGN KEY constraint/);
    expect(() =>
      media(
        "wrong-edition",
        "org-a",
        "edition",
        "edition-b",
        null,
        "edition-b",
      ),
    ).toThrow(/FOREIGN KEY constraint/);
    expect(() =>
      media(
        "ambiguous-owner",
        "org-a",
        "event",
        "event-a",
        "event-a",
        "edition-a",
      ),
    ).toThrow(/CHECK constraint/);
    expect(() =>
      media(
        "wrong-key",
        "org-a",
        "organization",
        "org-a",
        null,
        null,
        "private",
        "owned",
        "org/org-b/file.png",
      ),
    ).toThrow(/CHECK constraint/);
    expect(() =>
      media(
        "unlicensed",
        "org-a",
        "organization",
        "org-a",
        null,
        null,
        "public",
        "pending",
      ),
    ).toThrow(/CHECK constraint/);
    media(
      "licensed",
      "org-a",
      "organization",
      "org-a",
      null,
      null,
      "public",
      "licensed",
    );
  });

  it("rejects cross-tenant branding and logo references", () => {
    media("asset-b", "org-b");
    run(
      "INSERT INTO brand_profiles (id,organization_id,name,logo_asset_id) VALUES (?,?,?,?)",
      "brand-b",
      "org-b",
      "Marca B",
      "asset-b",
    );
    expect(() =>
      run(
        "INSERT INTO brand_profiles (id,organization_id,name,logo_asset_id) VALUES (?,?,?,?)",
        "brand-a",
        "org-a",
        "Marca A",
        "asset-b",
      ),
    ).toThrow(/FOREIGN KEY constraint/);
    expect(() =>
      run(
        "UPDATE events SET brand_profile_id = ? WHERE id = ?",
        "brand-b",
        "event-a",
      ),
    ).toThrow(/FOREIGN KEY constraint/);
    expect(() =>
      run(
        "UPDATE editions SET brand_profile_id = ? WHERE id = ?",
        "brand-b",
        "edition-a",
      ),
    ).toThrow(/FOREIGN KEY constraint/);
    run(
      "UPDATE events SET brand_profile_id = ? WHERE id = ?",
      "brand-b",
      "event-b",
    );
  });

  it("keeps platform ownership outside tenant roles and requires a real identity", () => {
    expect(() =>
      run(
        "INSERT INTO memberships (id,organization_id,user_id,role) VALUES (?,?,?,?)",
        "forged-global-role",
        "org-a",
        "user-b",
        "platform_owner",
      ),
    ).toThrow(/CHECK constraint/);
    expect(() =>
      run("INSERT INTO platform_owners (user_id) VALUES (?)", "missing-user"),
    ).toThrow(/FOREIGN KEY constraint/);
    run("INSERT INTO platform_owners (user_id) VALUES (?)", "user-a");
    expect(() =>
      run(
        "INSERT INTO memberships (id,organization_id,user_id,role) VALUES (?,?,?,?)",
        "duplicate-member",
        "org-a",
        "user-a",
        "organization_admin",
      ),
    ).toThrow(/UNIQUE constraint|membership_exists/);
  });

  it("stores only SHA-256 invitation hashes with coherent use and expiry dates", () => {
    const insert = (tokenHash: string, expiresAt: string) =>
      run(
        "INSERT INTO invitations (id,organization_id,email_hash,token_hash,role,invited_by,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?)",
        "invite-a",
        "org-a",
        "a".repeat(64),
        tokenHash,
        "content_editor",
        "user-a",
        "2026-10-14T12:00:00.000Z",
        expiresAt,
      );
    expect(() =>
      insert("raw-secret-token", "2026-10-15T12:00:00.000Z"),
    ).toThrow(/CHECK constraint/);
    expect(() => insert("b".repeat(64), "2026-10-13T12:00:00.000Z")).toThrow(
      /CHECK constraint/,
    );
    insert("b".repeat(64), "2026-10-15T12:00:00.000Z");
    expect(() =>
      run(
        "UPDATE invitations SET accepted_at = ? WHERE id = ?",
        "2026-10-16T12:00:00.000Z",
        "invite-a",
      ),
    ).toThrow(/CHECK constraint/);
    run(
      "UPDATE invitations SET accepted_at = ? WHERE id = ?",
      "2026-10-14T13:00:00.000Z",
      "invite-a",
    );
    expect(() =>
      run(
        "UPDATE invitations SET revoked_at = ? WHERE id = ?",
        "2026-10-14T14:00:00.000Z",
        "invite-a",
      ),
    ).toThrow(/CHECK constraint/);
  });

  it("preserves organization A while valid data in B is changed and rejects invalid revisions and intervals", () => {
    const before = database
      .prepare("SELECT * FROM editions WHERE organization_id = ?")
      .all("org-a");
    run(
      "UPDATE editions SET name = ?, revision = revision + 1 WHERE organization_id = ? AND id = ?",
      "Edição B atualizada",
      "org-b",
      "edition-b",
    );
    expect(
      database
        .prepare("SELECT * FROM editions WHERE organization_id = ?")
        .all("org-a"),
    ).toEqual(before);
    expect(() =>
      run("UPDATE editions SET revision = 0 WHERE id = ?", "edition-a"),
    ).toThrow(/CHECK constraint/);
    expect(() =>
      run(
        "UPDATE editions SET start_at = ?, end_at = ? WHERE id = ?",
        "2026-10-15T12:00:00.000Z",
        "2026-10-14T12:00:00.000Z",
        "edition-a",
      ),
    ).toThrow(/CHECK constraint/);
    expect(() =>
      run(
        "UPDATE organizations SET status = ? WHERE id = ?",
        "deleted",
        "org-a",
      ),
    ).toThrow(/CHECK constraint/);
  });

  it("prevents direct demotion, revocation, and deletion of the last active owner", () => {
    expect(() =>
      run(
        "UPDATE memberships SET role = 'content_editor' WHERE id = ?",
        "member-a",
      ),
    ).toThrow(/last_owner/);
    expect(() =>
      run("UPDATE memberships SET status = 'revoked' WHERE id = ?", "member-a"),
    ).toThrow(/last_owner/);
    expect(() =>
      run("DELETE FROM memberships WHERE id = ?", "member-a"),
    ).toThrow(/last_owner/);
    expect(
      database
        .prepare("SELECT role,status FROM memberships WHERE id = ?")
        .get("member-a"),
    ).toMatchObject({ role: "organization_owner", status: "active" });
  });

  it("allows an owner transfer and denies the second competing owner revocation", () => {
    run(
      "INSERT INTO memberships (id,organization_id,user_id,role) VALUES (?,?,?,?)",
      "second-owner-a",
      "org-a",
      "user-b",
      "organization_owner",
    );
    // Both requests can observe two owners; the write-time trigger sees each serialized result.
    const observedCount = database
      .prepare(
        "SELECT count(*) AS count FROM memberships WHERE organization_id = ? AND role = 'organization_owner' AND status = 'active'",
      )
      .get("org-a");
    expect(observedCount).toMatchObject({ count: 2 });
    run(
      "UPDATE memberships SET status = 'revoked',revision = revision + 1 WHERE id = ? AND revision = ?",
      "member-a",
      1,
    );
    expect(() =>
      run(
        "UPDATE memberships SET status = 'revoked',revision = revision + 1 WHERE id = ? AND revision = ?",
        "second-owner-a",
        1,
      ),
    ).toThrow(/last_owner/);
    expect(
      database
        .prepare(
          "SELECT id FROM memberships WHERE organization_id = ? AND role = 'organization_owner' AND status = 'active'",
        )
        .all("org-a"),
    ).toEqual([{ id: "second-owner-a" }]);
    expect(
      database
        .prepare("SELECT revision FROM memberships WHERE id = ?")
        .get("second-owner-a"),
    ).toMatchObject({ revision: 1 });
  });

  it("rolls back a multi-row revocation when it would remove every owner", () => {
    run(
      "INSERT INTO memberships (id,organization_id,user_id,role) VALUES (?,?,?,?)",
      "second-owner-a",
      "org-a",
      "user-b",
      "organization_owner",
    );
    expect(() =>
      run(
        "UPDATE memberships SET status = 'revoked' WHERE organization_id = ?",
        "org-a",
      ),
    ).toThrow(/last_owner/);
    expect(
      database
        .prepare(
          "SELECT count(*) AS count FROM memberships WHERE organization_id = ? AND status = 'active'",
        )
        .get("org-a"),
    ).toMatchObject({ count: 2 });
    expect(
      database
        .prepare("SELECT status FROM memberships WHERE organization_id = ?")
        .get("org-b"),
    ).toMatchObject({ status: "active" });
  });

  it("does not allow a membership identity move to bypass last-owner protection", () => {
    expect(() =>
      run(
        "UPDATE memberships SET organization_id = ? WHERE id = ?",
        "org-b",
        "member-a",
      ),
    ).toThrow(/last_owner|immutable|identity/i);
    expect(
      database
        .prepare(
          "SELECT count(*) AS count FROM memberships WHERE organization_id = ? AND role = 'organization_owner' AND status = 'active'",
        )
        .get("org-a"),
    ).toMatchObject({ count: 1 });
  });

  it("does not allow REPLACE by primary or unique key to bypass last-owner protection", () => {
    expect(() =>
      run(
        "INSERT OR REPLACE INTO memberships (id,organization_id,user_id,role,status) VALUES (?,?,?,?,?)",
        "member-a",
        "org-a",
        "user-a",
        "content_editor",
        "revoked",
      ),
    ).toThrow(/membership_exists/);
    expect(() =>
      run(
        "INSERT OR REPLACE INTO memberships (id,organization_id,user_id,role,status) VALUES (?,?,?,?,?)",
        "new-member-id",
        "org-a",
        "user-a",
        "content_editor",
        "revoked",
      ),
    ).toThrow(/membership_exists/);
    expect(
      database
        .prepare(
          "SELECT id,role,status FROM memberships WHERE organization_id = ?",
        )
        .get("org-a"),
    ).toMatchObject({
      id: "member-a",
      role: "organization_owner",
      status: "active",
    });
  });

  it("preserves audit records against updates, deletions, and SQLite replacement", () => {
    run(
      "INSERT INTO audit_events (id,organization_id,actor_id,action,resource_type,resource_id) VALUES (?,?,?,?,?,?)",
      "audit-a",
      "org-a",
      "user-a",
      "event.created",
      "event",
      "event-a",
    );
    const original = database
      .prepare("SELECT * FROM audit_events WHERE id = ?")
      .get("audit-a");
    expect(() =>
      run(
        "UPDATE audit_events SET action = ? WHERE id = ?",
        "tampered",
        "audit-a",
      ),
    ).toThrow(/immutable_audit/);
    expect(() =>
      run("DELETE FROM audit_events WHERE id = ?", "audit-a"),
    ).toThrow(/immutable_audit/);
    expect(() =>
      run(
        "INSERT OR REPLACE INTO audit_events (id,organization_id,actor_id,action,resource_type,resource_id) VALUES (?,?,?,?,?,?)",
        "audit-a",
        "org-a",
        "user-a",
        "tampered",
        "event",
        "event-a",
      ),
    ).toThrow(/immutable_audit/);
    expect(
      database
        .prepare("SELECT * FROM audit_events WHERE id = ?")
        .get("audit-a"),
    ).toEqual(original);
  });

  it("permits one CAS winner and records no audit event for a stale serialized attempt", () => {
    const update = (id: string, name: string, expectedRevision: number) => {
      database.exec("BEGIN IMMEDIATE");
      try {
        const result = run(
          "UPDATE organizations SET name = ?, revision = revision + 1 WHERE id = ? AND revision = ?",
          name,
          "org-a",
          expectedRevision,
        );
        const audit = run(
          "INSERT INTO audit_events (id,organization_id,actor_id,action,resource_type,resource_id) SELECT ?,?,?, 'organization.updated','organization',? WHERE changes() = 1",
          id,
          "org-a",
          "user-a",
          "org-a",
        );
        database.exec("COMMIT");
        return { updated: result.changes, audited: audit.changes };
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    };
    const snapshotRevision = 1;
    const organizationBBefore = database
      .prepare("SELECT * FROM organizations WHERE id = ?")
      .get("org-b");
    expect(update("audit-winner", "Nova marca A", snapshotRevision)).toEqual({
      updated: 1,
      audited: 1,
    });
    expect(
      update("audit-stale", "Atualização obsoleta A", snapshotRevision),
    ).toEqual({ updated: 0, audited: 0 });
    expect(
      database
        .prepare("SELECT name,revision FROM organizations WHERE id = ?")
        .get("org-a"),
    ).toMatchObject({ name: "Nova marca A", revision: 2 });
    expect(
      database
        .prepare("SELECT id FROM audit_events WHERE organization_id = ?")
        .all("org-a"),
    ).toEqual([{ id: "audit-winner" }]);
    expect(
      database.prepare("SELECT * FROM organizations WHERE id = ?").get("org-b"),
    ).toEqual(organizationBBefore);
  });
});
