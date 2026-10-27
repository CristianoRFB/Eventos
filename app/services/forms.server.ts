import { z } from "zod";
import { csvRow } from "../domain/export-csv";
import {
  formDefinitionSchema,
  applicantProfileSchema,
  type PublicForm,
} from "../domain/forms";
import { contentDocumentSchema, starterContent } from "../domain/content";
import type { Operations } from "../domain/operations";
import type { AuthEnvironment } from "../infrastructure/auth.server";
import { privateHeaders } from "../infrastructure/security.server";
import { readJsonBody } from "../infrastructure/request.server";
import { decryptSubmission, submissionSecrets } from "../infrastructure/submission-crypto.server";
import { resolveRewrappedCipher } from "./forms-rewrap.server";
import { requireTenant, auditStatement } from "./tenant.server";
import type { saveDraft } from "./content.server";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: privateHeaders() });
const expected = z.number().int().positive();
export async function editionFormContext(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
  permission: "forms.manage" | "applications.review" | "content.read",
) {
  await requireTenant(request, env, orgId, "org.read");
  const edition = await env.DB.prepare(
    "SELECT id,event_id,status FROM editions WHERE organization_id=? AND id=?",
  )
    .bind(orgId, editionId)
    .first<{ id: string; event_id: string; status: string }>();
  if (!edition) throw new Response("Edição não encontrada", { status: 404 });
  const actor = await requireTenant(
    request,
    env,
    orgId,
    permission,
    edition.event_id,
  );
  if (request.method !== "GET" && edition.status === "archived")
    throw new Response("Edição arquivada", { status: 409 });
  return { edition, actor };
}

export async function validateContentForms(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  edition: { id: string; event_id: string },
  next: PublicForm[],
  previous: PublicForm[],
) {
  if (JSON.stringify(next) !== JSON.stringify(previous))
    await requireTenant(request, env, orgId, "forms.manage", edition.event_id);
  if (new Set(next.map((f) => f.id)).size !== next.length)
    throw new Response("Formulário duplicado no site", { status: 400 });
  for (const form of next) {
    const row = await env.DB.prepare(
      "SELECT d.definition_json FROM form_definitions d JOIN forms f ON f.organization_id=d.organization_id AND f.id=d.form_id WHERE d.organization_id=? AND f.edition_id=? AND f.id=? AND d.id=?",
    )
      .bind(orgId, edition.id, form.id, form.definitionId)
      .first<{ definition_json: string }>();
    if (
      !row ||
      JSON.stringify(
        formDefinitionSchema.parse(JSON.parse(row.definition_json)),
      ) !== JSON.stringify(form.definition)
    )
      throw new Response(
        "A versão do formulário não pertence à edição ou foi alterada",
        { status: 400 },
      );
  }
}

/** Consent can be withdrawn after publication; return no stale personal profile. */
export async function filterConsentedProfiles(
  db: D1Database,
  orgId: string,
  editionId: string,
  exhibitors: Operations["exhibitors"],
) {
  if (!exhibitors.length) return { exhibitors, hasSources: false };
  const rows = await db
    .prepare(
      "SELECT src.exhibitor_id,a.status,s.state,s.listing_opt_in,s.retention_until FROM public_profile_sources src JOIN exhibitor_applications a ON a.organization_id=src.organization_id AND a.edition_id=src.edition_id AND a.id=src.application_id JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id WHERE src.organization_id=? AND src.edition_id=? AND src.exhibitor_id IN (SELECT value FROM json_each(?))",
    )
    .bind(orgId, editionId, JSON.stringify(exhibitors.map((e) => e.id)))
    .all<{
      exhibitor_id: string;
      status: string;
      state: string;
      listing_opt_in: number;
      retention_until: string;
    }>();
  const disallowed = new Set(
    rows.results
      .filter(
        (r) =>
          r.status !== "approved" ||
          r.state !== "active" ||
          r.listing_opt_in !== 1 ||
          Date.parse(r.retention_until) <= Date.now(),
      )
      .map((r) => r.exhibitor_id),
  );
  return {
    exhibitors: exhibitors.filter((e) => !disallowed.has(e.id)),
    hasSources: rows.results.length > 0,
  };
}

async function latestContent(
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
) {
  const row = await env.DB.prepare(
    "SELECT revision,content_json FROM content_drafts WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 1",
  )
    .bind(orgId, editionId)
    .first<{ revision: number; content_json: string }>();
  return {
    revision: row?.revision ?? 0,
    content: contentDocumentSchema.parse(
      row ? JSON.parse(row.content_json) : structuredClone(starterContent),
    ),
  };
}
function draftRequest(request: Request, revision: number, content: unknown) {
  const headers = new Headers(request.headers);
  headers.delete("Content-Length");
  headers.set("Content-Type", "application/json");
  return new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ expectedRevision: revision, content }),
  });
}
function fieldStatement(
  db: D1Database,
  orgId: string,
  definitionId: string,
  definition: unknown,
) {
  return db
    .prepare(
      "INSERT INTO form_fields(organization_id,definition_id,field_key,field_json) SELECT ?,?,json_extract(value,'$.key'),value FROM json_each(json_extract(?,'$.fields')) WHERE EXISTS(SELECT 1 FROM form_definitions WHERE organization_id=? AND id=?)",
    )
    .bind(orgId, definitionId, JSON.stringify(definition), orgId, definitionId);
}

export async function handleFormsAdmin(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
  formId: string | undefined,
  action: string | undefined,
  save: typeof saveDraft,
) {
  const { edition, actor } = await editionFormContext(
    request,
    env,
    orgId,
    editionId,
    "forms.manage",
  );
  if (!formId) {
    if (request.method === "GET")
      return json(
        (
          await env.DB.prepare(
            "SELECT id,name,state,revision FROM forms WHERE organization_id=? AND edition_id=? ORDER BY created_at DESC LIMIT 100",
          )
            .bind(orgId, editionId)
            .all()
        ).results,
      );
    if (request.method !== "POST") return new Response(null, { status: 405 });
    const input = z
      .object({ definition: formDefinitionSchema })
      .strict()
      .parse(await readJsonBody(request));
    const id = crypto.randomUUID(),
      definitionId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO forms(id,organization_id,edition_id,name) VALUES(?,?,?,?)",
      ).bind(id, orgId, editionId, input.definition.name),
      env.DB.prepare(
        "INSERT INTO form_definitions(id,organization_id,form_id,revision,definition_json,created_by) VALUES(?,?,?,1,?,?)",
      ).bind(
        definitionId,
        orgId,
        id,
        JSON.stringify(input.definition),
        actor.identity.user.id,
      ),
      fieldStatement(env.DB, orgId, definitionId, input.definition),
      auditStatement(
        env.DB,
        orgId,
        actor.identity.user.id,
        "form.created",
        "form",
        id,
      ),
    ]);
    return json({ id, definitionId, revision: 1 }, 201);
  }
  const form = await env.DB.prepare(
    "SELECT id,name,state,revision FROM forms WHERE organization_id=? AND edition_id=? AND id=?",
  )
    .bind(orgId, editionId, formId)
    .first<{ id: string; name: string; state: string; revision: number }>();
  if (!form) throw new Response("Formulário não encontrado", { status: 404 });
  if (request.method === "GET") {
    const definitions = await env.DB.prepare(
      "SELECT id,revision,definition_json,created_at FROM form_definitions WHERE organization_id=? AND form_id=? ORDER BY revision DESC LIMIT 50",
    )
      .bind(orgId, formId)
      .all<{
        id: string;
        revision: number;
        definition_json: string;
        created_at: string;
      }>();
    return json({
      ...form,
      definitions: definitions.results.map((d) => ({
        id: d.id,
        revision: d.revision,
        createdAt: d.created_at,
        definition: formDefinitionSchema.parse(JSON.parse(d.definition_json)),
      })),
    });
  }
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (action === "definitions") {
    const input = z
      .object({ expectedRevision: expected, definition: formDefinitionSchema })
      .strict()
      .parse(await readJsonBody(request));
    const id = crypto.randomUUID();
    const results = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO form_definitions(id,organization_id,form_id,revision,definition_json,created_by) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM forms WHERE organization_id=? AND edition_id=? AND id=? AND revision=?)",
      ).bind(
        id,
        orgId,
        formId,
        input.expectedRevision + 1,
        JSON.stringify(input.definition),
        actor.identity.user.id,
        orgId,
        editionId,
        formId,
        input.expectedRevision,
      ),
      fieldStatement(env.DB, orgId, id, input.definition),
      env.DB.prepare(
        "UPDATE forms SET name=?,revision=revision+1 WHERE organization_id=? AND id=? AND revision=? AND EXISTS(SELECT 1 FROM form_definitions WHERE organization_id=? AND id=?)",
      ).bind(
        input.definition.name,
        orgId,
        formId,
        input.expectedRevision,
        orgId,
        id,
      ),
      env.DB.prepare(
        "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id) SELECT ?,?,?,'form.version.created','form',? WHERE EXISTS(SELECT 1 FROM form_definitions WHERE organization_id=? AND id=?)",
      ).bind(
        crypto.randomUUID(),
        orgId,
        actor.identity.user.id,
        formId,
        orgId,
        id,
      ),
    ]);
    return results[0].meta.changes === 1
      ? json({ definitionId: id, revision: input.expectedRevision + 1 }, 201)
      : json({ error: "O formulário mudou. Atualize a página." }, 409);
  }
  if (action === "state") {
    const input = z
      .object({ expectedRevision: expected, state: z.enum(["open", "closed"]) })
      .strict()
      .parse(await readJsonBody(request));
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE forms SET state=?,revision=revision+1 WHERE organization_id=? AND edition_id=? AND id=? AND revision=?",
      ).bind(input.state, orgId, editionId, formId, input.expectedRevision),
      env.DB.prepare(
        "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,?,'form.state.changed','form',?,? WHERE changes()=1",
      ).bind(
        crypto.randomUUID(),
        orgId,
        actor.identity.user.id,
        formId,
        JSON.stringify({ state: input.state }),
      ),
    ]);
    return results[0].meta.changes === 1
      ? json({ revision: input.expectedRevision + 1 })
      : json({ error: "O formulário mudou. Atualize a página." }, 409);
  }
  if (action === "stage") {
    const input = z
      .object({
        expectedDraftRevision: z.number().int().nonnegative(),
        definitionId: z.string().uuid(),
      })
      .strict()
      .parse(await readJsonBody(request));
    const def = await env.DB.prepare(
      "SELECT definition_json FROM form_definitions WHERE organization_id=? AND form_id=? AND id=?",
    )
      .bind(orgId, formId, input.definitionId)
      .first<{ definition_json: string }>();
    if (!def) throw new Response("Versão não encontrada", { status: 404 });
    const { content } = await latestContent(env, orgId, edition.id);
    content.forms = [
      ...content.forms.filter((f) => f.id !== formId),
      {
        id: formId,
        definitionId: input.definitionId,
        definition: formDefinitionSchema.parse(JSON.parse(def.definition_json)),
      },
    ];
    return save(
      draftRequest(request, input.expectedDraftRevision, content),
      env,
      orgId,
      editionId,
    );
  }
  return json({ error: "Rota não encontrada" }, 404);
}

async function applicationContext(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  id: string,
) {
  await requireTenant(request, env, orgId, "org.read");
  const row = await env.DB.prepare(
    "SELECT a.id,a.edition_id,e.event_id FROM exhibitor_applications a JOIN editions e ON e.organization_id=a.organization_id AND e.id=a.edition_id WHERE a.organization_id=? AND a.id=?",
  )
    .bind(orgId, id)
    .first<{ id: string; edition_id: string; event_id: string }>();
  if (!row) throw new Response("Candidatura não encontrada", { status: 404 });
  const actor = await requireTenant(
    request,
    env,
    orgId,
    "applications.review",
    row.event_id,
  );
  return { ...row, actor };
}
export async function handleApplicationsAdmin(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string | undefined,
  id: string | undefined,
  action: string | undefined,
  save: typeof saveDraft,
) {
  if (!id && editionId) {
    if (request.method !== "GET") return new Response(null, { status: 405 });
    const { actor } = await editionFormContext(
      request,
      env,
      orgId,
      editionId,
      "applications.review",
    );
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(new URL(request.url).searchParams.get("page") ?? 0);
    if (action === "export") {
      // Staff-only, scoped, bounded and audited. CSV is never public or cached.
      // Retention-expired and withdrawn responses are never decrypted/exported.
      const rows = await env.DB.prepare(
        "SELECT a.id,a.status,a.created_at,f.name AS form_name,s.state,s.retention_until,s.form_id,s.definition_id,s.id AS submission_id,s.answers_ciphertext FROM exhibitor_applications a JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id JOIN forms f ON f.organization_id=s.organization_id AND f.id=s.form_id WHERE a.organization_id=? AND a.edition_id=? ORDER BY a.created_at DESC,a.id LIMIT 100 OFFSET ?",
      ).bind(orgId, editionId, page * 100).all<{
        id: string; status: string; created_at: string; form_name: string;
        state: string; retention_until: string; form_id: string;
        definition_id: string; submission_id: string;
        answers_ciphertext: string | null;
      }>();
      const lines = [csvRow(["id", "formulario", "status", "enviada_em", "respostas_json"])];
      for (const row of rows.results) {
        const active = row.state === "active" &&
          Date.parse(row.retention_until) > Date.now();
        const scope = `${orgId}:${row.form_id}:${row.submission_id}:${row.definition_id}`;
        const effective = active
          ? await resolveRewrappedCipher(env.DB, orgId, "answers", row.submission_id, row.answers_ciphertext)
          : null;
        const answers = effective
          ? await decryptSubmission(submissionSecrets(env), orgId, scope, effective)
          : null;
        lines.push(csvRow([
          row.id, row.form_name, active ? row.status : row.state,
          row.created_at, answers ? JSON.stringify(answers) : "",
        ]));
      }
      await env.DB.batch([
        auditStatement(
          env.DB, orgId, actor.identity.user.id,
          "application.private.export", "edition", editionId,
        ),
      ]);
      return new Response("\uFEFF" + lines.join("\r\n") + "\r\n", {
        status: 200,
        headers: {
          ...privateHeaders(),
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="eventos77-candidaturas.csv"',
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
        },
      });
    }
    return json(
      (
        await env.DB.prepare(
          "SELECT a.id,a.status,a.revision,a.created_at,f.name AS form_name,s.state AS submission_state FROM exhibitor_applications a JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id JOIN forms f ON f.organization_id=s.organization_id AND f.id=s.form_id WHERE a.organization_id=? AND a.edition_id=? ORDER BY a.created_at DESC,a.id LIMIT 50 OFFSET ?",
        )
          .bind(orgId, editionId, page * 50)
          .all()
      ).results,
    );
  }
  if (!id) throw new Response("Candidatura não encontrada", { status: 404 });
  const context = await applicationContext(request, env, orgId, id);
  const row = await env.DB.prepare(
    "SELECT a.status,a.revision,a.applicant_message,s.id AS submission_id,s.definition_id,s.form_id,s.answers_ciphertext,s.profile_ciphertext,s.listing_opt_in,s.state,s.retention_until FROM exhibitor_applications a JOIN form_submissions s ON s.organization_id=a.organization_id AND s.id=a.submission_id WHERE a.organization_id=? AND a.id=?",
  )
    .bind(orgId, id)
    .first<{
      status: string;
      revision: number;
      applicant_message: string;
      submission_id: string;
      definition_id: string;
      form_id: string;
      answers_ciphertext: string | null;
      profile_ciphertext: string | null;
      listing_opt_in: number;
      state: string;
      retention_until: string;
    }>();
  if (!row) throw new Response("Candidatura não encontrada", { status: 404 });
  const scope = `${orgId}:${row.form_id}:${row.submission_id}:${row.definition_id}`;
  // Resolve tenant/record-bound replacements without mutating originals.
  // The caller still must enforce state, permissions and retention separately.
  const effectiveAnswers = await resolveRewrappedCipher(
    env.DB, orgId, "answers", row.submission_id, row.answers_ciphertext,
  );
  const effectiveProfile = await resolveRewrappedCipher(
    env.DB, orgId, "profile", row.submission_id, row.profile_ciphertext,
  );
  if (request.method === "GET") {
    if (row.state !== "active" || Date.parse(row.retention_until) <= Date.now())
      return json({
        id,
        status: row.state,
        revision: row.revision,
        answers: null,
        publicProfile: null,
      });
    await env.DB.batch([
      auditStatement(
        env.DB,
        orgId,
        context.actor.identity.user.id,
        "application.private.read",
        "application",
        id,
      ),
    ]);
    const definition = await env.DB.prepare(
      "SELECT definition_json FROM form_definitions WHERE organization_id=? AND form_id=? AND id=?",
    )
      .bind(orgId, row.form_id, row.definition_id)
      .first<{ definition_json: string }>();
    const followUps = await env.DB.prepare(
      "SELECT id,requested_revision,reply_ciphertext,created_at FROM application_replies WHERE organization_id=? AND edition_id=? AND application_id=? AND reply_ciphertext IS NOT NULL ORDER BY requested_revision",
    ).bind(orgId, context.edition_id, id).all<{
      id: string;
      requested_revision: number;
      reply_ciphertext: string;
      created_at: string;
    }>();
    const applicantReplies = [];
    for (const reply of followUps.results) {
      const effectiveReply = await resolveRewrappedCipher(
        env.DB, orgId, "reply", reply.id, reply.reply_ciphertext,
      );
      if (!effectiveReply) continue;
      const decrypted = await decryptSubmission(
        submissionSecrets(env),
        orgId,
        `${orgId}:${id}:reply:${reply.requested_revision}`,
        effectiveReply,
      ) as { message: string };
      applicantReplies.push({
        requestedRevision: reply.requested_revision,
        message: decrypted.message,
        createdAt: reply.created_at,
      });
    }
    const attachments = await env.DB.prepare(
      "SELECT id,original_name,mime,byte_size,sha256,created_at FROM application_attachments WHERE organization_id=? AND application_id=? AND state='ready' ORDER BY created_at,id LIMIT 3",
    ).bind(orgId, id).all<{
      id: string; original_name: string; mime: string;
      byte_size: number; sha256: string; created_at: string;
    }>();
    return json({
      id,
      attachments: attachments.results,
      status: row.status,
      revision: row.revision,
      applicantReplies,
      applicantMessage: row.applicant_message,
      listingOptIn: row.listing_opt_in === 1,
      fields: definition
        ? formDefinitionSchema
            .parse(JSON.parse(definition.definition_json))
            .fields.map((f) => ({ key: f.key, label: f.label }))
        : [],
      answers: effectiveAnswers
        ? await decryptSubmission(submissionSecrets(env), orgId, scope, effectiveAnswers)
        : null,
      publicProfile: effectiveProfile
        ? await decryptSubmission(submissionSecrets(env), orgId, scope, effectiveProfile)
        : null,
    });
  }
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (action === "review") {
    const input = z
      .object({
        expectedRevision: expected,
        status: z.enum(["approved", "rejected", "needs_info"]),
        applicantMessage: z.string().trim().max(1000),
      })
      .strict()
      .parse(await readJsonBody(request));
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE exhibitor_applications SET status=?,applicant_message=?,revision=revision+1 WHERE organization_id=? AND id=? AND revision=? AND EXISTS(SELECT 1 FROM form_submissions WHERE organization_id=? AND id=? AND state='active' AND retention_until>?)",
      ).bind(
        input.status,
        input.applicantMessage,
        orgId,
        id,
        input.expectedRevision,
        orgId,
        row.submission_id,
        new Date().toISOString(),
      ),
      env.DB.prepare(
        "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,?,'application.reviewed','application',?,? WHERE changes()=1",
      ).bind(
        crypto.randomUUID(),
        orgId,
        context.actor.identity.user.id,
        id,
        JSON.stringify({ status: input.status }),
      ),
    ]);
    return results[0].meta.changes === 1
      ? json({ revision: input.expectedRevision + 1 })
      : json(
          { error: "A candidatura mudou ou o prazo de retenção terminou." },
          409,
        );
  }
  if (action === "stage-profile") {
    await requireTenant(
      request,
      env,
      orgId,
      "exhibitor.write",
      context.event_id,
    );
    const input = z
      .object({ expectedDraftRevision: z.number().int().nonnegative() })
      .strict()
      .parse(await readJsonBody(request));
    if (
      row.status !== "approved" ||
      row.listing_opt_in !== 1 ||
      row.state !== "active" ||
      Date.parse(row.retention_until) <= Date.now() ||
      !effectiveProfile
    )
      throw new Response("A listagem exige aprovação e consentimento ativo", {
        status: 400,
      });
    const profile = applicantProfileSchema.parse(
      await decryptSubmission(
        submissionSecrets(env),
        orgId,
        scope,
        effectiveProfile!,
      ),
    );
    const mapped = await env.DB.prepare(
      "SELECT exhibitor_id FROM public_profile_sources WHERE organization_id=? AND edition_id=? AND application_id=?",
    )
      .bind(orgId, context.edition_id, id)
      .first<{ exhibitor_id: string }>();
    const exhibitorId = mapped?.exhibitor_id ?? crypto.randomUUID();
    const { content } = await latestContent(env, orgId, context.edition_id);
    const eligible = await filterConsentedProfiles(
      env.DB,
      orgId,
      context.edition_id,
      content.operations.exhibitors,
    );
    content.operations.exhibitors = [
      ...eligible.exhibitors.filter((e) => e.id !== exhibitorId),
      { id: exhibitorId, ...profile, status: "public", publicOptIn: true },
    ];
    return save(
      draftRequest(request, input.expectedDraftRevision, content),
      env,
      orgId,
      context.edition_id,
      (draftId) => [
        env.DB.prepare(
          "INSERT INTO public_profile_sources(organization_id,edition_id,exhibitor_id,application_id) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM content_drafts WHERE organization_id=? AND edition_id=? AND id=?) ON CONFLICT(organization_id,edition_id,exhibitor_id) DO NOTHING",
        ).bind(
          orgId,
          context.edition_id,
          exhibitorId,
          id,
          orgId,
          context.edition_id,
          draftId,
        ),
        env.DB.prepare(
          "INSERT INTO application_events(id,organization_id,application_id,actor_id,action) SELECT ?,?,?,?,'profile.staged' WHERE EXISTS(SELECT 1 FROM content_drafts WHERE organization_id=? AND edition_id=? AND id=?)",
        ).bind(
          crypto.randomUUID(),
          orgId,
          id,
          context.actor.identity.user.id,
          orgId,
          context.edition_id,
          draftId,
        ),
      ],
    );
  }
  return json({ error: "Rota não encontrada" }, 404);
}
