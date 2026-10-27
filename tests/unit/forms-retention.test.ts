import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { purgeExpiredSubmissions } from "../../app/services/forms-retention.server";

type Input = string | number | null;
describe("F6: private submission retention cleanup", () => {
  let sql: DatabaseSync;
  const exec = (statement: string, ...args: Input[]) =>
    sql.prepare(statement).run(...args);
  function prepared(statement: string, args: Input[] = []) {
    return {
      bind(...bindings: Input[]) {
        return prepared(statement, bindings);
      },
      async all() {
        return { results: sql.prepare(statement).all(...args) };
      },
      async run() {
        return { meta: { changes: Number(exec(statement, ...args).changes) } };
      },
    };
  }
  const db = () =>
    ({
      prepare: (statement: string) => prepared(statement),
      batch: async (statements: { run: () => Promise<unknown> }[]) => {
        sql.exec("BEGIN IMMEDIATE");
        try {
          const results = [];
          for (const statement of statements) results.push(await statement.run());
          sql.exec("COMMIT");
          return results;
        } catch (error) {
          sql.exec("ROLLBACK");
          throw error;
        }
      },
    }) as unknown as D1Database;

  function submission(
    tenant: "a" | "b",
    suffix: string,
    retention: string,
    state: "active" | "withdrawn" = "active",
  ) {
    const id = `submission-${tenant}-${suffix}`;
    exec(
      "INSERT INTO form_submissions(id,organization_id,edition_id,form_id,definition_id,idempotency_hash,payload_hash,receipt_hash,answers_ciphertext,profile_ciphertext,listing_opt_in,receipt_expires_at,retention_until,state) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      `org-${tenant}`,
      `edition-${tenant}`,
      `form-${tenant}`,
      `definition-${tenant}`,
      `idempotency-${id}`,
      `payload-${id}`,
      `receipt-${id}`,
      state === "active" ? "encrypted-private-contact" : null,
      state === "active" ? "encrypted-public-profile" : null,
      state === "active" ? 1 : 0,
      "2027-02-01T00:00:00.000Z",
      retention,
      state,
    );
    exec(
      "INSERT INTO exhibitor_applications(id,organization_id,edition_id,submission_id,status,applicant_message) VALUES(?,?,?,?,?,?)",
      `application-${tenant}-${suffix}`,
      `org-${tenant}`,
      `edition-${tenant}`,
      id,
      "approved",
      "private applicant message",
    );
    return id;
  }

  beforeEach(() => {
    sql = new DatabaseSync(":memory:");
    sql.exec("PRAGMA foreign_keys = ON");
    for (const file of readdirSync(resolve(process.cwd(), "migrations"))
      .filter((file) => file.endsWith(".sql"))
      .sort())
      sql.exec(readFileSync(resolve("migrations", file), "utf8"));
    for (const tenant of ["a", "b"]) {
      exec(
        "INSERT INTO organizations(id,slug,name) VALUES(?,?,?)",
        `org-${tenant}`,
        `org-${tenant}`,
        `Organizadora ${tenant}`,
      );
      exec(
        "INSERT INTO events(id,organization_id,slug,name) VALUES(?,?,?,?)",
        `event-${tenant}`,
        `org-${tenant}`,
        "anime",
        "Evento fictício",
      );
      exec(
        "INSERT INTO editions(id,organization_id,event_id,edition_key,name) VALUES(?,?,?,?,?)",
        `edition-${tenant}`,
        `org-${tenant}`,
        `event-${tenant}`,
        "2027",
        "Edição fictícia",
      );
      exec(
        "INSERT INTO user(id,name,email,created_at,updated_at) VALUES(?,?,?,?,?)",
        `user-${tenant}`,
        "Editor fictício",
        `editor-${tenant}@example.test`,
        1,
        1,
      );
      exec(
        "INSERT INTO forms(id,organization_id,edition_id,name) VALUES(?,?,?,?)",
        `form-${tenant}`,
        `org-${tenant}`,
        `edition-${tenant}`,
        "Inscrição",
      );
      exec(
        "INSERT INTO form_definitions(id,organization_id,form_id,revision,definition_json,created_by) VALUES(?,?,?,?,?,?)",
        `definition-${tenant}`,
        `org-${tenant}`,
        `form-${tenant}`,
        1,
        '{"name":"Inscrição sintética"}',
        `user-${tenant}`,
      );
    }
  });

  afterEach(() => sql.close());

  it("redacts only expired rows, keeps cross-tenant and live data, and is idempotent", async () => {
    const expired = submission("a", "expired", "2027-12-31T23:59:59.000Z");
    const liveA = submission("a", "live", "2031-01-01T00:00:00.000Z");
    const liveB = submission("b", "live", "2031-01-01T00:00:00.000Z");
    exec(
      "INSERT INTO public_profile_sources(organization_id,edition_id,exhibitor_id,application_id) VALUES(?,?,?,?)",
      "org-a",
      "edition-a",
      "exhibitor-expired",
      "application-a-expired",
    );
    const beforeB = sql
      .prepare("SELECT * FROM form_submissions WHERE id=?")
      .get(liveB);
    const first = await purgeExpiredSubmissions(
      db(),
      new Date("2028-01-01T00:00:00.000Z"),
    );
    expect(first).toEqual({ examined: 1, purged: 1 });
    expect(
      sql
        .prepare(
          "SELECT state,answers_ciphertext,profile_ciphertext,listing_opt_in FROM form_submissions WHERE id=?",
        )
        .get(expired),
    ).toMatchObject({
      state: "purged",
      answers_ciphertext: null,
      profile_ciphertext: null,
      listing_opt_in: 0,
    });
    expect(
      sql
        .prepare("SELECT applicant_message FROM exhibitor_applications WHERE submission_id=?")
        .get(expired),
    ).toMatchObject({ applicant_message: "" });
    expect(
      sql
        .prepare("SELECT action,actor_id FROM application_events WHERE application_id=?")
        .all("application-a-expired"),
    ).toEqual([{ action: "retention.purged", actor_id: null }]);
    // Keep the immutable link so already published snapshots can be suppressed.
    expect(
      sql
        .prepare("SELECT count(*) AS n FROM public_profile_sources WHERE exhibitor_id=?")
        .get("exhibitor-expired"),
    ).toMatchObject({ n: 1 });
    expect(
      sql.prepare("SELECT state FROM form_submissions WHERE id=?").get(liveA),
    ).toMatchObject({ state: "active" });
    expect(sql.prepare("SELECT * FROM form_submissions WHERE id=?").get(liveB)).toEqual(
      beforeB,
    );
    const second = await purgeExpiredSubmissions(
      db(),
      new Date("2028-01-01T00:00:00.000Z"),
    );
    expect(second).toEqual({ examined: 0, purged: 0 });
    expect(
      sql.prepare("SELECT count(*) AS n FROM application_events").get(),
    ).toMatchObject({ n: 1 });
  });

  it("purges withdrawn submissions' remaining applicant messages", async () => {
    const id = submission(
      "b",
      "withdrawn",
      "2027-12-31T00:00:00.000Z",
      "withdrawn",
    );
    expect(await purgeExpiredSubmissions(db(), new Date("2028-01-01"))).toEqual({
      examined: 1,
      purged: 1,
    });
    expect(
      sql.prepare("SELECT state FROM form_submissions WHERE id=?").get(id),
    ).toMatchObject({ state: "purged" });
    expect(
      sql
        .prepare("SELECT applicant_message FROM exhibitor_applications WHERE submission_id=?")
        .get(id),
    ).toMatchObject({ applicant_message: "" });
  });

  it("limits batches and fails closed on invalid date or size", async () => {
    submission("a", "one", "2027-12-01T00:00:00.000Z");
    submission("b", "two", "2027-12-02T00:00:00.000Z");
    expect(
      await purgeExpiredSubmissions(db(), new Date("2028-01-01"), 1),
    ).toEqual({ examined: 1, purged: 1 });
    expect(
      await purgeExpiredSubmissions(db(), new Date("2028-01-01"), 1),
    ).toEqual({ examined: 1, purged: 1 });
    await expect(purgeExpiredSubmissions(db(), new Date("bad"))).rejects.toThrow(
      "Invalid retention cutoff",
    );
    await expect(purgeExpiredSubmissions(db(), new Date(), 101)).rejects.toThrow(
      "Retention batch",
    );
  });
});
