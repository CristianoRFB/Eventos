import { z } from "zod";
import type { AuthEnvironment } from "../infrastructure/auth.server";
import { handleApplicantAttachment, cleanupPendingApplicantAttachments } from "./application-attachments.server";
import {
  privateHeaders,
  requireSameOrigin,
} from "../infrastructure/security.server";
import { readJsonBody } from "../infrastructure/request.server";
import {
  privateDigest,
  receiptDigest,
  encryptSubmission,
  equalPrivateDigests,
} from "../infrastructure/submission-crypto.server";
import {
  submitFormSchema,
  validateAnswers,
  receiptIsAvailable,
} from "../domain/forms";
import { resolvePublicSite } from "./content.server";

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: privateHeaders() });
type Existing = {
  id: string;
  payload_hash: string;
  receipt_expires_at: string;
  state: string;
};
export async function handlePublicForms(
  request: Request,
  env: AuthEnvironment,
) {
  const url = new URL(request.url);
  const site = await resolvePublicSite(request, env);
  if (request.method !== "GET") requireSameOrigin(request, url.origin);
  const receiptAttachment = url.pathname.match(
    /^\/api\/v1\/public\/applications\/([a-f0-9]{64})\/attachments$/,
  );
  if (receiptAttachment)
    return handleApplicantAttachment(
      request, env, site.organizationId, site.editionId, receiptAttachment[1]!,
    );
  const submit = url.pathname.match(
    /^\/api\/v1\/public\/forms\/([^/]+)\/submit$/,
  );
  if (submit && request.method === "POST") {
    const form = site.content.forms.find((f) => f.id === submit[1]);
    if (!form) throw new Response("Formulário não encontrado", { status: 404 });
    const input = submitFormSchema.parse(await readJsonBody(request, 32000));
    if (input.websiteTrap)
      throw new Response("Não foi possível receber este envio", {
        status: 400,
      });
    if (input.definitionId !== form.definitionId)
      return json({ error: "O formulário mudou. Atualize a página." }, 409);
    const answers = validateAnswers(form.definition, input.answers);
    const identity = `${site.organizationId}:${form.id}:${input.idempotencyKey}`;
    const idempotencyHash = await privateDigest(
      env.BETTER_AUTH_SECRET,
      `idempotency:${identity}`,
    );
    const payloadHash = await privateDigest(
      env.BETTER_AUTH_SECRET,
      `payload:${site.organizationId}:${form.definitionId}:${JSON.stringify({ answers, privacyAccepted: input.privacyAccepted, listingOptIn: input.listingOptIn, profile: input.publicProfile ?? null })}`,
    );
    const receipt = await privateDigest(
      env.BETTER_AUTH_SECRET,
      `receipt:${identity}`,
    );
    const existing = () =>
      env.DB.prepare(
        "SELECT id,payload_hash,receipt_expires_at,state FROM form_submissions WHERE organization_id=? AND form_id=? AND idempotency_hash=?",
      )
        .bind(site.organizationId, form.id, idempotencyHash)
        .first<Existing>();
    const responseFor = (row: Existing, status = 200) =>
      !equalPrivateDigests(row.payload_hash, payloadHash)
        ? json(
            { error: "Este código de envio já foi usado com outras respostas" },
            409,
          )
        : json(
            {
              receipt,
              statusUrl: `/candidatura/${receipt}`,
              expiresAt: row.receipt_expires_at,
              state: row.state,
            },
            status,
          );
    const found = await existing();
    if (found) return responseFor(found);
    if (site.formStates[form.id] !== "open")
      return json({ error: "As inscrições estão encerradas" }, 409);
    // Operational abuse protection, independent of any commercial plan.
    const ip =
      env.APP_ENV === "local"
        ? "local-synthetic"
        : (request.headers.get("cf-connecting-ip") ?? "unknown");
    const keyHash = await privateDigest(
      env.BETTER_AUTH_SECRET,
      `rate:${site.organizationId}:${form.id}:${ip}`,
    );
    const bucket = Math.floor(Date.now() / 60000);
    const rate = await env.DB.prepare(
      "INSERT INTO public_form_rate_limits(organization_id,form_id,key_hash,bucket,count) VALUES(?,?,?,?,1) ON CONFLICT(organization_id,form_id,key_hash,bucket) DO UPDATE SET count=count+1 WHERE count<10",
    )
      .bind(site.organizationId, form.id, keyHash, bucket)
      .run();
    if (rate.meta.changes !== 1)
      return Response.json(
        { error: "Muitos envios. Aguarde um minuto e tente novamente." },
        { status: 429, headers: { ...privateHeaders(), "Retry-After": "60" } },
      );
    const id = crypto.randomUUID(),
      applicationId = crypto.randomUUID();
    const scope = `${site.organizationId}:${form.id}:${id}:${form.definitionId}`;
    const expiresAt = new Date(
      Date.now() + Math.min(14, form.definition.retentionDays) * 86400000,
    ).toISOString();
    const retentionUntil = new Date(
      Date.now() + form.definition.retentionDays * 86400000,
    ).toISOString();
    const encryptedAnswers = await encryptSubmission(
      env.BETTER_AUTH_SECRET,
      site.organizationId,
      scope,
      answers,
    );
    const encryptedProfile = input.publicProfile
      ? await encryptSubmission(
          env.BETTER_AUTH_SECRET,
          site.organizationId,
          scope,
          input.publicProfile,
        )
      : null;
    try {
      const results = await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO form_submissions(id,organization_id,edition_id,form_id,definition_id,idempotency_hash,payload_hash,receipt_hash,answers_ciphertext,profile_ciphertext,listing_opt_in,receipt_expires_at,retention_until)
          SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM forms f JOIN editions e ON e.organization_id=f.organization_id AND e.id=f.edition_id JOIN organizations o ON o.id=f.organization_id WHERE f.organization_id=? AND f.edition_id=? AND f.id=? AND f.state='open' AND e.status='active' AND o.status='active')
          AND (? IS NULL OR ?>?) AND EXISTS(SELECT 1 FROM edition_publication_pointers ptr JOIN publications p ON p.organization_id=ptr.organization_id AND p.edition_id=ptr.edition_id AND p.id=ptr.publication_id JOIN json_each(json_extract(p.snapshot_json,'$.forms')) field WHERE ptr.organization_id=? AND ptr.edition_id=? AND json_extract(field.value,'$.id')=? AND json_extract(field.value,'$.definitionId')=?)`,
        ).bind(
          id,
          site.organizationId,
          site.editionId,
          form.id,
          form.definitionId,
          idempotencyHash,
          payloadHash,
          await receiptDigest(receipt),
          encryptedAnswers,
          encryptedProfile,
          input.listingOptIn ? 1 : 0,
          expiresAt,
          retentionUntil,
          site.organizationId,
          site.editionId,
          form.id,
          form.definition.deadlineAt ?? null,
          form.definition.deadlineAt ?? null,
          new Date().toISOString(),
          site.organizationId,
          site.editionId,
          form.id,
          form.definitionId,
        ),
        env.DB.prepare(
          "INSERT INTO exhibitor_applications(id,organization_id,edition_id,submission_id) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM form_submissions WHERE organization_id=? AND id=?)",
        ).bind(
          applicationId,
          site.organizationId,
          site.editionId,
          id,
          site.organizationId,
          id,
        ),
        env.DB.prepare(
          "INSERT INTO application_events(id,organization_id,application_id,action) SELECT ?,?,?,'submitted.privacy_accepted' WHERE EXISTS(SELECT 1 FROM exhibitor_applications WHERE organization_id=? AND id=?)",
        ).bind(
          crypto.randomUUID(),
          site.organizationId,
          applicationId,
          site.organizationId,
          applicationId,
        ),
      ]);
      if (results[0].meta.changes !== 1)
        return json(
          {
            error: "O formulário foi fechado ou atualizado. Atualize a página.",
          },
          409,
        );
      return responseFor(
        {
          id,
          payload_hash: payloadHash,
          receipt_expires_at: expiresAt,
          state: "active",
        },
        201,
      );
    } catch (error) {
      if (
        /UNIQUE constraint/i.test(error instanceof Error ? error.message : "")
      ) {
        const duplicate = await existing();
        if (duplicate) return responseFor(duplicate);
      }
      throw error;
    }
  }
  const receiptRoute = url.pathname.match(
    /^\/api\/v1\/public\/applications\/([a-f0-9]{64})(?:\/(withdraw|reply))?$/,
  );
  if (receiptRoute) {
    const row = await env.DB.prepare(
      "SELECT s.id,s.state,s.receipt_expires_at,s.retention_until,a.id AS application_id,a.status,a.revision,a.applicant_message,f.name AS form_name FROM form_submissions s JOIN exhibitor_applications a ON a.organization_id=s.organization_id AND a.submission_id=s.id JOIN forms f ON f.organization_id=s.organization_id AND f.id=s.form_id WHERE s.organization_id=? AND s.edition_id=? AND s.receipt_hash=?",
    )
      .bind(
        site.organizationId,
        site.editionId,
        await receiptDigest(receiptRoute[1]!),
      )
      .first<{
        id: string;
        state: string;
        receipt_expires_at: string;
        retention_until: string;
        application_id: string;
        status: string;
        revision: number;
        applicant_message: string;
        form_name: string;
      }>();
    if (!row) throw new Response("Recibo não encontrado", { status: 404 });
    if (!receiptIsAvailable(row.receipt_expires_at, row.retention_until))
      throw new Response("O recibo expirou", { status: 410 });
    if (request.method === "GET" && !receiptRoute[2])
      return json({
        status: row.state === "active" ? row.status : row.state,
        applicantMessage: row.state === "active" ? row.applicant_message : "",
        formName: row.form_name,
        expiresAt: row.receipt_expires_at,
        revision: row.revision,
        canReply: row.state === "active" && row.status === "needs_info",
      });
    if (request.method === "POST" && receiptRoute[2] === "reply") {
      const parsed = z.object({
        expectedRevision: z.number().int().positive(),
        message: z.string().trim().min(1).max(2000),
      }).strict().safeParse(await readJsonBody(request, 4096));
      if (!parsed.success)
        return json({ error: "Resposta inválida. Informe uma mensagem de até 2000 caracteres." }, 400);
      const input = parsed.data;
      if (
        row.state !== "active" ||
        row.status !== "needs_info" ||
        row.revision !== input.expectedRevision
      ) return json({ error: "Esta solicitação já foi respondida ou alterada." }, 409);
      const replyId = crypto.randomUUID();
      const scope = `${site.organizationId}:${row.application_id}:reply:${row.revision}`;
      const encrypted = await encryptSubmission(
        env.BETTER_AUTH_SECRET,
        site.organizationId,
        scope,
        { message: input.message },
      );
      try {
        const results = await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO application_replies(id,organization_id,edition_id,application_id,requested_revision,reply_ciphertext)
             SELECT ?,?,?,?,?,? WHERE EXISTS(
               SELECT 1 FROM exhibitor_applications a
               JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id
               WHERE a.organization_id=? AND a.edition_id=? AND a.id=?
                 AND a.status='needs_info' AND a.revision=?
                 AND s.state='active' AND s.retention_until>? AND s.receipt_expires_at>?
             )`,
          ).bind(
            replyId, site.organizationId, site.editionId, row.application_id,
            input.expectedRevision, encrypted,
            site.organizationId, site.editionId, row.application_id,
            input.expectedRevision, new Date().toISOString(), new Date().toISOString(),
          ),
          env.DB.prepare(
            `UPDATE exhibitor_applications SET status='submitted',revision=revision+1
             WHERE organization_id=? AND edition_id=? AND id=? AND status='needs_info'
             AND revision=? AND EXISTS(
               SELECT 1 FROM application_replies WHERE organization_id=?
                 AND application_id=? AND requested_revision=?
             )`,
          ).bind(
            site.organizationId, site.editionId, row.application_id,
            input.expectedRevision, site.organizationId, row.application_id,
            input.expectedRevision,
          ),
          env.DB.prepare(
            `INSERT INTO application_events(id,organization_id,application_id,action)
             SELECT ?,?,?,'applicant.replied' WHERE changes()=1`,
          ).bind(crypto.randomUUID(), site.organizationId, row.application_id),
        ]);
        return results[0].meta.changes === 1 && results[1].meta.changes === 1
          ? json({ status: "submitted", revision: input.expectedRevision + 1 })
          : json({ error: "Esta solicitação já foi respondida ou alterada." }, 409);
      } catch (error) {
        if (/UNIQUE constraint/i.test(error instanceof Error ? error.message : ""))
          return json({ error: "Resposta já registrada para esta solicitação." }, 409);
        throw error;
      }
    }
    if (request.method === "POST" && receiptRoute[2] === "withdraw") {
      if (row.state === "active")
        await env.DB.batch([
          env.DB.prepare(
            "UPDATE form_submissions SET state='withdrawn',answers_ciphertext=NULL,profile_ciphertext=NULL,listing_opt_in=0 WHERE organization_id=? AND edition_id=? AND id=? AND state='active'",
          ).bind(site.organizationId, site.editionId, row.id),
          env.DB.prepare(
            "INSERT INTO application_events(id,organization_id,application_id,action) SELECT ?,?,?,'withdrawn' WHERE changes()=1",
          ).bind(crypto.randomUUID(), site.organizationId, row.application_id),
          env.DB.prepare(
            "UPDATE application_replies SET reply_ciphertext=NULL WHERE organization_id=? AND application_id=? AND reply_ciphertext IS NOT NULL",
          ).bind(site.organizationId, row.application_id),
          env.DB.prepare(
            "UPDATE application_attachments SET state='delete_pending',original_name='' WHERE organization_id=? AND application_id=? AND state='ready'",
          ).bind(site.organizationId, row.application_id),
        ]);
      // Withdrawal never waits on R2 availability: metadata is already
      // durably hidden and the retryable cleanup queue preserves the work.
      try { await cleanupPendingApplicantAttachments(env, 50, site.organizationId); }
      catch { console.error(JSON.stringify({ kind: "attachment_withdrawal_cleanup_pending" })); }
      return json({ status: "withdrawn" });
    }
    return new Response(null, { status: 405, headers: privateHeaders() });
  }
  return json({ error: "Rota não encontrada" }, 404);
}
