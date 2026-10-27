import type { AuthEnvironment } from "../infrastructure/auth.server";
import { MediaValidationError, readBoundedBody, validateImageUpload } from "../infrastructure/media.server";
import { privateHeaders, requireSameOrigin } from "../infrastructure/security.server";
import { receiptDigest } from "../infrastructure/submission-crypto.server";
import { auditStatement, requireTenant } from "./tenant.server";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 3;
type AttachmentRow = {
  id: string; organization_id: string; edition_id: string; application_id: string;
  object_key: string; original_name: string; mime: string; byte_size: number;
  sha256: string; created_at: string;
};
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: privateHeaders() });

function nameFromRequest(request: Request) {
  const encoded = request.headers.get("X-File-Name");
  if (!encoded || encoded.length > 500)
    throw new Response("Nome de arquivo inválido", { status: 400 });
  let name: string;
  try { name = decodeURIComponent(encoded); }
  catch { throw new Response("Nome de arquivo inválido", { status: 400 }); }
  const safe = Array.from(name, (char) => {
    const code = char.codePointAt(0) ?? 0;
    return code < 32 || code === 127 || char === "/" || char === "\\" ? "_" : char;
  }).join("").trim().slice(0, 120);
  if (!safe || safe === "." || safe === "..")
    throw new Response("Nome de arquivo inválido", { status: 400 });
  return safe;
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (v) => v.toString(16).padStart(2, "0")).join("");
}

export async function handleApplicantAttachment(
  request: Request,
  env: AuthEnvironment,
  organizationId: string,
  editionId: string,
  opaqueReceipt: string,
) {
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: privateHeaders() });
  requireSameOrigin(request, new URL(request.url).origin);
  if (!env.ASSETS_PRIVATE)
    return json({ error: "Anexos privados indisponíveis nesta instalação." }, 503);
  const row = await env.DB.prepare(
    `SELECT a.id AS application_id,s.id AS submission_id,s.state,s.retention_until,s.receipt_expires_at
    FROM form_submissions s JOIN exhibitor_applications a
      ON a.organization_id=s.organization_id AND a.submission_id=s.id
    WHERE s.organization_id=? AND s.edition_id=? AND s.receipt_hash=?`,
  ).bind(organizationId, editionId, await receiptDigest(opaqueReceipt)).first<{
    application_id: string; submission_id: string;
    state: string; retention_until: string; receipt_expires_at: string;
  }>();
  const now = new Date().toISOString();
  if (!row || row.state !== "active" ||
      row.retention_until <= now || row.receipt_expires_at <= now)
    return json({ error: "Recibo inválido, retirado ou vencido." }, 410);

  const count = await env.DB.prepare(
    "SELECT count(*) AS n FROM application_attachments WHERE organization_id=? AND application_id=? AND state!='deleted'",
  ).bind(organizationId, row.application_id).first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_FILES)
    return json({ error: "Limite de três anexos por candidatura atingido." }, 409);

  const mime = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const filename = nameFromRequest(request);
  let bytes: Uint8Array;
  let info: ReturnType<typeof validateImageUpload>;
  try {
    const length = request.headers.get("Content-Length");
    bytes = await readBoundedBody(request.body, length === null ? null : Number(length), MAX_BYTES);
    info = validateImageUpload(bytes, mime, MAX_BYTES);
  } catch (error) {
    if (error instanceof MediaValidationError)
      return json({ error: error.message }, 400);
    throw error;
  }
  const id = crypto.randomUUID();
  const key = `org/${organizationId}/applications/${row.application_id}/${id}`;
  const digestBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(digestBuffer).set(bytes);
  const sha256 = hex(await crypto.subtle.digest("SHA-256", digestBuffer));
  try {
    await env.ASSETS_PRIVATE.put(key, bytes, {
      httpMetadata: { contentType: info.mime, cacheControl: "private, no-store" },
      customMetadata: { organizationId, applicationId: row.application_id, visibility: "private" },
    });
  } catch {
    return json({ error: "Armazenamento privado indisponível." }, 503);
  }
  try {
    const results = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO application_attachments(
          id,organization_id,edition_id,application_id,object_key,original_name,
          mime,byte_size,sha256
        ) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(
          SELECT 1 FROM form_submissions s JOIN exhibitor_applications a
          ON a.organization_id=s.organization_id AND a.submission_id=s.id
          WHERE a.organization_id=? AND a.edition_id=? AND a.id=?
            AND s.state='active' AND s.retention_until>? AND s.receipt_expires_at>?
        ) AND (
          SELECT count(*) FROM application_attachments WHERE organization_id=?
          AND application_id=? AND state!='deleted'
        )<?`,
      ).bind(
        id, organizationId, editionId, row.application_id, key, filename,
        info.mime, bytes.byteLength, sha256,
        organizationId, editionId, row.application_id, now, now,
        organizationId, row.application_id, MAX_FILES,
      ),
      env.DB.prepare(
        `INSERT INTO application_events(id,organization_id,application_id,action)
         SELECT ?,?,?,'attachment.uploaded' WHERE changes()=1`,
      ).bind(crypto.randomUUID(), organizationId, row.application_id),
    ]);
    if (results[0]?.meta.changes !== 1) {
      await env.ASSETS_PRIVATE.delete(key);
      return json({ error: "Candidatura alterada ou limite de anexos atingido." }, 409);
    }
    return json({
      id, name: filename, mime: info.mime,
      size: bytes.byteLength, sha256,
    }, 201);
  } catch (error) {
    if (env.APP_ENV === "local") {
      const detail = error instanceof Error ? error.message : "unknown";
      console.error(JSON.stringify({
        kind: "attachment_local_persistence_error",
        reason: detail.split("\n")[0]?.slice(0, 220).replace(/[a-f0-9]{8}-[a-f0-9-]{27}/gi, "[id]"),
      }));
    }
    // A failed D1 insert must not leave an untracked object in the private bucket.
    try { await env.ASSETS_PRIVATE.delete(key); }
    catch { console.error(JSON.stringify({ kind: "attachment_compensation_failed" })); }
    if (/attachment_limit|UNIQUE constraint/.test(error instanceof Error ? error.message : ""))
      return json({ error: "Limite de anexos ou operação duplicada." }, 409);
    throw error;
  }
}

export async function handleReviewerAttachment(
  request: Request,
  env: AuthEnvironment,
  organizationId: string,
  applicationId: string,
  attachmentId?: string,
) {
  if (request.method !== "GET")
    return new Response(null, { status: 405, headers: privateHeaders() });
  await requireTenant(request, env, organizationId, "org.read");
  const application = await env.DB.prepare(
    `SELECT e.event_id,s.state,s.retention_until FROM exhibitor_applications a
    JOIN editions e ON e.organization_id=a.organization_id AND e.id=a.edition_id
    JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
    WHERE a.organization_id=? AND a.id=?`,
  ).bind(organizationId, applicationId).first<{
    event_id: string; state: string; retention_until: string;
  }>();
  if (!application)
    throw new Response("Candidatura não encontrada", { status: 404 });
  const actor = await requireTenant(
    request, env, organizationId, "applications.review", application.event_id,
  );
  if (application.state !== "active" || application.retention_until <= new Date().toISOString())
    return json(attachmentId ? { error: "Arquivo não disponível." } : [], attachmentId ? 404 : 200);
  if (!attachmentId) {
    const rows = await env.DB.prepare(
      `SELECT id,original_name,mime,byte_size,sha256,created_at
       FROM application_attachments WHERE organization_id=? AND application_id=?
       AND state='ready' ORDER BY created_at,id LIMIT 3`,
    ).bind(organizationId, applicationId).all<AttachmentRow>();
    return json(rows.results);
  }
  const attachment = await env.DB.prepare(
    "SELECT * FROM application_attachments WHERE organization_id=? AND application_id=? AND id=? AND state='ready'",
  ).bind(organizationId, applicationId, attachmentId).first<AttachmentRow>();
  if (!attachment || !attachment.object_key.startsWith(`org/${organizationId}/applications/${applicationId}/`))
    throw new Response("Arquivo não encontrado", { status: 404 });
  if (!env.ASSETS_PRIVATE)
    return json({ error: "Armazenamento privado indisponível." }, 503);
  const object = await env.ASSETS_PRIVATE.get(attachment.object_key);
  if (!object || object.customMetadata?.organizationId !== organizationId ||
      object.customMetadata?.applicationId !== applicationId ||
      object.customMetadata?.visibility !== "private")
    throw new Response("Arquivo não encontrado", { status: 404 });
  await env.DB.batch([
    auditStatement(env.DB, organizationId, actor.identity.user.id,
      "application.attachment.downloaded", "application", applicationId,
      { attachmentId }),
  ]);
  const extension = attachment.mime === "image/png" ? "png" :
    attachment.mime === "image/jpeg" ? "jpg" : "webp";
  return new Response(object.body, {
    headers: {
      ...privateHeaders(),
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="anexo-${attachment.id}.${extension}"`,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

/**
 * Delete private objects only after a durable D1 "delete_pending" transition.
 * Can run safely multiple times. If the bucket is unavailable, leave work
 * queued instead of falsely declaring physical deletion.
 */
export async function cleanupPendingApplicantAttachments(env: AuthEnvironment, max = 50, organizationId?: string) {
  if (!env.ASSETS_PRIVATE) return { deleted: 0, pending: true };
  const pending = await env.DB.prepare(
    "SELECT id,organization_id,object_key FROM application_attachments WHERE state='delete_pending' AND (? IS NULL OR organization_id=?) ORDER BY created_at,id LIMIT ?",
  ).bind(organizationId ?? null, organizationId ?? null, max).all<{ id: string; organization_id: string; object_key: string }>();
  let deleted = 0;
  for (const row of pending.results) {
    if (!row.object_key.startsWith(`org/${row.organization_id}/applications/`))
      continue;
    try {
      await env.ASSETS_PRIVATE.delete(row.object_key);
      const result = await env.DB.prepare(
        "UPDATE application_attachments SET state='deleted',removed_at=? WHERE id=? AND organization_id=? AND state='delete_pending'",
      ).bind(new Date().toISOString(), row.id, row.organization_id).run();
      deleted += result.meta.changes;
    } catch {
      console.error(JSON.stringify({ kind: "attachment_cleanup_retry_required" }));
    }
  }
  return { deleted, pending: pending.results.length === max };
}
