import { decryptSubmission, encryptSubmission, submissionSecrets } from "../infrastructure/submission-crypto.server";
import type { AuthEnvironment } from "../infrastructure/auth.server";

type Source = { kind: "submission"; field: "answers" | "profile" } |
  { kind: "reply"; field: "reply" };
type Candidate = {
  id: string;
  original: string;
  previous: string | null;
  form_id: string | null;
  definition_id: string | null;
  application_id: string | null;
  requested_revision: number | null;
};
export type RewrapStatus = { examined: number; rewrapped: number; conflicts: number; dryRun: boolean };
const sources: readonly Source[] = [
  { kind: "submission", field: "answers" },
  { kind: "submission", field: "profile" },
  { kind: "reply", field: "reply" },
];

/** SHA256 fingerprints are of encrypted bytes, never plaintext or receipt tokens. */
async function fingerprint(ciphertext: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ciphertext));
  return Array.from(new Uint8Array(buffer), (v) => v.toString(16).padStart(2, "0")).join("");
}

/**
 * Only consume an overlay when the original cipher is still present and
 * exactly matches the original source fingerprint. The caller must perform
 * the normal permission and retention checks BEFORE decrypting either.
 */
export async function effectiveSubmissionCipher(
  db: D1Database,
  organizationId: string,
  source: Source,
  sourceId: string,
  original: string,
): Promise<string> {
  // Explicit live-source recheck is required even if there is no overlay:
  // otherwise a stale application row could fall back to a withdrawn cipher.
  const liveQuery = source.kind === "submission"
    ? `SELECT 1 AS valid FROM form_submissions WHERE organization_id=? AND id=?
       AND state='active' AND retention_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')
       AND ${source.field==="answers"?"answers_ciphertext":"profile_ciphertext"}=?`
    : `SELECT 1 AS valid FROM application_replies r
       JOIN exhibitor_applications a ON a.organization_id=r.organization_id AND a.id=r.application_id
       JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
       WHERE r.organization_id=? AND r.id=? AND r.reply_ciphertext=?
         AND s.state='active' AND s.retention_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')`;
  const live = await db.prepare(liveQuery).bind(organizationId,sourceId,original).first<{valid:number}>();
  if (!live) throw new Response("Conteúdo privado indisponível", { status: 404 });
  const fingerprintValue = await fingerprint(original);
  const row = await db.prepare(
    `SELECT v.rewrapped_ciphertext AS cipher FROM private_cipher_rewraps v
     WHERE v.organization_id=? AND v.source_kind=? AND v.source_id=?
       AND v.field_name=? AND v.source_hash=?
       AND (
         (v.source_kind='submission' AND EXISTS(
           SELECT 1 FROM form_submissions s WHERE s.organization_id=v.organization_id
           AND s.id=v.source_id AND s.state='active'
           AND s.retention_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')
           AND ((v.field_name='answers' AND s.answers_ciphertext=?)
             OR (v.field_name='profile' AND s.profile_ciphertext=?))
         )) OR
         (v.source_kind='reply' AND EXISTS(
           SELECT 1 FROM application_replies r
           JOIN exhibitor_applications a ON a.organization_id=r.organization_id AND a.id=r.application_id
           JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
           WHERE r.organization_id=v.organization_id AND r.id=v.source_id
             AND r.reply_ciphertext=? AND s.state='active'
             AND s.retention_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')
         ))
       )`,
  ).bind(organizationId,source.kind,sourceId,source.field,fingerprintValue,original,original,original)
    .first<{cipher:string}>();
  return row?.cipher ?? original;
}

/**
 * Trusted server-only operation; not an HTTP route or cloud scheduler.
 * No external side effects. Default DRY_RUN. Races with withdrawal or other
 * migrations are protected by SQLite source equality + overlay CAS.
 * The original cipher remains in the original table as rollback evidence,
 * therefore its root key CANNOT be retired until retention clears it.
 */
export async function rewrapPrivateCiphers(
  env: AuthEnvironment,
  organizationId: string,
  options: { apply?: boolean; limit?: number; now?: Date } = {},
): Promise<RewrapStatus> {
  if (!organizationId || organizationId.length > 128)
    throw new Error("Explicit organization required");
  const limit = options.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20)
    throw new Error("Rewrap batch size must be between 1 and 20");
  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid cutoff");
  const secrets = submissionSecrets(env);
  if (!secrets.activeKeyId || !secrets.keys)
    throw new Error("v2 keyring must be configured before rewrap");
  const target = `v2.${secrets.activeKeyId}.`;
  const status: RewrapStatus = { examined: 0, rewrapped: 0, conflicts: 0, dryRun: options.apply !== true };
  for (const source of sources) {
    const remaining = limit - status.examined;
    if (remaining === 0) break;
    const field = source.field === "answers" ? "answers_ciphertext" :
      source.field === "profile" ? "profile_ciphertext" : "reply_ciphertext";
    const query = source.kind === "submission"
      ? `SELECT s.id,s.${field} AS original,o.rewrapped_ciphertext AS previous,
           s.form_id,s.definition_id,NULL AS application_id,NULL AS requested_revision
         FROM form_submissions s LEFT JOIN private_cipher_rewraps o
         ON o.organization_id=s.organization_id AND o.source_kind='submission'
           AND o.source_id=s.id AND o.field_name=?
         WHERE s.organization_id=? AND s.state='active' AND s.retention_until>?
           AND s.${field} IS NOT NULL
           AND (o.rewrapped_ciphertext IS NULL OR substr(o.rewrapped_ciphertext,1,?)!=?)
         ORDER BY s.id LIMIT ?`
      : `SELECT r.id,r.reply_ciphertext AS original,o.rewrapped_ciphertext AS previous,
          NULL AS form_id,NULL AS definition_id,r.application_id,r.requested_revision
        FROM application_replies r
        JOIN exhibitor_applications a ON a.organization_id=r.organization_id AND a.id=r.application_id
        JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
        LEFT JOIN private_cipher_rewraps o ON o.organization_id=r.organization_id
          AND o.source_kind='reply' AND o.source_id=r.id AND o.field_name='reply'
        WHERE r.organization_id=? AND s.state='active' AND s.retention_until>?
          AND r.reply_ciphertext IS NOT NULL
          AND (o.rewrapped_ciphertext IS NULL OR substr(o.rewrapped_ciphertext,1,?)!=?)
        ORDER BY r.id LIMIT ?`;
    const statement = env.DB.prepare(query);
    const rows = await (source.kind === "submission"
      ? statement.bind(source.field,organizationId,now.toISOString(),target.length,target,remaining)
      : statement.bind(organizationId,now.toISOString(),target.length,target,remaining))
      .all<Candidate>();

    for (const row of rows.results) {
      status.examined++;
      if (status.dryRun) continue;
      const scope = source.kind === "submission"
        ? `${organizationId}:${row.form_id}:${row.id}:${row.definition_id}`
        : `${organizationId}:${row.application_id}:reply:${row.requested_revision}`;
      const current = row.previous ?? row.original;
      const plaintext = await decryptSubmission(secrets,organizationId,scope,current);
      const nextCipher = await encryptSubmission(secrets,organizationId,scope,plaintext);
      const digest = await fingerprint(row.original);

      // Re-read and compare underlying ciphertext inside the INSERT to avoid
      // resurrecting withdrawn data; the triggers enforce live ownership too.
      const table = source.kind === "submission" ? "form_submissions" : "application_replies";
      const extra = source.kind === "submission"
        ? `AND t.state='active' AND t.retention_until>?`
        : `AND EXISTS(SELECT 1 FROM exhibitor_applications a
            JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
            WHERE a.organization_id=t.organization_id AND a.id=t.application_id
              AND s.state='active' AND s.retention_until>?)`;
      const sql = `INSERT INTO private_cipher_rewraps(
          organization_id,source_kind,source_id,field_name,source_hash,rewrapped_ciphertext)
        SELECT ?,?,?,?,?,? FROM ${table} t WHERE t.organization_id=?
          AND t.id=? AND t.${field}=? ${extra}
        ON CONFLICT(organization_id,source_kind,source_id,field_name)
        DO UPDATE SET rewrapped_ciphertext=excluded.rewrapped_ciphertext,
          updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE private_cipher_rewraps.source_hash=excluded.source_hash
          AND private_cipher_rewraps.rewrapped_ciphertext IS ?`;
      const result = await env.DB.prepare(sql).bind(
        organizationId,source.kind,row.id,source.field,digest,nextCipher,
        organizationId,row.id,row.original,now.toISOString(),row.previous,
      ).run();
      if (result.meta.changes === 1) status.rewrapped++;
      else status.conflicts++;
    }
  }
  return status;
}
