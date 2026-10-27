/**
 * F6 — Retention of private exhibitor applications.
 *
 * Run only from trusted server context (Worker scheduled handler or explicit
 * operator process). No browser endpoint exposes this operation.
 * Data ownership is preserved by binding organization_id AND submission id
 * on each mutation. This does not delete immutable audits or publication
 * snapshots; consent resolution excludes purged submissions at serve time.
 *
 * This routine is not automatically scheduled until a Cloudflare cron trigger
 * has been reviewed and enabled in the target environment.
 */
export type RetentionPurgeResult = {
  examined: number;
  purged: number;
};

type ExpiredSubmission = {
  organization_id: string;
  id: string;
};

export async function purgeExpiredSubmissions(
  db: D1Database,
  now = new Date(),
  batchSize = 100,
): Promise<RetentionPurgeResult> {
  if (!Number.isFinite(now.getTime()))
    throw new Error("Invalid retention cutoff");
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 100)
    throw new Error("Retention batch must be between 1 and 100");
  const cutoff = now.toISOString();
  const expired = await db
    .prepare(
      "SELECT organization_id,id FROM form_submissions WHERE state IN ('active','withdrawn') AND retention_until<=? ORDER BY retention_until,organization_id,id LIMIT ?",
    )
    .bind(cutoff, batchSize)
    .all<ExpiredSubmission>();
  let purged = 0;
  for (const { organization_id: organizationId, id } of expired.results) {
    // D1 batch executes as one transaction; if any statement fails, the
    // associated redaction and audit are rolled back together.
    const changes = await db.batch([
      db.prepare(
        "UPDATE form_submissions SET state='purged',answers_ciphertext=NULL,profile_ciphertext=NULL,listing_opt_in=0 WHERE organization_id=? AND id=? AND retention_until<=? AND state IN ('active','withdrawn')",
      ).bind(organizationId, id, cutoff),
      db.prepare(
        "UPDATE exhibitor_applications SET applicant_message='' WHERE organization_id=? AND submission_id=? AND EXISTS(SELECT 1 FROM form_submissions WHERE organization_id=? AND id=? AND state='purged')",
      ).bind(organizationId, id, organizationId, id),
      // Deterministic primary key prevents duplicate audit records when the
      // purge is retried or two jobs overlap. No PII enters the audit event.
      db.prepare(
        "INSERT OR IGNORE INTO application_events(id,organization_id,application_id,action) SELECT 'retention:'||s.organization_id||':'||s.id,s.organization_id,a.id,'retention.purged' FROM form_submissions s JOIN exhibitor_applications a ON a.organization_id=s.organization_id AND a.submission_id=s.id WHERE s.organization_id=? AND s.id=? AND s.state='purged'",
      ).bind(organizationId, id),
    ]);
    purged += changes[0]?.meta.changes === 1 ? 1 : 0;
  }
  return { examined: expired.results.length, purged };
}
