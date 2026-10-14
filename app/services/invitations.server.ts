import { z } from "zod";
import {
  requireUser,
  type AuthEnvironment,
} from "../infrastructure/auth.server";
import {
  requireSameOrigin,
  privateHeaders,
} from "../infrastructure/security.server";
import { requireTenant, auditStatement } from "./tenant.server";
import { membershipRoles, type MembershipRole } from "../db/tenant-schema";
import { readJsonBody } from "../infrastructure/request.server";

const inviteInput = z
  .object({
    email: z.email().max(254),
    role: z.enum(membershipRoles),
    eventId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,128}$/)
      .optional(),
  })
  .strict();
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders() });
}
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
const roleGrants: Record<MembershipRole, string[]> = {
  organization_owner: [
    "org.read",
    "org.settings.write",
    "org.members.manage",
    "org.brand.write",
    "org.domains.request",
    "private.audit.read",
    "event.read",
    "event.write",
    "edition.read",
    "edition.write",
    "content.read",
    "content.write",
    "content.preview",
    "content.publish",
    "content.rollback",
    "media.read",
    "media.write",
    "program.write",
    "guest.write",
    "exhibitor.write",
    "sponsor.write",
    "forms.manage",
    "applications.review",
  ],
  organization_admin: [
    "org.read",
    "org.settings.write",
    "org.members.manage",
    "org.brand.write",
    "private.audit.read",
    "event.read",
    "event.write",
    "edition.read",
    "edition.write",
    "content.read",
    "content.write",
    "content.preview",
    "content.publish",
    "content.rollback",
    "media.read",
    "media.write",
    "program.write",
    "guest.write",
    "exhibitor.write",
    "sponsor.write",
    "forms.manage",
    "applications.review",
  ],
  event_manager: [
    "event.read",
    "event.write",
    "edition.read",
    "edition.write",
    "content.read",
    "content.write",
    "content.preview",
    "content.publish",
    "media.read",
    "media.write",
    "program.write",
    "guest.write",
    "exhibitor.write",
    "sponsor.write",
    "forms.manage",
    "applications.review",
  ],
  content_editor: [
    "event.read",
    "edition.read",
    "content.read",
    "content.write",
    "content.preview",
    "media.read",
    "media.write",
  ],
  publisher: [
    "event.read",
    "edition.read",
    "content.read",
    "content.preview",
    "content.publish",
    "content.rollback",
    "media.read",
  ],
  reviewer_staff: ["event.read", "edition.read", "applications.review"],
};
function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
export async function handleInvitations(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  tail: string,
) {
  if (request.method !== "GET") requireSameOrigin(request, env.ADMIN_ORIGIN);
  if (tail === "invitations" && request.method === "GET") {
    await requireTenant(request, env, orgId, "org.members.manage");
    const rows = await env.DB.prepare(
      "SELECT id,email_hash,role,event_id,expires_at,accepted_at,revoked_at,created_at FROM invitations WHERE organization_id=? ORDER BY created_at DESC LIMIT 100",
    )
      .bind(orgId)
      .all();
    return json(rows.results);
  }
  if (tail === "invitations" && request.method === "POST") {
    const ctx = await requireTenant(request, env, orgId, "org.members.manage");
    const data = inviteInput.parse(await readJsonBody(request));
    if (
      data.role === "organization_owner" &&
      ctx.member.role !== "organization_owner"
    )
      throw new Response(
        "Somente o proprietário pode convidar outro proprietário",
        { status: 403 },
      );
    if (
      ctx.member.role !== "organization_owner" &&
      data.role === "organization_admin"
    )
      throw new Response(
        "Somente o proprietário pode convidar uma pessoa administradora",
        { status: 403 },
      );
    if (
      [
        "event_manager",
        "content_editor",
        "publisher",
        "reviewer_staff",
      ].includes(data.role) &&
      !data.eventId
    )
      throw new Response("Escolha o evento para esta função", { status: 400 });
    if (
      data.eventId &&
      !(await env.DB.prepare(
        "SELECT id FROM events WHERE organization_id=? AND id=? AND status!='archived'",
      )
        .bind(orgId, data.eventId)
        .first())
    )
      throw new Response("Evento não encontrado", { status: 404 });
    const normalizedEmail = data.email.trim().toLowerCase();
    const emailHash = await sha256(normalizedEmail);
    if (
      await env.DB.prepare(
        "SELECT memberships.id FROM memberships JOIN user ON user.id=memberships.user_id WHERE memberships.organization_id=? AND lower(user.email)=?",
      )
        .bind(orgId, normalizedEmail)
        .first()
    )
      throw new Response("Esta pessoa já pertence à organizadora", {
        status: 409,
      });
    const invitationId = crypto.randomUUID();
    const rawToken = token();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO invitations(id,organization_id,email_hash,token_hash,role,event_id,invited_by,expires_at) VALUES(?,?,?,?,?,?,?,?)",
      ).bind(
        invitationId,
        orgId,
        emailHash,
        await sha256(rawToken),
        data.role,
        data.eventId ?? null,
        ctx.identity.user.id,
        expiresAt,
      ),
      auditStatement(
        env.DB,
        orgId,
        ctx.identity.user.id,
        "invitation.created",
        "invitation",
        invitationId,
        { role: data.role, eventId: data.eventId ?? null },
      ),
    ]);
    // No mail integration yet; return the one-time token only to the owner who created it.
    return json({ id: invitationId, token: rawToken, expiresAt }, 201);
  }
  const revoke = tail.match(/^invitations\/([^/]+)\/revoke$/);
  if (revoke && request.method === "POST") {
    const ctx = await requireTenant(request, env, orgId, "org.members.manage");
    const result = await env.DB.batch([
      env.DB.prepare(
        "UPDATE invitations SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE organization_id=? AND id=? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')",
      ).bind(orgId, revoke[1]),
      env.DB.prepare(
        "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id) SELECT ?,?,?, 'invitation.revoked','invitation',? WHERE changes()=1",
      ).bind(crypto.randomUUID(), orgId, ctx.identity.user.id, revoke[1]),
    ]);
    return result[0].meta.changes === 1
      ? json({ revoked: true })
      : json({ error: "Convite indisponível ou já utilizado" }, 409);
  }
  if (tail === "invitations/accept" && request.method === "POST") {
    const identity = await requireUser(request, env);
    if (!identity.user.emailVerified)
      throw new Response(
        "Confirme o e-mail da conta antes de aceitar o convite",
        { status: 403 },
      );
    const input = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(await readJsonBody(request));
    const tokenHash = await sha256(input.token);
    const emailHash = await sha256(identity.user.email.trim().toLowerCase());
    const invitation = await env.DB.prepare(
      "SELECT id,organization_id,role,event_id,expires_at FROM invitations WHERE token_hash=? AND email_hash=? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')",
    )
      .bind(tokenHash, emailHash)
      .first<{
        id: string;
        organization_id: string;
        role: MembershipRole;
        event_id: string | null;
        expires_at: string;
      }>();
    if (!invitation)
      throw new Response(
        "Convite inválido, expirado ou destinado a outra conta",
        { status: 404 },
      );
    const memberId = crypto.randomUUID();
    const grants = invitation.event_id
      ? roleGrants[invitation.role].filter(
          (grant) => !grant.startsWith("org.") && !grant.startsWith("private."),
        )
      : [];
    const result = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO memberships(id,organization_id,user_id,role,status) SELECT ?,i.organization_id,?,i.role,'active' FROM invitations i JOIN organizations o ON o.id=i.organization_id WHERE i.id=? AND i.token_hash=? AND i.email_hash=? AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND o.status='active' AND NOT EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=i.organization_id AND m.user_id=?) AND (i.event_id IS NULL OR EXISTS(SELECT 1 FROM events e WHERE e.organization_id=i.organization_id AND e.id=i.event_id AND e.status!='archived'))",
      ).bind(
        memberId,
        identity.user.id,
        invitation.id,
        tokenHash,
        emailHash,
        identity.user.id,
      ),
      env.DB.prepare(
        "UPDATE invitations SET accepted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=invitations.organization_id AND m.user_id=? AND m.id=? AND m.status='active')",
      ).bind(invitation.id, identity.user.id, memberId),
      env.DB.prepare(
        "INSERT INTO event_assignments(id,organization_id,event_id,user_id,permissions_json) SELECT ?,i.organization_id,i.event_id,?,? FROM invitations i WHERE i.id=? AND i.event_id IS NOT NULL AND i.accepted_at IS NOT NULL AND EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=i.organization_id AND m.user_id=? AND m.id=?)",
      ).bind(
        crypto.randomUUID(),
        identity.user.id,
        JSON.stringify(grants),
        invitation.id,
        identity.user.id,
        memberId,
      ),
      env.DB.prepare(
        "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,?, 'invitation.accepted','invitation',?,? FROM invitations i WHERE i.id=? AND i.accepted_at IS NOT NULL AND EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=i.organization_id AND m.user_id=? AND m.id=?)",
      ).bind(
        crypto.randomUUID(),
        invitation.organization_id,
        identity.user.id,
        invitation.id,
        JSON.stringify({ role: invitation.role, eventId: invitation.event_id }),
        invitation.id,
        identity.user.id,
        memberId,
      ),
    ]);
    if (result[1].meta.changes !== 1)
      return json(
        { error: "Convite utilizado, expirado ou indisponível" },
        409,
      );
    return json({ accepted: true, organizationId: invitation.organization_id });
  }
  return json({ error: "Rota não encontrada" }, 404);
}
