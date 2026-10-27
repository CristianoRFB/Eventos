import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { decryptSubmission, encryptSubmission } from "../../app/infrastructure/submission-crypto.server";
import { resolveRewrappedCipher, rewrapPrivateCipher } from "../../app/services/forms-rewrap.server";

const secret = {
  legacySecret: "TEST_ONLY-ORIGINAL-KEY-MATERIAL-000000000000",
  activeKeyId: "oct26",
  keys: {
    oct26: "TEST_ONLY-CURRENT-PRIVATE-KEY-000000000001",
    jan27: "TEST_ONLY-NEXT-PRIVATE-KEY-000000000002",
  },
};
type Arg = string | number | null;
function harness() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE form_submissions(
      id text PRIMARY KEY,organization_id text NOT NULL,form_id text NOT NULL,
      definition_id text NOT NULL,state text NOT NULL,
      retention_until text NOT NULL,answers_ciphertext text,profile_ciphertext text
    );
    CREATE TABLE exhibitor_applications(
      id text PRIMARY KEY,organization_id text NOT NULL,submission_id text NOT NULL
    );
    CREATE TABLE application_replies(
      id text PRIMARY KEY,organization_id text NOT NULL,application_id text NOT NULL,
      requested_revision integer NOT NULL,reply_ciphertext text
    );
    CREATE TRIGGER submissions_redaction_only BEFORE UPDATE ON form_submissions
    WHEN (NEW.answers_ciphertext IS NOT OLD.answers_ciphertext AND NEW.answers_ciphertext IS NOT NULL)
      OR (NEW.profile_ciphertext IS NOT OLD.profile_ciphertext AND NEW.profile_ciphertext IS NOT NULL)
    BEGIN SELECT RAISE(ABORT,'submission_redaction_only'); END;
    CREATE TRIGGER application_reply_redaction_only BEFORE UPDATE OF reply_ciphertext
    ON application_replies WHEN NEW.reply_ciphertext IS NOT NULL
    BEGIN SELECT RAISE(ABORT,'reply_redaction_only'); END;
  `);
  sql.exec(readFileSync("migrations/0008_private_cipher_rewraps.sql", "utf8"));
  sql.exec(readFileSync("migrations/0009_rewrap_audit.sql", "utf8"));
  const bind = (query: string, args: Arg[]) => ({
    first: async () => (sql.prepare(query).get(...args) ?? null),
    run: async () => ({ meta: { changes: Number(sql.prepare(query).run(...args).changes) } }),
  });
  const db = {
    prepare: (query: string) => ({
      bind: (...args: Arg[]) => bind(query,args),
    }),
  } as unknown as D1Database;
  const get = (query:string,...args:Arg[])=>sql.prepare(query).get(...args) as Record<string,unknown>|undefined;
  const run = (query:string,...args:Arg[])=>sql.prepare(query).run(...args);
  return { sql,db,get,run };
}
const future = "2099-12-31T23:59:59.000Z";
const scope = (org:string,id:string)=>`${org}:form-${org}:${id}:definition-${org}`;

describe("controlled private rewrap without bypassing source immutability", () => {
  it("does dry-run, reads old and new data, preserves original, and denies A/B + replay", async () => {
    const h = harness();
    try {
      const orgA="org-a",orgB="org-b", id="submission-a";
      const original = await encryptSubmission(secret.legacySecret,orgA,scope(orgA,id),{email:"a-private@example.test"});
      const other = await encryptSubmission(secret.legacySecret,orgB,scope(orgB,"submission-b"),{email:"b-private@example.test"});
      for (const [sid,org,cipher] of [[id,orgA,original],["submission-b",orgB,other]] as const)
        h.run("INSERT INTO form_submissions(id,organization_id,form_id,definition_id,state,retention_until,answers_ciphertext) VALUES(?,?,?,?,?,?,?)",
          sid,org,`form-${org}`,`definition-${org}`,"active",future,cipher);
      expect(await rewrapPrivateCipher(h.db,secret,orgA,"answers",id,{dryRun:true})).toBe("would_rewrap");
      expect(h.get("SELECT count(*) AS n FROM private_cipher_rewraps")?.n).toBe(0);
      expect(await rewrapPrivateCipher(h.db,secret,orgA,"answers",id)).toBe("rewrapped");
      expect(await rewrapPrivateCipher(h.db,secret,orgA,"answers",id)).toBe("unchanged");
      const cipher = await resolveRewrappedCipher(h.db,orgA,"answers",id,original);
      expect(cipher?.startsWith("v2.oct26.")).toBe(true);
      expect(await decryptSubmission(secret,orgA,scope(orgA,id),cipher!))
        .toEqual({email:"a-private@example.test"});
      expect(h.get("SELECT answers_ciphertext FROM form_submissions WHERE id=?",id)?.answers_ciphertext)
        .toBe(original);
      expect(h.get("SELECT answers_ciphertext FROM form_submissions WHERE id=?","submission-b")?.answers_ciphertext)
        .toBe(other);
      expect(await rewrapPrivateCipher(h.db,secret,orgB,"answers",id)).toBe("unchanged");
      await expect(decryptSubmission(secret,orgB,scope(orgA,id),cipher!)).rejects.toThrow();
      await expect(resolveRewrappedCipher(h.db,orgA,"answers",id,other))
        .rejects.toThrow("hash mismatch");
      // Immutable originals must never be modified to a different ciphertext.
      expect(() => h.run("UPDATE form_submissions SET answers_ciphertext=? WHERE id=?",other,id))
        .toThrow(/redaction_only/i);
    } finally { h.sql.close(); }
  });

  it("supports CAS rewrap to next key and source-triggered erasure after withdrawal", async () => {
    const h=harness();
    try {
      const org="org-a",id="submission-a";
      const original=await encryptSubmission(secret.legacySecret,org,scope(org,id),{private:"yes"});
      h.run("INSERT INTO form_submissions(id,organization_id,form_id,definition_id,state,retention_until,answers_ciphertext) VALUES(?,?,?,?,?,?,?)",
        id,org,`form-${org}`,`definition-${org}`,"active",future,original);
      expect(await rewrapPrivateCipher(h.db,secret,org,"answers",id)).toBe("rewrapped");
      const rotated={...secret,activeKeyId:"jan27"};
      expect(await rewrapPrivateCipher(h.db,rotated,org,"answers",id)).toBe("rewrapped");
      expect(h.sql.prepare("SELECT action,from_key,to_key FROM private_cipher_rewrap_events ORDER BY id").all())
        .toEqual([
          { action: "created", from_key: "legacy", to_key: "oct26" },
          { action: "rotated", from_key: "oct26", to_key: "jan27" },
        ]);
      expect(() => h.run("DELETE FROM private_cipher_rewrap_events")).toThrow(/immutable/i);
      const cipher=await resolveRewrappedCipher(h.db,org,"answers",id,original);
      expect(cipher?.startsWith("v2.jan27.")).toBe(true);
      expect(await decryptSubmission(rotated,org,scope(org,id),cipher!))
        .toEqual({private:"yes"});
      h.run("UPDATE form_submissions SET state='withdrawn',answers_ciphertext=NULL WHERE id=?",id);
      expect(h.get("SELECT count(*) AS n FROM private_cipher_rewraps")?.n).toBe(0);
      expect(await rewrapPrivateCipher(h.db,rotated,org,"answers",id)).toBe("unchanged");
      expect(await resolveRewrappedCipher(h.db,org,"answers",id,null)).toBeNull();
    } finally { h.sql.close(); }
  });

  it("rewraps an applicant follow-up, and rejects expired and cross-scope writes", async () => {
    const h=harness();
    try {
      const org="org-a",sid="submission-a",app="application-a",reply="reply-a";
      const followScope=`${org}:${app}:reply:2`;
      const sealed=await encryptSubmission(secret.legacySecret,org,followScope,{message:"private"});
      h.run("INSERT INTO form_submissions(id,organization_id,form_id,definition_id,state,retention_until) VALUES(?,?,?,?,?,?)",
        sid,org,"form-a","definition-a","active",future);
      h.run("INSERT INTO exhibitor_applications(id,organization_id,submission_id) VALUES(?,?,?)",app,org,sid);
      h.run("INSERT INTO application_replies(id,organization_id,application_id,requested_revision,reply_ciphertext) VALUES(?,?,?,?,?)",
        reply,org,app,2,sealed);
      expect(await rewrapPrivateCipher(h.db,secret,org,"reply",reply)).toBe("rewrapped");
      const effective=await resolveRewrappedCipher(h.db,org,"reply",reply,sealed);
      expect(await decryptSubmission(secret,org,followScope,effective!)).toEqual({message:"private"});
      expect(await rewrapPrivateCipher(h.db,secret,"org-b","reply",reply)).toBe("unchanged");
      h.run("UPDATE application_replies SET reply_ciphertext=NULL WHERE id=?",reply);
      expect(h.get("SELECT count(*) AS n FROM private_cipher_rewraps")?.n).toBe(0);
      expect(await rewrapPrivateCipher(h.db,secret,org,"reply",reply)).toBe("unchanged");
    } finally {h.sql.close();}
  });
});
