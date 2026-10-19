import { z } from "zod";
import {
  contentDocumentSchema,
  starterContent,
  type ContentDocument,
  type ContentSection,
} from "../domain/content";
import {
  normalizeHostname,
  resolvePublicDomain,
  type DomainBinding,
} from "../domain/host";
import { publicBranding } from "../domain/branding";
import { requireTenant, auditStatement } from "./tenant.server";
import type { AuthEnvironment } from "../infrastructure/auth.server";
import { privateHeaders } from "../infrastructure/security.server";
import { readJsonBody } from "../infrastructure/request.server";
import { validateOperations, operationStatements } from "./operations.server";
import { publicOperations, emptyOperations } from "../domain/operations";

const revisionInput = z.number().int().nonnegative();
const publishInput = z
  .object({
    draftRevision: z.number().int().positive(),
    expectedPublicationRevision: revisionInput,
  })
  .strict();
const rollbackInput = z
  .object({
    targetPublicationId: z.string().min(1).max(100),
    expectedPublicationRevision: z.number().int().positive(),
  })
  .strict();

type Edition = { id: string; event_id: string; status: string };
type Draft = { id: string; revision: number; content_json: string };

function privateJson(data: unknown, status = 200, extra: HeadersInit = {}) {
  return Response.json(data, {
    status,
    headers: { ...privateHeaders(), ...extra },
  });
}

async function editionContext(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
  permission:
    | "content.read"
    | "content.write"
    | "content.preview"
    | "content.publish"
    | "content.rollback",
) {
  await requireTenant(request, env, orgId, "org.read");
  const edition = await env.DB.prepare(
    "SELECT id,event_id,status FROM editions WHERE organization_id=? AND id=?",
  )
    .bind(orgId, editionId)
    .first<Edition>();
  if (!edition) throw new Response("Edição não encontrada", { status: 404 });
  const actor = await requireTenant(
    request,
    env,
    orgId,
    permission,
    edition.event_id,
  );
  return { edition, actor };
}

function sectionAssetIds(content: ContentDocument): string[] {
  const ids: string[] = [];
  for (const page of content.pages) {
    for (const section of page.sections) {
      if (section.type === "hero" && section.imageAssetId)
        ids.push(section.imageAssetId);
      if (section.type === "gallery") ids.push(...section.assetIds);
    }
  }
  for (const profile of [
    ...content.operations.guests,
    ...content.operations.exhibitors,
    ...content.operations.sponsors,
  ])
    if (profile.imageAssetId) ids.push(profile.imageAssetId);
  return [...new Set(ids)];
}

async function assertPublishableAssets(
  db: D1Database,
  orgId: string,
  edition: Edition,
  content: ContentDocument,
) {
  const ids = sectionAssetIds(content);
  if (!ids.length) return;
  const placeholders = ids.map(() => "?").join(",");
  const rows = await db
    .prepare(
      `SELECT id FROM media_assets WHERE organization_id=? AND id IN (${placeholders}) AND status='ready' AND visibility='public' AND license_status IN ('licensed','owned') AND (owner_type='organization' OR event_id=? OR edition_id=?)`,
    )
    .bind(orgId, ...ids, edition.event_id, edition.id)
    .all<{ id: string }>();
  if (rows.results.length !== ids.length)
    throw new Response(
      "Toda imagem pública precisa pertencer à edição e ter licença aprovada",
      { status: 400 },
    );
}

function snapshotInsert(
  db: D1Database,
  input: {
    id: string;
    orgId: string;
    editionId: string;
    draftId: string;
    actorId: string;
    snapshot: ContentDocument;
    expectedRevision: number;
    rollbackOf?: string | null;
  },
) {
  return db
    .prepare(
      `INSERT INTO publications(id,organization_id,edition_id,source_draft_id,revision,snapshot_json,created_by,rollback_of_id)
     SELECT ?,?,?,?,COALESCE((SELECT revision FROM edition_publication_pointers WHERE organization_id=? AND edition_id=?),0)+1,?,?,?
     WHERE COALESCE((SELECT revision FROM edition_publication_pointers WHERE organization_id=? AND edition_id=?),0)=?
       AND EXISTS(SELECT 1 FROM editions WHERE organization_id=? AND id=? AND status!='archived')`,
    )
    .bind(
      input.id,
      input.orgId,
      input.editionId,
      input.draftId,
      input.orgId,
      input.editionId,
      JSON.stringify(input.snapshot),
      input.actorId,
      input.rollbackOf ?? null,
      input.orgId,
      input.editionId,
      input.expectedRevision,
      input.orgId,
      input.editionId,
    );
}

function pointerCas(
  db: D1Database,
  orgId: string,
  editionId: string,
  publicationId: string,
  revision: number,
  expectedRevision: number,
) {
  return db
    .prepare(
      `INSERT INTO edition_publication_pointers(organization_id,edition_id,publication_id,revision,updated_at)
     SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM publications WHERE organization_id=? AND edition_id=? AND id=? AND revision=?)
     ON CONFLICT(organization_id,edition_id) DO UPDATE SET publication_id=excluded.publication_id,revision=excluded.revision,updated_at=excluded.updated_at
     WHERE edition_publication_pointers.revision=? AND excluded.revision=edition_publication_pointers.revision+1`,
    )
    .bind(
      orgId,
      editionId,
      publicationId,
      revision,
      new Date().toISOString(),
      orgId,
      editionId,
      publicationId,
      revision,
      expectedRevision,
    );
}

export async function saveDraft(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
) {
  const { edition, actor } = await editionContext(
    request,
    env,
    orgId,
    editionId,
    "content.write",
  );
  if (edition.status === "archived")
    throw new Response("Edição arquivada não pode receber alterações", {
      status: 409,
    });
  const body = z
    .object({ expectedRevision: revisionInput, content: contentDocumentSchema })
    .strict()
    .parse(await readJsonBody(request));
  const latest = await env.DB.prepare(
    "SELECT revision,content_json FROM content_drafts WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 1",
  )
    .bind(orgId, editionId)
    .first<{ revision: number; content_json: string }>();
  if ((latest?.revision ?? 0) !== body.expectedRevision)
    return privateJson(
      {
        error: "O rascunho mudou. Atualize a página.",
        latestRevision: latest?.revision ?? 0,
      },
      409,
    );
  const revision = body.expectedRevision + 1;
  const previous = latest
    ? contentDocumentSchema.parse(JSON.parse(latest.content_json)).operations
    : emptyOperations;
  await validateOperations(
    request,
    env,
    orgId,
    edition,
    body.content.operations,
    previous,
  );
  const draftId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO content_drafts(id,organization_id,edition_id,revision,content_json,created_by)
     SELECT ?,?,?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM content_drafts WHERE organization_id=? AND edition_id=?),0)=?
       AND EXISTS(SELECT 1 FROM editions WHERE organization_id=? AND id=? AND status!='archived')`,
    ).bind(
      draftId,
      orgId,
      editionId,
      revision,
      JSON.stringify(body.content),
      actor.identity.user.id,
      orgId,
      editionId,
      body.expectedRevision,
      orgId,
      editionId,
    ),
  ];
  for (const [pageIndex, page] of body.content.pages.entries()) {
    const pageId = crypto.randomUUID();
    statements.push(
      env.DB.prepare(
        `INSERT INTO pages(id,organization_id,draft_id,slug,title,description,sort_order)
       SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM content_drafts WHERE organization_id=? AND id=?)`,
      ).bind(
        pageId,
        orgId,
        draftId,
        page.slug,
        page.title,
        page.description,
        pageIndex,
        orgId,
        draftId,
      ),
    );
    for (const [sectionIndex, section] of page.sections.entries()) {
      const sectionId = crypto.randomUUID();
      const { type, ...sectionContent } = section;
      statements.push(
        env.DB.prepare(
          `INSERT INTO sections(id,organization_id,page_id,type,sort_order,content_json)
         SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pages WHERE organization_id=? AND id=?)`,
        ).bind(
          sectionId,
          orgId,
          pageId,
          type,
          sectionIndex,
          JSON.stringify(sectionContent),
          orgId,
          pageId,
        ),
      );
      if (section.type === "faq") {
        section.items.forEach((item, index) =>
          statements.push(
            env.DB.prepare(
              `INSERT INTO content_faq_items(id,organization_id,page_id,question,answer,sort_order)
           SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pages WHERE organization_id=? AND id=?)`,
            ).bind(
              crypto.randomUUID(),
              orgId,
              pageId,
              item.question,
              item.answer,
              index,
              orgId,
              pageId,
            ),
          ),
        );
      }
    }
  }
  statements.push(
    ...operationStatements(
      env.DB,
      orgId,
      editionId,
      draftId,
      body.content.operations,
    ),
  );
  statements.push(
    env.DB.prepare(
      `INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json)
       SELECT ?,?,?, 'content.draft.saved','edition',?,? WHERE EXISTS(SELECT 1 FROM content_drafts WHERE organization_id=? AND edition_id=? AND id=?)`,
    ).bind(
      crypto.randomUUID(),
      orgId,
      actor.identity.user.id,
      editionId,
      JSON.stringify({ revision }),
      orgId,
      editionId,
      draftId,
    ),
  );
  try {
    const results = await env.DB.batch(statements);
    if (results[0].meta.changes !== 1)
      return privateJson(
        { error: "O rascunho mudou. Atualize a página." },
        409,
      );
  } catch (error) {
    if (/UNIQUE constraint/i.test(error instanceof Error ? error.message : ""))
      return privateJson(
        { error: "O rascunho mudou. Atualize a página." },
        409,
      );
    throw error;
  }
  return privateJson({ draftId, revision }, 201);
}

async function revisions(
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
) {
  const [drafts, publicationsList, pointer] = await Promise.all([
    env.DB.prepare(
      "SELECT id,revision,created_by,created_at FROM content_drafts WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 100",
    )
      .bind(orgId, editionId)
      .all(),
    env.DB.prepare(
      "SELECT id,revision,source_draft_id,rollback_of_id,created_by,created_at FROM publications WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 100",
    )
      .bind(orgId, editionId)
      .all(),
    env.DB.prepare(
      "SELECT publication_id,revision FROM edition_publication_pointers WHERE organization_id=? AND edition_id=?",
    )
      .bind(orgId, editionId)
      .first(),
  ]);
  return {
    drafts: drafts.results,
    publications: publicationsList.results,
    current: pointer ?? null,
  };
}

async function signPreviewToken(
  env: AuthEnvironment,
  claims: {
    orgId: string;
    editionId: string;
    draftId: string;
    expiresAt: number;
  },
) {
  if (!env.BETTER_AUTH_SECRET)
    throw new Response("Preview indisponível", { status: 503 });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.BETTER_AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = btoa(JSON.stringify(claims))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  );
  const hex = [...signature]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${hex}`;
}

export async function readPreviewToken(env: AuthEnvironment, token: string) {
  if (!env.BETTER_AUTH_SECRET || token.length > 2048)
    throw new Response("Preview indisponível", { status: 404 });
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra)
    throw new Response("Preview indisponível", { status: 404 });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.BETTER_AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = new Uint8Array(
    signature.match(/.{2}/gu)?.map((value) => Number.parseInt(value, 16)) ?? [],
  );
  const valid =
    bytes.length === 32 &&
    (await crypto.subtle.verify("HMAC", key, bytes, encoder.encode(payload)));
  if (!valid) throw new Response("Preview indisponível", { status: 404 });
  let claims: {
    orgId: string;
    editionId: string;
    draftId: string;
    expiresAt: number;
  };
  try {
    claims = JSON.parse(
      atob(payload.replaceAll("-", "+").replaceAll("_", "/")),
    ) as typeof claims;
  } catch {
    throw new Response("Preview indisponível", { status: 404 });
  }
  if (
    claims.expiresAt < Date.now() ||
    !claims.orgId ||
    !claims.editionId ||
    !claims.draftId
  )
    throw new Response("Preview expirou. Gere outro link no painel.", {
      status: 410,
    });
  const result = await env.DB.prepare(
    "SELECT d.content_json,d.revision,e.name AS edition_name,e.time_zone,e.event_id,e.status AS edition_status,o.name AS organization_name,o.status AS organization_status FROM content_drafts d JOIN editions e ON e.organization_id=d.organization_id AND e.id=d.edition_id JOIN organizations o ON o.id=d.organization_id WHERE d.organization_id=? AND d.edition_id=? AND d.id=?",
  )
    .bind(claims.orgId, claims.editionId, claims.draftId)
    .first<{
      content_json: string;
      revision: number;
      edition_name: string;
      time_zone: string;
      event_id: string;
      edition_status: string;
      organization_name: string;
      organization_status: string;
    }>();
  if (
    !result ||
    result.edition_status === "archived" ||
    result.organization_status !== "active"
  )
    throw new Response("Preview indisponível", { status: 404 });
  return {
    content: contentDocumentSchema.parse(JSON.parse(result.content_json)),
    revision: result.revision,
    editionName: result.edition_name,
    timeZone: result.time_zone,
    organizationName: result.organization_name,
    organizationId: claims.orgId,
    editionId: claims.editionId,
    eventId: result.event_id,
  };
}

export async function servePreviewAsset(
  request: Request,
  env: AuthEnvironment,
  token: string,
  assetId: string,
) {
  const preview = await readPreviewToken(env, token);
  const asset = await env.DB.prepare(
    `SELECT r2_key,mime,visibility FROM media_assets
     WHERE organization_id=? AND id=? AND status='ready'
       AND (visibility='private' OR license_status IN ('licensed','owned'))
       AND (owner_type='organization' OR event_id=? OR edition_id=?)`,
  )
    .bind(preview.organizationId, assetId, preview.eventId, preview.editionId)
    .first<{ r2_key: string; mime: string; visibility: string }>();
  if (!asset) throw new Response("Arquivo não encontrado", { status: 404 });
  if (!env.ASSETS_PRIVATE)
    throw new Response("Mídia indisponível", { status: 503 });
  const object = await env.ASSETS_PRIVATE.get(asset.r2_key);
  if (
    !object ||
    object.customMetadata?.organizationId !== preview.organizationId ||
    object.customMetadata?.visibility !== asset.visibility
  )
    throw new Response("Arquivo não encontrado", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}

async function preview(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
) {
  const { actor } = await editionContext(
    request,
    env,
    orgId,
    editionId,
    "content.preview",
  );
  const body = z
    .object({ draftRevision: z.number().int().positive() })
    .strict()
    .parse(await readJsonBody(request));
  const draft = await env.DB.prepare(
    "SELECT id FROM content_drafts WHERE organization_id=? AND edition_id=? AND revision=?",
  )
    .bind(orgId, editionId, body.draftRevision)
    .first<{ id: string }>();
  if (!draft) throw new Response("Rascunho não encontrado", { status: 404 });
  const token = await signPreviewToken(env, {
    orgId,
    editionId,
    draftId: draft.id,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  await env.DB.batch([
    auditStatement(
      env.DB,
      orgId,
      actor.identity.user.id,
      "content.preview.created",
      "edition",
      editionId,
      { revision: body.draftRevision },
    ),
  ]);
  return privateJson({ url: `/preview/${token}`, expiresInSeconds: 600 });
}

async function publish(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
) {
  const { edition, actor } = await editionContext(
    request,
    env,
    orgId,
    editionId,
    "content.publish",
  );
  const input = publishInput.parse(await readJsonBody(request));
  const draft = await env.DB.prepare(
    "SELECT id,revision,content_json FROM content_drafts WHERE organization_id=? AND edition_id=? AND revision=?",
  )
    .bind(orgId, editionId, input.draftRevision)
    .first<Draft>();
  if (!draft) throw new Response("Rascunho não encontrado", { status: 404 });
  const snapshot = contentDocumentSchema.parse(JSON.parse(draft.content_json));
  await validateOperations(
    request,
    env,
    orgId,
    edition,
    snapshot.operations,
    snapshot.operations,
  );
  try {
    snapshot.operations = publicOperations(snapshot.operations);
  } catch {
    throw new Response(
      "Publique os perfis dos convidados antes de publicar suas atividades",
      { status: 400 },
    );
  }
  await assertPublishableAssets(env.DB, orgId, edition, snapshot);
  const publicationId = crypto.randomUUID();
  try {
    const statements: D1PreparedStatement[] = [
      snapshotInsert(env.DB, {
        id: publicationId,
        orgId,
        editionId,
        draftId: draft.id,
        actorId: actor.identity.user.id,
        snapshot,
        expectedRevision: input.expectedPublicationRevision,
      }),
      pointerCas(
        env.DB,
        orgId,
        editionId,
        publicationId,
        input.expectedPublicationRevision + 1,
        input.expectedPublicationRevision,
      ),
      env.DB.prepare(
        "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,?, 'content.published','publication',?,? WHERE EXISTS(SELECT 1 FROM edition_publication_pointers WHERE organization_id=? AND edition_id=? AND publication_id=? AND revision=?)",
      ).bind(
        crypto.randomUUID(),
        orgId,
        actor.identity.user.id,
        publicationId,
        JSON.stringify({
          editionId,
          draftRevision: draft.revision,
          publicationRevision: input.expectedPublicationRevision + 1,
        }),
        orgId,
        editionId,
        publicationId,
        input.expectedPublicationRevision + 1,
      ),
    ];
    for (const redirect of snapshot.redirects)
      statements.push(
        env.DB.prepare(
          `INSERT INTO content_redirects(id,organization_id,edition_id,from_slug,to_slug,status_code)
       SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM edition_publication_pointers WHERE organization_id=? AND edition_id=? AND publication_id=?)
       ON CONFLICT(organization_id,edition_id,from_slug) DO UPDATE SET to_slug=excluded.to_slug,status_code=excluded.status_code`,
        ).bind(
          crypto.randomUUID(),
          orgId,
          editionId,
          redirect.fromSlug,
          redirect.toSlug,
          redirect.statusCode,
          orgId,
          editionId,
          publicationId,
        ),
      );
    const results = await env.DB.batch(statements);
    if (results[1].meta.changes !== 1)
      return privateJson(
        { error: "A publicação mudou. Atualize e tente novamente." },
        409,
      );
  } catch (error) {
    if (/UNIQUE constraint/i.test(error instanceof Error ? error.message : ""))
      return privateJson(
        { error: "A publicação mudou. Atualize e tente novamente." },
        409,
      );
    throw error;
  }
  // This Worker has no cache purge binding yet; public HTML uses a short TTL.
  console.warn(
    JSON.stringify({
      kind: "publication_cache_invalidation_unavailable",
      organizationId: orgId,
      editionId,
      revision: input.expectedPublicationRevision + 1,
    }),
  );
  return privateJson(
    {
      publicationId,
      revision: input.expectedPublicationRevision + 1,
      cache: "short_ttl_fallback",
    },
    201,
    {
      Warning:
        '199 eventos77 "Public cache purge unavailable; short TTL active"',
    },
  );
}

async function rollback(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
) {
  const { actor } = await editionContext(
    request,
    env,
    orgId,
    editionId,
    "content.rollback",
  );
  const input = rollbackInput.parse(await readJsonBody(request));
  const target = await env.DB.prepare(
    "SELECT source_draft_id,snapshot_json FROM publications WHERE organization_id=? AND edition_id=? AND id=?",
  )
    .bind(orgId, editionId, input.targetPublicationId)
    .first<{ source_draft_id: string; snapshot_json: string }>();
  if (!target)
    throw new Response("Versão publicada não encontrada", { status: 404 });
  const current = await env.DB.prepare(
    "SELECT publication_id,revision FROM edition_publication_pointers WHERE organization_id=? AND edition_id=?",
  )
    .bind(orgId, editionId)
    .first<{ publication_id: string; revision: number }>();
  if (!current || current.revision !== input.expectedPublicationRevision)
    return privateJson(
      { error: "A publicação mudou. Atualize e tente novamente." },
      409,
    );
  const snapshot = contentDocumentSchema.parse(
    JSON.parse(target.snapshot_json),
  );
  const publicationId = crypto.randomUUID();
  const results = await env.DB.batch([
    snapshotInsert(env.DB, {
      id: publicationId,
      orgId,
      editionId,
      draftId: target.source_draft_id,
      actorId: actor.identity.user.id,
      snapshot,
      expectedRevision: input.expectedPublicationRevision,
      rollbackOf: input.targetPublicationId,
    }),
    pointerCas(
      env.DB,
      orgId,
      editionId,
      publicationId,
      input.expectedPublicationRevision + 1,
      input.expectedPublicationRevision,
    ),
    env.DB.prepare(
      "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,?, 'content.rolled_back','publication',?,? WHERE EXISTS(SELECT 1 FROM edition_publication_pointers WHERE organization_id=? AND edition_id=? AND publication_id=? AND revision=?)",
    ).bind(
      crypto.randomUUID(),
      orgId,
      actor.identity.user.id,
      publicationId,
      JSON.stringify({
        editionId,
        targetPublicationId: input.targetPublicationId,
        revision: input.expectedPublicationRevision + 1,
      }),
      orgId,
      editionId,
      publicationId,
      input.expectedPublicationRevision + 1,
    ),
  ]);
  if (results[1].meta.changes !== 1)
    return privateJson(
      { error: "A publicação mudou. Atualize e tente novamente." },
      409,
    );
  console.warn(
    JSON.stringify({
      kind: "publication_cache_invalidation_unavailable",
      organizationId: orgId,
      editionId,
      revision: input.expectedPublicationRevision + 1,
    }),
  );
  return privateJson(
    {
      publicationId,
      revision: input.expectedPublicationRevision + 1,
      rollbackOf: input.targetPublicationId,
      cache: "short_ttl_fallback",
    },
    201,
    {
      Warning:
        '199 eventos77 "Public cache purge unavailable; short TTL active"',
    },
  );
}

export async function handleContentApi(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
  action: string,
) {
  if (action === "draft") {
    if (request.method === "GET") {
      await editionContext(request, env, orgId, editionId, "content.read");
      const latest = await env.DB.prepare(
        "SELECT id,revision,content_json FROM content_drafts WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 1",
      )
        .bind(orgId, editionId)
        .first<Draft>();
      return privateJson({
        revision: latest?.revision ?? 0,
        draftId: latest?.id ?? null,
        content: latest
          ? contentDocumentSchema.parse(JSON.parse(latest.content_json))
          : starterContent,
      });
    }
    if (request.method === "POST" || request.method === "PUT")
      return saveDraft(request, env, orgId, editionId);
  }
  if (action === "preview" && request.method === "POST")
    return preview(request, env, orgId, editionId);
  if (action === "revisions" && request.method === "GET") {
    await editionContext(request, env, orgId, editionId, "content.read");
    return privateJson(await revisions(env, orgId, editionId));
  }
  if (action === "publish" && request.method === "POST")
    return publish(request, env, orgId, editionId);
  if (action === "rollback" && request.method === "POST")
    return rollback(request, env, orgId, editionId);
  return privateJson({ error: "Rota não encontrada" }, 404);
}

export type PublicSite = {
  hostname: string;
  organizationId: string;
  editionId: string;
  eventId: string;
  organizationName: string;
  eventName: string;
  editionName: string;
  city: string;
  timezone: string;
  startAt: string | null;
  endAt: string | null;
  ticketUrl: string | null;
  content: ContentDocument;
  publicationId: string;
  publicationRevision: number;
  primaryColor: string;
  buttonTextColor: string;
  fontStack: string;
};

export async function resolvePublicSite(
  request: Request,
  env: AuthEnvironment,
): Promise<PublicSite> {
  let hostname: string;
  try {
    hostname = normalizeHostname(new URL(request.url).hostname);
  } catch {
    throw new Response("Host inválido", { status: 421 });
  }
  const binding = await env.DB.prepare(
    "SELECT id,hostname,organization_id,destination,destination_id,status,ownership_verified,hostname_status,ssl_status,dns_verified,version FROM domain_bindings WHERE hostname=?",
  )
    .bind(hostname)
    .first<{
      id: string;
      hostname: string;
      organization_id: string;
      destination: "FIXED_EDITION";
      destination_id: string;
      status: DomainBinding["status"];
      ownership_verified: number;
      hostname_status: string | null;
      ssl_status: string | null;
      dns_verified: number;
      version: number;
    }>();
  if (!binding) throw new Response("Site não encontrado", { status: 404 });
  const organization = await env.DB.prepare(
    "SELECT id,status FROM organizations WHERE id=?",
  )
    .bind(binding.organization_id)
    .first<{ id: string; status: string }>();
  const edition = await env.DB.prepare(
    "SELECT id,organization_id,event_id,name,city,time_zone,start_at,end_at,external_ticket_url,status FROM editions WHERE organization_id=? AND id=?",
  )
    .bind(binding.organization_id, binding.destination_id)
    .first<{
      id: string;
      organization_id: string;
      event_id: string;
      name: string;
      city: string;
      time_zone: string;
      start_at: string | null;
      end_at: string | null;
      external_ticket_url: string | null;
      status: string;
    }>();
  const event = edition
    ? await env.DB.prepare(
        "SELECT id,organization_id,name,status FROM events WHERE organization_id=? AND id=?",
      )
        .bind(binding.organization_id, edition.event_id)
        .first<{
          id: string;
          organization_id: string;
          name: string;
          status: string;
        }>()
    : null;
  if (!organization || !edition || !event)
    throw new Response("Site não encontrado", { status: 404 });
  if (
    organization.status !== "active" ||
    edition.status !== "active" ||
    event.status !== "active"
  )
    throw new Response("Site temporariamente indisponível", { status: 503 });
  try {
    resolvePublicDomain({
      hostname,
      bindings: [
        {
          id: binding.id,
          hostname: binding.hostname,
          organizationId: binding.organization_id,
          destination: binding.destination,
          destinationId: binding.destination_id,
          status: binding.status,
          ownershipVerified: Boolean(binding.ownership_verified),
          hostnameStatus: binding.hostname_status,
          sslStatus: binding.ssl_status,
          dnsVerified: Boolean(binding.dns_verified),
          version: binding.version,
        },
      ],
      organizations: [organization],
      resources: {
        events: [{ id: event.id, organizationId: event.organization_id }],
        editions: [
          {
            id: edition.id,
            organizationId: edition.organization_id,
            eventId: edition.event_id,
          },
        ],
      },
    });
  } catch (error) {
    const status =
      error instanceof Error &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 503;
    throw new Response("Site temporariamente indisponível", { status });
  }
  const publication = await env.DB.prepare(
    "SELECT p.id,p.revision,p.snapshot_json FROM edition_publication_pointers ptr JOIN publications p ON p.organization_id=ptr.organization_id AND p.edition_id=ptr.edition_id AND p.id=ptr.publication_id WHERE ptr.organization_id=? AND ptr.edition_id=?",
  )
    .bind(binding.organization_id, edition.id)
    .first<{ id: string; revision: number; snapshot_json: string }>();
  if (!publication)
    throw new Response("Conteúdo ainda não publicado", { status: 404 });
  let content: ContentDocument;
  try {
    content = contentDocumentSchema.parse(
      JSON.parse(publication.snapshot_json),
    );
  } catch {
    throw new Response("Conteúdo indisponível", { status: 503 });
  }
  const org = await env.DB.prepare(
    "SELECT name,tokens_json FROM organizations WHERE id=?",
  )
    .bind(binding.organization_id)
    .first<{ name: string; tokens_json: string }>();
  let tokens: unknown = {};
  try {
    tokens = JSON.parse(org?.tokens_json ?? "{}");
  } catch {
    /* Organization tokens fail closed to the accessible default. */
  }
  const branding = publicBranding(tokens);
  return {
    hostname,
    organizationId: binding.organization_id,
    editionId: edition.id,
    eventId: event.id,
    organizationName: org?.name ?? "",
    eventName: event.name,
    editionName: edition.name,
    city: edition.city,
    timezone: edition.time_zone,
    startAt: edition.start_at,
    endAt: edition.end_at,
    ticketUrl: edition.external_ticket_url,
    content,
    publicationId: publication.id,
    publicationRevision: publication.revision,
    primaryColor: branding.primaryColor,
    buttonTextColor: branding.buttonTextColor,
    fontStack: branding.fontStack,
  };
}

export async function findPublicRedirect(
  env: AuthEnvironment,
  site: PublicSite,
  slug: string,
) {
  return env.DB.prepare(
    "SELECT to_slug,status_code FROM content_redirects WHERE organization_id=? AND edition_id=? AND from_slug=?",
  )
    .bind(site.organizationId, site.editionId, slug)
    .first<{ to_slug: string; status_code: number }>();
}

export function publicPage(site: PublicSite, slug: string) {
  return site.content.pages.find((page) => page.slug === slug) ?? null;
}

export function renderSection(section: ContentSection, assetBase = "/assets") {
  switch (section.type) {
    case "hero":
      return {
        type: section.type,
        title: section.title,
        subtitle: section.subtitle,
        imageUrl: section.imageAssetId
          ? `${assetBase}/${encodeURIComponent(section.imageAssetId)}`
          : null,
      };
    case "gallery":
      return {
        ...section,
        images: section.assetIds.map(
          (id) => `${assetBase}/${encodeURIComponent(id)}`,
        ),
      };
    case "cta":
      return section;
    case "faq":
      return section;
    case "cards":
      return section;
    case "agenda":
      return { ...section, url: "/agenda" };
    case "sponsors":
      return section;
    case "text":
      return section;
    default:
      return section;
  }
}

export async function servePublicAsset(
  request: Request,
  env: AuthEnvironment,
  assetId: string,
) {
  const site = await resolvePublicSite(request, env);
  if (env.APP_ENV !== "local" && new URL(request.url).protocol !== "https:")
    return Response.redirect(
      `https://${site.hostname}${new URL(request.url).pathname}${new URL(request.url).search}`,
      308,
    );
  const asset = await env.DB.prepare(
    "SELECT r2_key,mime FROM media_assets WHERE organization_id=? AND id=? AND status='ready' AND visibility='public' AND license_status IN ('licensed','owned') AND (owner_type='organization' OR event_id=? OR edition_id=?)",
  )
    .bind(site.organizationId, assetId, site.eventId, site.editionId)
    .first<{ r2_key: string; mime: string }>();
  if (!asset) throw new Response("Arquivo não encontrado", { status: 404 });
  if (!env.ASSETS_PRIVATE)
    throw new Response("Mídia indisponível", { status: 503 });
  const object = await env.ASSETS_PRIVATE.get(asset.r2_key);
  if (
    !object ||
    object.customMetadata?.organizationId !== site.organizationId ||
    object.customMetadata?.visibility !== "public"
  )
    throw new Response("Arquivo não encontrado", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control":
        "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      Vary: "Host",
    },
  });
}

export async function servePublicMetadata(
  request: Request,
  env: AuthEnvironment,
  kind: "robots" | "sitemap",
) {
  const site = await resolvePublicSite(request, env);
  const requestUrl = new URL(request.url);
  if (env.APP_ENV !== "local" && requestUrl.protocol !== "https:")
    return Response.redirect(
      `https://${site.hostname}${requestUrl.pathname}${requestUrl.search}`,
      308,
    );
  const origin =
    env.APP_ENV === "local" ? requestUrl.origin : `https://${site.hostname}`;
  const headers = {
    "Content-Type":
      kind === "robots"
        ? "text/plain; charset=utf-8"
        : "application/xml; charset=utf-8",
    "Cache-Control": `public, max-age=60, s-maxage=60`,
    "X-Robots-Tag": kind === "robots" ? "noindex, follow" : "index, follow",
    "X-Publication-Revision": String(site.publicationRevision),
    Vary: "Host",
  };
  if (kind === "robots")
    return new Response(
      `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
      { headers },
    );
  const paths = new Set(["/", "/edicoes"]);
  const ops = site.content.operations;
  for (const [path, items] of [
    ["programacao", ops.program],
    ["convidados", ops.guests],
    ["expositores", ops.exhibitors],
    ["patrocinadores", ops.sponsors],
  ] as const)
    if (items.length) paths.add(`/${path}`);
  for (const page of site.content.pages) {
    if (page.slug !== "home") paths.add(`/${encodeURIComponent(page.slug)}`);
  }
  if (
    site.content.pages.some((page) =>
      page.sections.some((section) => section.type === "faq"),
    )
  )
    paths.add("/faq");
  const xml = [...paths]
    .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xml}\n</urlset>`,
    { headers },
  );
}
