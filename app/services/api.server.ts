import { z } from "zod";
import {
  requireUser,
  type AuthEnvironment,
} from "../infrastructure/auth.server";
import {
  requireAdminHost,
  requireSameOrigin,
  privateHeaders,
} from "../infrastructure/security.server";
import {
  requireTenant,
  requirePlatform,
  auditStatement,
} from "./tenant.server";
import { membershipRoles } from "../db/tenant-schema";
import { handleInvitations } from "./invitations.server";
import {
  MediaStorageUnavailable,
  MediaValidationError,
  readBoundedBody,
  uploadImage,
} from "../infrastructure/media.server";
import { readJsonBody } from "../infrastructure/request.server";

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const timezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Fuso horário inválido");
const orgInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug,
    timezone: timezone.default("America/Sao_Paulo"),
  })
  .strict();
const eventInput = z
  .object({ name: z.string().trim().min(2).max(120), slug })
  .strict();
const revision = z.number().int().positive();
const editionInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    editionKey: slug,
    city: z.string().max(120).default(""),
    timeZone: timezone,
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    externalTicketUrl: z
      .url()
      .refine((v) => new URL(v).protocol === "https:")
      .optional(),
  })
  .strict()
  .refine((v) => v.endAt > v.startAt, "O término deve ser posterior ao início");
function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: privateHeaders() });
}
export async function handleApi(request: Request, env: AuthEnvironment) {
  requireAdminHost(request, env.ADMIN_ORIGIN);
  if (request.method !== "GET" && request.method !== "HEAD")
    requireSameOrigin(request, env.ADMIN_ORIGIN);
  const path = new URL(request.url).pathname;
  if (path === "/api/v1/me" || path === "/api/v1/me/memberships") {
    const identity = await requireUser(request, env);
    const memberships = await env.DB.prepare(
      "SELECT m.organization_id, m.role, o.name, o.slug, o.status FROM memberships m JOIN organizations o ON o.id = m.organization_id WHERE m.user_id = ? AND m.status = 'active'",
    )
      .bind(identity.user.id)
      .all();
    const isPlatformOwner = Boolean(
      await env.DB.prepare(
        "SELECT user_id FROM platform_owners WHERE user_id = ?",
      )
        .bind(identity.user.id)
        .first(),
    );
    return json({
      user: {
        id: identity.user.id,
        name: identity.user.name,
        email: identity.user.email,
      },
      memberships: memberships.results,
      isPlatformOwner,
    });
  }
  if (path.startsWith("/api/v1/platform/")) {
    const identity = await requirePlatform(request, env);
    if (path === "/api/v1/platform/organizations") {
      if (request.method === "GET")
        return json(
          (
            await env.DB.prepare(
              "SELECT id, name, slug, status, timezone, revision FROM organizations ORDER BY created_at DESC LIMIT 200",
            ).all()
          ).results,
        );
      if (request.method === "POST") {
        const input = orgInput.parse(await readJsonBody(request));
        const id = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO organizations (id,name,slug,timezone) VALUES (?,?,?,?)",
          ).bind(id, input.name, input.slug, input.timezone),
          auditStatement(
            env.DB,
            id,
            identity.user.id,
            "organization.created",
            "organization",
            id,
          ),
        ]);
        return json({ id }, 201);
      }
    }
    const statusRoute = path.match(
      /^\/api\/v1\/platform\/organizations\/([^/]+)\/status$/,
    );
    if (statusRoute && request.method === "PATCH") {
      const input = z
        .object({ status: z.enum(["active", "suspended"]), revision })
        .strict()
        .parse(await readJsonBody(request));
      const result = await env.DB.batch([
        env.DB.prepare(
          "UPDATE organizations SET status = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?",
        ).bind(
          input.status,
          new Date().toISOString(),
          statusRoute[1],
          input.revision,
        ),
        env.DB.prepare(
          "INSERT INTO audit_events (id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,?, 'organization.status','organization',?,? WHERE changes() = 1",
        ).bind(
          crypto.randomUUID(),
          statusRoute[1],
          identity.user.id,
          statusRoute[1],
          JSON.stringify({ status: input.status }),
        ),
      ]);
      if (result[0].meta.changes !== 1)
        return json({ error: "Registro alterado. Atualize a página." }, 409);
      return json({ status: input.status, revision: input.revision + 1 });
    }
    if (path === "/api/v1/platform/audit" && request.method === "GET")
      return json(
        (
          await env.DB.prepare(
            "SELECT id,organization_id,actor_id,action,resource_type,resource_id,created_at FROM audit_events ORDER BY created_at DESC LIMIT 200",
          ).all()
        ).results,
      );
    return json({ error: "Rota não encontrada" }, 404);
  }
  const match = path.match(/^\/api\/v1\/orgs\/([^/]+)\/(.+)$/);
  if (!match) return json({ error: "Rota não encontrada" }, 404);
  const [, orgId, resource] = match;
  if (resource === "invitations" || resource.startsWith("invitations/"))
    return handleInvitations(request, env, orgId, resource);
  if (resource === "media" && request.method === "POST") {
    const ownerType =
      request.headers.get("X-Media-Owner-Type") ?? "organization";
    const ownerId = request.headers.get("X-Media-Owner-Id") ?? orgId;
    const visibility = request.headers.get("X-Media-Visibility") ?? "private";
    const licenseStatus =
      request.headers.get("X-Media-License-Status") ?? "pending";
    const licenseNote = (
      request.headers.get("X-Media-License-Note") ?? ""
    ).slice(0, 500);
    const altText = (request.headers.get("X-Media-Alt-Text") ?? "").slice(
      0,
      300,
    );
    if (
      !["organization", "event", "edition"].includes(ownerType) ||
      !["private", "public"].includes(visibility) ||
      !["pending", "licensed", "owned", "rejected"].includes(licenseStatus) ||
      !ownerId
    )
      throw new Response("Metadados de imagem inválidos", { status: 400 });
    const mime = request.headers.get("Content-Type") ?? "";
    if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
      throw new Response("Formato não aceito. Envie PNG, JPEG ou WebP.", {
        status: 415,
      });
    await requireTenant(
      request,
      env,
      orgId,
      ownerType === "organization" ? "media.write" : "org.read",
    );
    let eventId: string | null = null;
    let editionId: string | null = null;
    if (ownerType === "organization" && ownerId !== orgId)
      throw new Response("Proprietário de mídia inválido", { status: 403 });
    if (ownerType === "event") {
      const row = await env.DB.prepare(
        "SELECT id FROM events WHERE organization_id=? AND id=?",
      )
        .bind(orgId, ownerId)
        .first<{ id: string }>();
      if (!row) throw new Response("Evento não encontrado", { status: 404 });
      eventId = row.id;
    }
    if (ownerType === "edition") {
      const row = await env.DB.prepare(
        "SELECT id,event_id FROM editions WHERE organization_id=? AND id=?",
      )
        .bind(orgId, ownerId)
        .first<{ id: string; event_id: string }>();
      if (!row) throw new Response("Edição não encontrada", { status: 404 });
      editionId = row.id;
      eventId = row.event_id;
    }
    const owner = await requireTenant(
      request,
      env,
      orgId,
      "media.write",
      eventId ?? undefined,
    );
    const bucket = env.ASSETS_PRIVATE;
    if (!bucket)
      throw new Response("Armazenamento de mídia indisponível", {
        status: 503,
      });
    const bytes = await readBoundedBody(
      request.body,
      Number(request.headers.get("Content-Length") ?? 0) || null,
    );
    let stored;
    try {
      stored = await uploadImage(env, orgId, {
        bytes,
        mime,
        visibility: visibility as "private" | "public",
        licenseStatus: licenseStatus as
          "pending" | "licensed" | "owned" | "rejected",
        licenseNote,
        altText,
      });
    } catch (error) {
      if (error instanceof MediaValidationError)
        throw new Response(error.message, { status: 400 });
      if (error instanceof MediaStorageUnavailable)
        throw new Response("Armazenamento de mídia indisponível", {
          status: 503,
        });
      throw error;
    }
    try {
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO media_assets(id,organization_id,owner_type,owner_id,event_id,edition_id,visibility,r2_key,mime,size,original_name,license_status,license_note,alt_text,uploaded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).bind(
          stored.id,
          orgId,
          ownerType,
          ownerId,
          eventId,
          editionId,
          stored.visibility,
          stored.key,
          stored.mime,
          stored.size,
          "upload.bin",
          stored.licenseStatus,
          stored.licenseNote,
          stored.altText,
          owner.identity.user.id,
        ),
        auditStatement(
          env.DB,
          orgId,
          owner.identity.user.id,
          "media.uploaded",
          "media_asset",
          stored.id,
          {
            visibility: stored.visibility,
            mime: stored.mime,
            size: stored.size,
            licenseStatus: stored.licenseStatus,
          },
        ),
      ]);
    } catch (error) {
      try {
        await bucket.delete(stored.key);
      } catch {
        /* Keep the safe API error; orphan reconciliation is documented for operations. */
      }
      throw error;
    }
    return json(
      {
        id: stored.id,
        mime: stored.mime,
        size: stored.size,
        width: stored.width,
        height: stored.height,
        visibility: stored.visibility,
        licenseStatus: stored.licenseStatus,
      },
      201,
    );
  }
  const mediaGet = resource.match(/^media\/([^/]+)$/);
  if (mediaGet && request.method === "GET") {
    await requireTenant(request, env, orgId, "org.read");
    const bucket = env.ASSETS_PRIVATE;
    if (!bucket)
      throw new Response("Armazenamento de mídia indisponível", {
        status: 503,
      });
    const asset = await env.DB.prepare(
      "SELECT r2_key,visibility,owner_type,event_id,edition_id FROM media_assets WHERE organization_id=? AND id=? AND status='ready'",
    )
      .bind(orgId, mediaGet[1])
      .first<{
        r2_key: string;
        visibility: string;
        owner_type: string;
        event_id: string | null;
        edition_id: string | null;
      }>();
    if (!asset || asset.visibility !== "private")
      throw new Response("Arquivo não encontrado", { status: 404 });
    if (asset.owner_type !== "organization") {
      const eventId =
        asset.event_id ??
        (asset.edition_id
          ? await env.DB.prepare(
              "SELECT event_id FROM editions WHERE organization_id=? AND id=?",
            )
              .bind(orgId, asset.edition_id)
              .first<{ event_id: string }>()
              .then((row) => row?.event_id)
          : undefined);
      if (!eventId)
        throw new Response("Arquivo não encontrado", { status: 404 });
      await requireTenant(request, env, orgId, "media.read", eventId);
    } else await requireTenant(request, env, orgId, "media.read");
    const object = await bucket.get(asset.r2_key);
    if (
      !object ||
      object.customMetadata?.organizationId !== orgId ||
      object.customMetadata?.visibility !== "private"
    )
      throw new Response("Arquivo não encontrado", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type":
          object.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  }
  if (resource === "settings") {
    const ctx = await requireTenant(
      request,
      env,
      orgId,
      request.method === "GET" ? "org.read" : "org.settings.write",
    );
    if (request.method === "GET") return json(ctx.organization);
    if (request.method === "PATCH") {
      const input = z
        .object({ name: z.string().trim().min(2).max(120), timezone, revision })
        .strict()
        .parse(await readJsonBody(request));
      const changed = await env.DB.batch([
        env.DB.prepare(
          "UPDATE organizations SET name=?, timezone=?, revision=revision+1, updated_at=? WHERE id=? AND revision=?",
        ).bind(
          input.name,
          input.timezone,
          new Date().toISOString(),
          orgId,
          input.revision,
        ),
        env.DB.prepare(
          "INSERT INTO audit_events (id,organization_id,actor_id,action,resource_type,resource_id) SELECT ?,?,?, 'organization.updated','organization',? WHERE changes()=1",
        ).bind(crypto.randomUUID(), orgId, ctx.identity.user.id, orgId),
      ]);
      return changed[0].meta.changes === 1
        ? json({ revision: input.revision + 1 })
        : json({ error: "Registro alterado. Atualize a página." }, 409);
    }
  }
  if (resource === "members") {
    await requireTenant(request, env, orgId, "org.members.manage");
    if (request.method === "GET")
      return json(
        (
          await env.DB.prepare(
            "SELECT m.id,m.user_id,m.role,m.status,m.revision,u.name FROM memberships m JOIN user u ON u.id=m.user_id WHERE m.organization_id=?",
          )
            .bind(orgId)
            .all()
        ).results,
      );
  }
  const memberRoute = resource.match(/^members\/([^/]+)$/);
  if (memberRoute && request.method === "PATCH") {
    const ctx = await requireTenant(request, env, orgId, "org.members.manage");
    if (ctx.member.role !== "organization_owner")
      throw new Response("Somente o proprietário altera papéis", {
        status: 403,
      });
    const input = z
      .object({
        role: z.enum(membershipRoles),
        status: z.enum(["active", "revoked"]),
        revision,
      })
      .strict()
      .parse(await readJsonBody(request));
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE memberships SET role=?,status=?,revision=revision+1,updated_at=? WHERE organization_id=? AND id=? AND revision=?",
      ).bind(
        input.role,
        input.status,
        new Date().toISOString(),
        orgId,
        memberRoute[1],
        input.revision,
      ),
      env.DB.prepare(
        "INSERT INTO audit_events (id,organization_id,actor_id,action,resource_type,resource_id) SELECT ?,?,?, 'membership.updated','membership',? WHERE changes()=1",
      ).bind(crypto.randomUUID(), orgId, ctx.identity.user.id, memberRoute[1]),
    ]);
    return results[0].meta.changes === 1
      ? json({ revision: input.revision + 1 })
      : json({ error: "Registro alterado" }, 409);
  }
  if (resource === "events") {
    const ctx = await requireTenant(request, env, orgId, "org.read");
    if (request.method === "GET") {
      const unrestricted = [
        "organization_owner",
        "organization_admin",
      ].includes(ctx.member.role);
      return json(
        (
          await env.DB.prepare(
            "SELECT e.id,e.name,e.slug,e.status,e.revision FROM events e WHERE e.organization_id=? AND (?=1 OR EXISTS (SELECT 1 FROM event_assignments a WHERE a.organization_id=e.organization_id AND a.event_id=e.id AND a.user_id=?)) ORDER BY e.created_at DESC",
          )
            .bind(orgId, unrestricted ? 1 : 0, ctx.identity.user.id)
            .all()
        ).results,
      );
    }
    if (request.method === "POST") {
      if (
        !["organization_owner", "organization_admin"].includes(ctx.member.role)
      )
        throw new Response("Acesso não permitido", { status: 403 });
      const input = eventInput.parse(await readJsonBody(request));
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO events (id,organization_id,name,slug) VALUES (?,?,?,?)",
        ).bind(id, orgId, input.name, input.slug),
        auditStatement(
          env.DB,
          orgId,
          ctx.identity.user.id,
          "event.created",
          "event",
          id,
        ),
      ]);
      return json({ id }, 201);
    }
  }
  const editionRoute = resource.match(/^events\/([^/]+)\/editions$/);
  if (editionRoute) {
    const eventId = editionRoute[1];
    const ctx = await requireTenant(
      request,
      env,
      orgId,
      request.method === "GET" ? "edition.read" : "edition.write",
      eventId,
    );
    if (
      !(await env.DB.prepare(
        "SELECT id FROM events WHERE organization_id=? AND id=?",
      )
        .bind(orgId, eventId)
        .first())
    )
      throw new Response("Evento não encontrado", { status: 404 });
    if (request.method === "GET")
      return json(
        (
          await env.DB.prepare(
            "SELECT * FROM editions WHERE organization_id=? AND event_id=? ORDER BY start_at DESC",
          )
            .bind(orgId, eventId)
            .all()
        ).results,
      );
    if (request.method === "POST") {
      const input = editionInput.parse(await readJsonBody(request));
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO editions (id,organization_id,event_id,edition_key,name,city,time_zone,start_at,end_at,external_ticket_url) VALUES (?,?,?,?,?,?,?,?,?,?)",
        ).bind(
          id,
          orgId,
          eventId,
          input.editionKey,
          input.name,
          input.city,
          input.timeZone,
          input.startAt,
          input.endAt,
          input.externalTicketUrl ?? null,
        ),
        auditStatement(
          env.DB,
          orgId,
          ctx.identity.user.id,
          "edition.created",
          "edition",
          id,
        ),
      ]);
      return json({ id }, 201);
    }
  }
  const eventRoute = resource.match(/^events\/([^/]+)$/);
  if (eventRoute) {
    const eventId = eventRoute[1];
    const ctx = await requireTenant(
      request,
      env,
      orgId,
      request.method === "GET" ? "event.read" : "event.write",
      eventId,
    );
    const event = await env.DB.prepare(
      "SELECT * FROM events WHERE organization_id=? AND id=?",
    )
      .bind(orgId, eventId)
      .first();
    if (!event) throw new Response("Evento não encontrado", { status: 404 });
    if (request.method === "GET") return json(event);
    if (request.method === "PATCH") {
      const input = z
        .object({
          name: z.string().trim().min(2).max(120),
          slug,
          status: z.enum(["draft", "active", "archived"]),
          revision,
        })
        .strict()
        .parse(await readJsonBody(request));
      const changes = await env.DB.batch([
        env.DB.prepare(
          "UPDATE events SET name=?,slug=?,status=?,revision=revision+1,updated_at=? WHERE organization_id=? AND id=? AND revision=?",
        ).bind(
          input.name,
          input.slug,
          input.status,
          new Date().toISOString(),
          orgId,
          eventId,
          input.revision,
        ),
        env.DB.prepare(
          "INSERT INTO audit_events (id,organization_id,actor_id,action,resource_type,resource_id) SELECT ?,?,?, 'event.updated','event',? WHERE changes()=1",
        ).bind(crypto.randomUUID(), orgId, ctx.identity.user.id, eventId),
      ]);
      return changes[0].meta.changes === 1
        ? json({ revision: input.revision + 1 })
        : json({ error: "Registro alterado. Atualize a página." }, 409);
    }
  }
  const editionItemRoute = resource.match(/^editions\/([^/]+)(\/clone)?$/);
  if (editionItemRoute) {
    const editionId = editionItemRoute[1];
    // Check tenant membership before looking up any private resource.
    await requireTenant(request, env, orgId, "org.read");
    const existing = await env.DB.prepare(
      "SELECT * FROM editions WHERE organization_id=? AND id=?",
    )
      .bind(orgId, editionId)
      .first<{
        event_id: string;
        revision: number;
        name: string;
        city: string;
        time_zone: string;
        start_at: string;
        end_at: string;
        external_ticket_url: string | null;
      }>();
    if (!existing) throw new Response("Edição não encontrada", { status: 404 });
    const ctx = await requireTenant(
      request,
      env,
      orgId,
      request.method === "GET" ? "edition.read" : "edition.write",
      existing.event_id,
    );
    if (request.method === "GET" && !editionItemRoute[2]) return json(existing);
    if (request.method === "POST" && editionItemRoute[2]) {
      const input = z
        .object({ editionKey: slug, name: z.string().trim().min(2).max(120) })
        .strict()
        .parse(await readJsonBody(request));
      const id = crypto.randomUUID();
      // Only editorial edition fields are copied; no applications, users or PII.
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO editions(id,organization_id,event_id,edition_key,name,city,time_zone,start_at,end_at,external_ticket_url,tokens_json,brand_profile_id) SELECT ?,organization_id,event_id,?,?,city,time_zone,start_at,end_at,external_ticket_url,tokens_json,brand_profile_id FROM editions WHERE organization_id=? AND id=?",
        ).bind(id, input.editionKey, input.name, orgId, editionId),
        auditStatement(
          env.DB,
          orgId,
          ctx.identity.user.id,
          "edition.cloned",
          "edition",
          id,
          { sourceEditionId: editionId },
        ),
      ]);
      return json({ id }, 201);
    }
    if (request.method === "PATCH" && !editionItemRoute[2]) {
      const input = z
        .object({
          name: z.string().trim().min(2).max(120),
          status: z.enum(["draft", "active", "archived"]),
          revision,
        })
        .strict()
        .parse(await readJsonBody(request));
      const changes = await env.DB.batch([
        env.DB.prepare(
          "UPDATE editions SET name=?,status=?,revision=revision+1,updated_at=? WHERE organization_id=? AND id=? AND revision=?",
        ).bind(
          input.name,
          input.status,
          new Date().toISOString(),
          orgId,
          editionId,
          input.revision,
        ),
        env.DB.prepare(
          "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id) SELECT ?,?,?, 'edition.updated','edition',? WHERE changes()=1",
        ).bind(crypto.randomUUID(), orgId, ctx.identity.user.id, editionId),
      ]);
      return changes[0].meta.changes === 1
        ? json({ revision: input.revision + 1 })
        : json({ error: "Registro alterado. Atualize a página." }, 409);
    }
  }
  return json({ error: "Rota não encontrada" }, 404);
}
