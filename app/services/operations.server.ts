import { z } from "zod";
import {
  operationSchemas,
  type Operations,
  type OperationKind,
} from "../domain/operations";
import {
  contentDocumentSchema,
  starterContent,
  type ContentDocument,
} from "../domain/content";
import { requireTenant } from "./tenant.server";
import type { AuthEnvironment } from "../infrastructure/auth.server";
import type { Permission } from "../domain/permissions";
import { privateHeaders } from "../infrastructure/security.server";
import { readJsonBody } from "../infrastructure/request.server";

export const operationPermissions: Record<OperationKind, Permission> = {
  stages: "program.write",
  program: "program.write",
  guests: "guest.write",
  exhibitors: "exhibitor.write",
  sponsors: "sponsor.write",
};

export async function validateOperations(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  edition: { id: string; event_id: string },
  next: Operations,
  previous: Operations,
) {
  const bounds = await env.DB.prepare(
    "SELECT start_at,end_at FROM editions WHERE organization_id=? AND id=?",
  )
    .bind(orgId, edition.id)
    .first<{ start_at: string | null; end_at: string | null }>();
  for (const kind of Object.keys(operationPermissions) as OperationKind[]) {
    if (JSON.stringify(next[kind]) !== JSON.stringify(previous[kind]))
      await requireTenant(
        request,
        env,
        orgId,
        operationPermissions[kind],
        edition.event_id,
      );
  }
  if (
    next.program.some(
      (p) =>
        (bounds?.start_at &&
          Date.parse(p.startAt) < Date.parse(bounds.start_at)) ||
        (bounds?.end_at && Date.parse(p.endAt) > Date.parse(bounds.end_at)),
    )
  )
    throw new Response("A atividade precisa ficar dentro das datas da edição", {
      status: 400,
    });
  for (const stage of next.stages) {
    if (
      stage.venueId &&
      !(await env.DB.prepare(
        "SELECT id FROM venues WHERE organization_id=? AND edition_id=? AND id=?",
      )
        .bind(orgId, edition.id, stage.venueId)
        .first())
    )
      throw new Response("O local não pertence à edição", { status: 400 });
  }
  for (const profile of [
    ...next.guests,
    ...next.exhibitors,
    ...next.sponsors,
  ]) {
    if (
      profile.imageAssetId &&
      !(await env.DB.prepare(
        "SELECT id FROM media_assets WHERE organization_id=? AND id=? AND status='ready' AND (owner_type='organization' OR event_id=? OR edition_id=?)",
      )
        .bind(orgId, profile.imageAssetId, edition.event_id, edition.id)
        .first())
    )
      throw new Response("Imagem não pertence à edição", { status: 400 });
  }
}

/** Every normalized row belongs to an immutable CMS revision; a failed CAS inserts none. */
export function operationStatements(
  db: D1Database,
  orgId: string,
  editionId: string,
  draftId: string,
  ops: Operations,
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];
  const tables = {
    stages: "stages",
    guests: "guests",
    exhibitors: "exhibitors",
    sponsors: "edition_sponsors",
    program: "program_items",
  } as const;
  for (const kind of [
    "stages",
    "guests",
    "exhibitors",
    "sponsors",
    "program",
  ] as const) {
    const extraColumns =
      kind === "stages"
        ? ",venue_id"
        : kind === "program"
          ? ",stage_id,start_at,end_at"
          : "";
    const extraValues =
      kind === "stages"
        ? ",json_extract(value,'$.venueId')"
        : kind === "program"
          ? ",json_extract(value,'$.stageId'),json_extract(value,'$.startAt'),json_extract(value,'$.endAt')"
          : "";
    // JSON1 keeps the number of D1 statements constant as an edition grows.
    statements.push(
      db
        .prepare(
          `INSERT INTO ${tables[kind]}(organization_id,edition_id,draft_id,id,data_json${extraColumns}) SELECT ?,?,?,json_extract(value,'$.id'),value${extraValues} FROM json_each(?) WHERE EXISTS(SELECT 1 FROM content_drafts WHERE organization_id=? AND edition_id=? AND id=?)`,
        )
        .bind(
          orgId,
          editionId,
          draftId,
          JSON.stringify(ops[kind]),
          orgId,
          editionId,
          draftId,
        ),
    );
  }
  statements.push(
    db
      .prepare(
        "INSERT INTO participations(organization_id,draft_id,program_id,guest_id) SELECT ?,?,json_extract(item.value,'$.id'),guest.value FROM json_each(?) item JOIN json_each(json_extract(item.value,'$.guestIds')) guest WHERE EXISTS(SELECT 1 FROM content_drafts WHERE organization_id=? AND edition_id=? AND id=?)",
      )
      .bind(
        orgId,
        draftId,
        JSON.stringify(ops.program),
        orgId,
        editionId,
        draftId,
      ),
  );
  return statements;
}

export async function handleOperationsApi(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  editionId: string,
  kind: OperationKind,
  itemId: string | undefined,
  save: (
    request: Request,
    env: AuthEnvironment,
    orgId: string,
    editionId: string,
  ) => Promise<Response>,
) {
  await requireTenant(request, env, orgId, "org.read");
  const edition = await env.DB.prepare(
    "SELECT id,event_id FROM editions WHERE organization_id=? AND id=?",
  )
    .bind(orgId, editionId)
    .first<{ id: string; event_id: string }>();
  if (!edition) throw new Response("Edição não encontrada", { status: 404 });
  await requireTenant(
    request,
    env,
    orgId,
    request.method === "GET" ? "content.read" : operationPermissions[kind],
    edition.event_id,
  );
  const row = await env.DB.prepare(
    "SELECT revision,content_json FROM content_drafts WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 1",
  )
    .bind(orgId, editionId)
    .first<{ revision: number; content_json: string }>();
  const revision = row?.revision ?? 0;
  const content: ContentDocument = contentDocumentSchema.parse(
    row ? JSON.parse(row.content_json) : structuredClone(starterContent),
  );
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: privateHeaders() });
  if (request.method === "GET")
    return json({ revision, items: content.operations[kind] });
  if (!["POST", "PATCH", "DELETE"].includes(request.method))
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, POST, PATCH, DELETE" },
    });
  const input = z
    .object({
      expectedRevision: z.number().int().nonnegative(),
      data: z.unknown().optional(),
    })
    .strict()
    .parse(await readJsonBody(request));
  if (input.expectedRevision !== revision)
    return json({ error: "O rascunho mudou. Atualize a página." }, 409);
  const items: unknown[] = content.operations[kind];
  const existing = itemId
    ? content.operations[kind].find((item) => item.id === itemId)
    : undefined;
  if (request.method !== "POST" && !existing)
    throw new Response("Registro não encontrado", { status: 404 });
  const id = request.method === "POST" ? crypto.randomUUID() : itemId!;
  const entry =
    request.method === "DELETE"
      ? null
      : operationSchemas[kind].parse({
          ...z.record(z.string(), z.unknown()).parse(input.data),
          id,
        });
  content.operations = {
    ...content.operations,
    [kind]:
      request.method === "POST"
        ? [...items, entry]
        : request.method === "DELETE"
          ? items.filter((item) => (item as { id: string }).id !== id)
          : items.map((item) =>
              (item as { id: string }).id === id ? entry : item,
            ),
  };
  const nextRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ expectedRevision: revision, content }),
  });
  const response = await save(nextRequest, env, orgId, editionId);
  if (response.status !== 201) return response;
  const saved = (await response.json()) as {
    revision: number;
    draftId: string;
  };
  return json({ ...saved, id }, request.method === "POST" ? 201 : 200);
}
