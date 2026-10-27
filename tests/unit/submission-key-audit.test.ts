import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  assertKeyCanRetire,
  auditSubmissionKeyUsage,
} from "../../app/infrastructure/submission-key-audit.server";

describe("F6: retirement safety inventory", () => {
  it("aggregates v1, v2 and malformed envelopes across all private tables without exposing answers", async () => {
    const sql = new DatabaseSync(":memory:");
    try {
      sql.exec(`CREATE TABLE form_submissions(answers_ciphertext text,profile_ciphertext text);
                CREATE TABLE application_replies(reply_ciphertext text);`);
      const submission = sql.prepare(
        "INSERT INTO form_submissions(answers_ciphertext,profile_ciphertext) VALUES(?,?)",
      );
      submission.run("v1.iv1.cipher1", "v2.oct26.iv2.cipher2");
      submission.run("v2.oct26.iv3.cipher3", null);
      submission.run("broken", "v2.jan27.iv4.cipher4");
      sql.prepare("INSERT INTO application_replies(reply_ciphertext) VALUES(?)")
        .run("v2.oct26.iv5.cipher5");
      const db = {
        prepare: (statement: string) => ({
          all: async () => ({ results: sql.prepare(statement).all() }),
        }),
      } as unknown as D1Database;
      const usage = await auditSubmissionKeyUsage(db);
      expect(usage).toEqual([
        { keyId: "invalid", references: 1 },
        { keyId: "v1", references: 1 },
        { keyId: "v2:jan27", references: 1 },
        { keyId: "v2:oct26", references: 3 },
      ]);
      expect(JSON.stringify(usage)).not.toContain("cipher");
      expect(() => assertKeyCanRetire(usage, "oct26")).toThrow("Unrecognized");
      expect(() => assertKeyCanRetire(
        usage.filter((row) => row.keyId !== "invalid"), "oct26",
      )).toThrow("still requires");
      expect(() => assertKeyCanRetire(
        usage.filter((row) => row.keyId !== "invalid" && row.keyId !== "v2:jan27"),
        "jan27",
      )).not.toThrow();
      expect(() => assertKeyCanRetire([], "Invalid ID")).toThrow("Invalid retirement");
    } finally { sql.close(); }
  });
});
