/**
 * Read-only D1 encryption-key retirement audit.
 * Counts encrypted blobs by envelope version/ID inside SQLite, returning
 * NO private answers, message text, ciphertext, tokens or tenant names.
 * This is intentionally NOT exposed as a tenant API endpoint.
 */
export type KeyUsage = { keyId: string; count: number };

export async function auditSubmissionKeyUsage(db: D1Database): Promise<KeyUsage[]> {
  const rows = await db.prepare(
    `WITH ciphertexts AS (
       SELECT answers_ciphertext AS cipher FROM form_submissions WHERE answers_ciphertext IS NOT NULL
       UNION ALL
       SELECT profile_ciphertext AS cipher FROM form_submissions WHERE profile_ciphertext IS NOT NULL
       UNION ALL
       SELECT reply_ciphertext AS cipher FROM application_replies WHERE reply_ciphertext IS NOT NULL
       UNION ALL
       -- The base encryption remains for rollback, and shadow versions require
       -- their own keys. BOTH must be counted before any key retirement.
       SELECT rewrapped_ciphertext AS cipher FROM private_cipher_rewraps
     ), classified AS (
       SELECT CASE
         WHEN substr(cipher,1,3)='v1.' THEN 'v1'
         WHEN substr(cipher,1,3)='v2.' AND instr(substr(cipher,4),'.')>1
           THEN 'v2:'||substr(cipher,4,instr(substr(cipher,4),'.')-1)
         ELSE 'invalid'
       END AS key_id FROM ciphertexts
     )
     SELECT key_id AS keyId,count(*) AS count
     FROM classified GROUP BY key_id ORDER BY key_id`,
  ).all<KeyUsage>();
  return rows.results;
}

/** Fail closed if there are corrupt/unknown envelopes, or any count. */
export function assertKeyCanRetire(usage: KeyUsage[], keyId: string) {
  if (keyId !== "v1" && !/^[a-z][a-z0-9_-]{0,31}$/.test(keyId))
    throw new Error("Invalid retirement key ID");
  if (usage.some((row) => row.keyId === "invalid" && row.count > 0))
    throw new Error("Unrecognized encrypted payloads block key retirement");
  const envelope = keyId === "v1" ? "v1" : `v2:${keyId}`;
  if (usage.some((row) => row.keyId === envelope && row.count > 0))
    throw new Error("Encrypted data still requires this key");
}
