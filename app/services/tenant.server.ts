import {
  requireUser,
  type AuthEnvironment,
} from "../infrastructure/auth.server";
import {
  authorize,
  type Permission,
  type OrganizationRole,
} from "../domain/permissions";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  revision: number;
  timezone: string;
  tokens_json: string;
}
export interface MembershipRow {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationRole;
  status: string;
  revision: number;
}
export async function requireTenant(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  permission: Permission,
  eventId?: string,
) {
  const identity = await requireUser(request, env);
  const organization = await env.DB.prepare(
    "SELECT * FROM organizations WHERE id = ?",
  )
    .bind(orgId)
    .first<OrganizationRow>();
  const member = await env.DB.prepare(
    "SELECT * FROM memberships WHERE organization_id = ? AND user_id = ?",
  )
    .bind(orgId, identity.user.id)
    .first<MembershipRow>();
  if (!organization || !member)
    throw new Response("Acesso não permitido", { status: 403 });
  const assignments = await env.DB.prepare(
    "SELECT event_id, permissions_json FROM event_assignments WHERE organization_id = ? AND user_id = ?",
  )
    .bind(orgId, identity.user.id)
    .all<{ event_id: string; permissions_json: string }>();
  if (
    eventId &&
    !["organization_owner", "organization_admin"].includes(member.role)
  ) {
    const assigned = assignments.results.find(
      (assignment) => assignment.event_id === eventId,
    );
    let grants: unknown = [];
    try {
      grants = JSON.parse(assigned?.permissions_json ?? "[]");
    } catch {
      /* Invalid grants fail closed. */
    }
    if (!Array.isArray(grants) || !grants.includes(permission))
      throw new Response("Acesso não permitido", { status: 403 });
  }
  const decision = authorize({
    user: { id: identity.user.id },
    permission,
    organization,
    membership: {
      userId: member.user_id,
      organizationId: member.organization_id,
      role: member.role,
      status: member.status,
    },
    resource: { organizationId: organization.id, eventId },
    assignments: assignments.results.map((a) => ({
      userId: identity.user.id,
      organizationId: orgId,
      eventId: a.event_id,
      status: "active",
    })),
  });
  if (!decision.allowed)
    throw new Response("Acesso não permitido", { status: 403 });
  return { identity, organization, member };
}
export async function requirePlatform(request: Request, env: AuthEnvironment) {
  const identity = await requireUser(request, env);
  const owner = await env.DB.prepare(
    "SELECT user_id FROM platform_owners WHERE user_id = ?",
  )
    .bind(identity.user.id)
    .first();
  if (!owner) throw new Response("Acesso não permitido", { status: 403 });
  return identity;
}
export function auditStatement(
  db: D1Database,
  orgId: string,
  actorId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  safeDiff: Record<string, unknown> = {},
) {
  return db
    .prepare(
      "INSERT INTO audit_events (id, organization_id, actor_id, action, resource_type, resource_id, diff_safe_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      orgId,
      actorId,
      action,
      resourceType,
      resourceId,
      JSON.stringify(safeDiff),
    );
}
