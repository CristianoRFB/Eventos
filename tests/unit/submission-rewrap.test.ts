import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSubmission, encryptSubmission } from "../../app/infrastructure/submission-crypto.server";
import { effectiveSubmissionCipher, rewrapPrivateCiphers } from "../../app/services/submission-rewrap.server";
import { auditSubmissionKeyUsage, assertKeyCanRetire } from "../../app/infrastructure/submission-key-audit.server";
import type { AuthEnvironment } from "../../app/infrastructure/auth.server";

const orgA = "org-a";
const oldRoot = "TEST_ONLY-LEGACY-ROOT-2026-DO-NOT-USE-REAL";
const keyOld = "TEST_ONLY-REWRAP-CIPHER-OLD-2026-VERY-LONG";
const keyNew = "TEST_ONLY-REWRAP-CIPHER-NEW-2027-VERY-LONG";
const scope = `${orgA}:form-a:submission-a:definition-a`;
let sqlite: DatabaseSync;

function createDB() {
  const db = {
    prepare(sql: string) {
      let argumentsForQuery: (string | number | null)[] = [];
      return {
        bind(...args: (string | number | null)[]) {
          argumentsForQuery = args;
          return this;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...argumentsForQuery) };
        },
        async first() {
          return sqlite.prepare(sql).get(...argumentsForQuery) ?? null;
        },
        async run() {
          return { meta: { changes: Number(sqlite.prepare(sql).run(...argumentsForQuery).changes) } };
        },
      };
    },
  };
  return db as unknown as D1Database;
}
function env(keyId = "oct26"): AuthEnvironment {
  return {
    DB: createDB(), APP_ENV: "local", ADMIN_ORIGIN: "http://localhost:5173",
    BETTER_AUTH_SECRET: oldRoot,
    SUBMISSION_ENCRYPTION_ACTIVE_KEY_ID: keyId,
    SUBMISSION_ENCRYPTION_KEYRING: JSON.stringify({ oct26: keyOld, jan27: keyNew }),
    SUBMISSION_ENCRYPTION_V1_SECRET: oldRoot,
  };
}
function exec(statement: string, ...args: (string | number | null)[]) {
  return sqlite.prepare(statement).run(...args);
}
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON;");
  // Minimal schema used by the *real* additive migration; no network mocks.
  sqlite.exec(`
    CREATE TABLE form_submissions(
      organization_id text NOT NULL, id text PRIMARY KEY,
      form_id text NOT NULL, definition_id text NOT NULL,
      state text NOT NULL DEFAULT 'active',
      retention_until text NOT NULL,
      answers_ciphertext text,profile_ciphertext text
    );
    CREATE TABLE exhibitor_applications(
      organization_id text NOT NULL,id text PRIMARY KEY,submission_id text NOT NULL
    );
    CREATE TABLE application_replies(
      organization_id text NOT NULL,id text PRIMARY KEY,application_id text NOT NULL,
      requested_revision integer NOT NULL,reply_ciphertext text
    );`);
  const migration = readFileSync("migrations/0008_private_cipher_rewraps.sql", "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) sqlite.exec(statement);
  }
});
afterEach(() => sqlite.close());

async function seed() {
  const a = await encryptSubmission(oldRoot,orgA,scope,{private:"A answer"});
  const p = await encryptSubmission(oldRoot,orgA,scope,{name:"A profile"});
  const bScope = "org-b:form-b:submission-b:definition-b";
  const b = await encryptSubmission(oldRoot,"org-b",bScope,{private:"B answer"});
  exec("INSERT INTO form_submissions(organization_id,id,form_id,definition_id,state,retention_until,answers_ciphertext,profile_ciphertext) VALUES(?,?,?,?,?,?,?,?)",
    orgA,"submission-a","form-a","definition-a","active","2031-01-01T00:00:00.000Z",a,p);
  exec("INSERT INTO form_submissions(organization_id,id,form_id,definition_id,state,retention_until,answers_ciphertext) VALUES(?,?,?,?,?,?,?)",
    "org-b","submission-b","form-b","definition-b","active","2031-01-01T00:00:00.000Z",b);
  exec("INSERT INTO exhibitor_applications(organization_id,id,submission_id) VALUES(?,?,?)",
    orgA,"application-a","submission-a");
  const reply = await encryptSubmission(oldRoot,orgA,`${orgA}:application-a:reply:2`,{message:"private reply"});
  exec("INSERT INTO application_replies(organization_id,id,application_id,requested_revision,reply_ciphertext) VALUES(?,?,?,?,?)",
    orgA,"reply-a","application-a",2,reply);
  return {a,p,b,reply};
}

describe("F6 controlled AES rewraps: local crash/retry and tenant boundaries", () => {
  it("dry-runs by default, applies all 3 private fields, reads v2 and stays idempotent", async () => {
    const original = await seed();
    const e = env();
    expect(await rewrapPrivateCiphers(e,orgA)).toEqual({
      examined:3,rewrapped:0,conflicts:0,dryRun:true,
    });
    expect(sqlite.prepare("SELECT count(*) AS count FROM private_cipher_rewraps").get())
      .toMatchObject({ count:0 });
    expect(await rewrapPrivateCiphers(e,orgA,{apply:true})).toEqual({
      examined:3,rewrapped:3,conflicts:0,dryRun:false,
    });
    const effective = await effectiveSubmissionCipher(
      e.DB,orgA,{kind:"submission",field:"answers"},"submission-a",original.a,
    );
    expect(effective.startsWith("v2.oct26.")).toBe(true);
    expect(await decryptSubmission({
      legacySecret:oldRoot,activeKeyId:"oct26",keys:{oct26:keyOld,jan27:keyNew},
    },orgA,scope,effective)).toEqual({private:"A answer"});
    const replyCipher = await effectiveSubmissionCipher(e.DB,orgA,{kind:"reply",field:"reply"},"reply-a",original.reply);
    expect(await decryptSubmission({
      legacySecret:oldRoot,activeKeyId:"oct26",keys:{oct26:keyOld,jan27:keyNew},
    },orgA,`${orgA}:application-a:reply:2`,replyCipher)).toEqual({message:"private reply"});
    expect(await rewrapPrivateCiphers(e,orgA,{apply:true})).toMatchObject({
      examined:0,rewrapped:0,
    });
    expect(sqlite.prepare("SELECT answers_ciphertext FROM form_submissions WHERE id='submission-a'").get())
      .toMatchObject({ answers_ciphertext:original.a });
    expect(sqlite.prepare("SELECT count(*) AS count FROM private_cipher_rewraps WHERE organization_id='org-b'").get())
      .toMatchObject({ count:0 });
    const usage = await auditSubmissionKeyUsage(e.DB);
    expect(usage).toContainEqual({ keyId:"v1",count:4 });
    expect(usage).toContainEqual({ keyId:"v2:oct26",count:3 });
    expect(() => assertKeyCanRetire(usage,"oct26")).toThrow();
    expect(() => assertKeyCanRetire(usage,"v1")).toThrow();
  });

  it("restarts after a partial batch and rotates an existing shadow with CAS",async () => {
    await seed();
    const e = env();
    const part = await rewrapPrivateCiphers(e,orgA,{apply:true,limit:1});
    expect(part.rewrapped).toBe(1);
    expect((await rewrapPrivateCiphers(e,orgA,{apply:true})).rewrapped).toBe(2);
    const after = await rewrapPrivateCiphers(env("jan27"),orgA,{apply:true});
    expect(after).toMatchObject({examined:3,rewrapped:3,conflicts:0});
    expect((await rewrapPrivateCiphers(env("jan27"),orgA,{apply:true})).examined).toBe(0);
    const rows = sqlite.prepare("SELECT rewrapped_ciphertext FROM private_cipher_rewraps").all();
    expect(rows).toHaveLength(3);
    expect(rows.every(r=>String(r.rewrapped_ciphertext).startsWith("v2.jan27."))).toBe(true);
  });

  it("fails closed cross-tenant and clears overlays atomically on withdrawal/redaction",async () => {
    const original = await seed();
    const e = env();
    await rewrapPrivateCiphers(e,orgA,{apply:true});
    await expect(effectiveSubmissionCipher(
      e.DB,"org-b",{kind:"submission",field:"answers"},"submission-a",original.a,
    )).rejects.toBeInstanceOf(Response);
    expect(() => exec(
      "INSERT INTO private_cipher_rewraps(organization_id,source_kind,source_id,field_name,source_hash,rewrapped_ciphertext) VALUES(?,?,?,?,?,?)",
      "org-b","submission","submission-a","answers","a".repeat(64),"v2.oct26.invalid.invalid",
    )).toThrow(/rewrap_source_not_live/);
    exec("UPDATE form_submissions SET state='withdrawn',answers_ciphertext=NULL,profile_ciphertext=NULL WHERE organization_id='org-a' AND id='submission-a'");
    expect(sqlite.prepare("SELECT count(*) AS count FROM private_cipher_rewraps").get())
      .toMatchObject({count:0});
    await expect(effectiveSubmissionCipher(
      e.DB,orgA,{kind:"submission",field:"answers"},"submission-a",original.a,
    )).rejects.toBeInstanceOf(Response);
    expect((await rewrapPrivateCiphers(e,orgA,{apply:true})).examined).toBe(0);
    expect(sqlite.prepare("SELECT answers_ciphertext FROM form_submissions WHERE id='submission-b'").get())
      .toMatchObject({answers_ciphertext:original.b});
  });

  it("does not change immutable original bytes even when an overlay exists",async () => {
    await seed();
    await rewrapPrivateCiphers(env(),orgA,{apply:true});
    const before = sqlite.prepare("SELECT answers_ciphertext FROM form_submissions WHERE id='submission-a'").get();
    expect(before).toBeTruthy();
    // Existing redaction-only triggers stay enabled; this update is NOT used.
    // Simulate an operator losing the v2 shadow: the legacy ciphertext survives.
    exec("DELETE FROM private_cipher_rewraps WHERE organization_id=? AND source_id=?",
      orgA,"submission-a");
    const restored = sqlite.prepare("SELECT answers_ciphertext FROM form_submissions WHERE id='submission-a'").get();
    expect(restored).toEqual(before);
  });
});
