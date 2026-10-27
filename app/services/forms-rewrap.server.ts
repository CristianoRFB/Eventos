import type { SubmissionCipherSecrets } from "../infrastructure/submission-crypto.server";
import { decryptSubmission, encryptSubmission } from "../infrastructure/submission-crypto.server";

/**
 * F6 migration adapter for the append-only source tables.
 * Only internal trusted calls; deliberately no HTTP endpoint or cron.
 * Original columns remain encrypted and immutable, so this is not yet a
 * crypto-erasure or retirement of legacy keys.
 */
export type CipherField = "answers" | "profile" | "reply";
type Source = {
  cipher: string | null;
  form_id?: string;
  definition_id?: string;
  application_id?: string;
  requested_revision?: number;
};
type Shadow = { source_hash: string; rewrapped_ciphertext: string };
export type RewrapState = "unchanged" | "would_rewrap" | "rewrapped" | "conflict";

function kindOf(field: CipherField) {
  return field === "reply" ? "reply" : "submission";
}
async function sourceRecord(db: D1Database, org: string, field: CipherField, id: string, now: string) {
  if (field === "reply") {
    return db.prepare(
      `SELECT r.reply_ciphertext AS cipher, r.application_id,r.requested_revision
       FROM application_replies r
       JOIN exhibitor_applications a ON a.organization_id=r.organization_id AND a.id=r.application_id
       JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
       WHERE r.organization_id=? AND r.id=? AND s.state='active' AND s.retention_until>?`,
    ).bind(org, id, now).first<Source>();
  }
  const column = field === "answers" ? "answers_ciphertext" : "profile_ciphertext";
  return db.prepare(
    `SELECT ${column} AS cipher,form_id,definition_id FROM form_submissions
     WHERE organization_id=? AND id=? AND state='active' AND retention_until>?`,
  ).bind(org,id,now).first<Source>();
}
function scopeOf(org: string, field: CipherField, id: string, source: Source) {
  if (field === "reply") {
    if (!source.application_id || !Number.isSafeInteger(source.requested_revision))
      throw new Error("Incomplete reply scope");
    return `${org}:${source.application_id}:reply:${source.requested_revision}`;
  }
  if (!source.form_id || !source.definition_id)
    throw new Error("Incomplete form scope");
  return `${org}:${source.form_id}:${id}:${source.definition_id}`;
}
async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",buffer)),
    (v)=>v.toString(16).padStart(2,"0")).join("");
}

export async function resolveRewrappedCipher(
  db: D1Database,
  org: string,
  field: CipherField,
  id: string,
  original: string | null,
): Promise<string | null> {
  if (!original) return null;
  const row = await db.prepare(
    "SELECT source_hash,rewrapped_ciphertext FROM private_cipher_rewraps WHERE organization_id=? AND source_kind=? AND source_id=? AND field_name=?",
  ).bind(org,kindOf(field),id,field).first<Shadow>();
  if (!row) return original;
  // Never accept a stale replacement for a different original payload.
  if (row.source_hash !== await digest(original))
    throw new Error("Encrypted source hash mismatch");
  return row.rewrapped_ciphertext;
}

export async function rewrapPrivateCipher(
  db: D1Database,
  secrets: SubmissionCipherSecrets,
  org: string,
  field: CipherField,
  id: string,
  options: { dryRun?: boolean; now?: Date } = {},
): Promise<RewrapState> {
  if (!secrets.activeKeyId || !secrets.keys?.[secrets.activeKeyId])
    throw new Error("Key rotation requires a configured active v2 key");
  if (!org || !id || !["answers","profile","reply"].includes(field))
    throw new Error("Invalid ciphertext source");
  const time = options.now ?? new Date();
  if (!Number.isFinite(time.getTime())) throw new Error("Invalid cutoff");
  const now = time.toISOString();
  const source = await sourceRecord(db, org, field, id, now);
  if (!source?.cipher) return "unchanged";
  const oldHash = await digest(source.cipher);
  const previous = await db.prepare(
    "SELECT source_hash,rewrapped_ciphertext FROM private_cipher_rewraps WHERE organization_id=? AND source_kind=? AND source_id=? AND field_name=?",
  ).bind(org,kindOf(field),id,field).first<Shadow>();
  if (previous && previous.source_hash !== oldHash)
    throw new Error("Stale rewrap source hash");
  const input = previous?.rewrapped_ciphertext ?? source.cipher;
  if (input.startsWith(`v2.${secrets.activeKeyId}.`)) return "unchanged";
  if (options.dryRun) return "would_rewrap";
  const scope = scopeOf(org,field,id,source);
  const plaintext = await decryptSubmission(secrets,org,scope,input);
  const result = await encryptSubmission(secrets,org,scope,plaintext);
  // Verify round-trip before any durable write; never log plaintext.
  const recovered = await decryptSubmission(secrets,org,scope,result);
  if (JSON.stringify(plaintext) !== JSON.stringify(recovered))
    throw new Error("Rewrap integrity check failed");
  if (previous) {
    const changed = await db.prepare(
      `UPDATE private_cipher_rewraps SET rewrapped_ciphertext=?,updated_at=?
       WHERE organization_id=? AND source_kind=? AND source_id=? AND field_name=?
       AND source_hash=? AND rewrapped_ciphertext=?`,
    ).bind(result,now,org,kindOf(field),id,field,oldHash,input).run();
    return changed.meta.changes === 1 ? "rewrapped" : "conflict";
  }
  // Guard source and timestamp in one atomic INSERT. DB trigger verifies the
  // source is still active; concurrent withdrawal or retention fails closed.
  const column = field === "answers" ? "answers_ciphertext" :
    field === "profile" ? "profile_ciphertext" : "reply_ciphertext";
  const exists = field === "reply" ?
    `SELECT 1 FROM application_replies r
       JOIN exhibitor_applications a ON a.organization_id=r.organization_id AND a.id=r.application_id
       JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
       WHERE r.organization_id=? AND r.id=? AND r.${column}=?
       AND s.state='active' AND s.retention_until>?` :
    `SELECT 1 FROM form_submissions s WHERE s.organization_id=? AND s.id=?
       AND s.${column}=? AND s.state='active' AND s.retention_until>?`;
  const changed = await db.prepare(
    `INSERT INTO private_cipher_rewraps(
       organization_id,source_kind,source_id,field_name,source_hash,rewrapped_ciphertext
     ) SELECT ?,?,?,?,?,? WHERE EXISTS (${exists})`,
  ).bind(org,kindOf(field),id,field,oldHash,result,org,id,source.cipher,now).run();
  return changed.meta.changes === 1 ? "rewrapped" : "conflict";
}
