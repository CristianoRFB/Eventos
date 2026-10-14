export const organizationRoles = [
  "organization_owner",
  "organization_admin",
  "event_manager",
  "content_editor",
  "publisher",
  "reviewer_staff",
] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export const permissions = [
  "platform.organizations.manage",
  "platform.commercial.assign",
  "platform.domains.monitor",
  "platform.audit.read",
  "org.read",
  "org.settings.write",
  "org.members.manage",
  "org.brand.write",
  "org.domains.request",
  "org.commercial.read",
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
  "submissions.export",
] as const;

export type Permission = (typeof permissions)[number];

const platformPermissions = new Set<Permission>([
  "platform.organizations.manage",
  "platform.commercial.assign",
  "platform.domains.monitor",
  "platform.audit.read",
]);

const eventPermissions = new Set<Permission>([
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
  "submissions.export",
]);

const tenantPermissions = permissions.filter(
  (permission) => !platformPermissions.has(permission),
);

/** Global role and tenant roles are intentionally independent. */
const rolePermissions: Record<OrganizationRole, ReadonlySet<Permission>> = {
  organization_owner: new Set(tenantPermissions),
  organization_admin: new Set(
    tenantPermissions.filter(
      (permission) =>
        permission !== "org.domains.request" &&
        permission !== "org.commercial.read",
    ),
  ),
  event_manager: new Set([
    "org.read",
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
  ]),
  content_editor: new Set([
    "org.read",
    "event.read",
    "edition.read",
    "content.read",
    "content.write",
    "content.preview",
    "media.read",
    "media.write",
  ]),
  publisher: new Set([
    "org.read",
    "event.read",
    "edition.read",
    "content.read",
    "content.preview",
    "content.publish",
    "content.rollback",
    "media.read",
  ]),
  reviewer_staff: new Set([
    "org.read",
    "event.read",
    "edition.read",
    "applications.review",
  ]),
};

/** Populate this from the authenticated server session, never from form fields. */
export interface AuthenticatedIdentity {
  id: string;
  platformRole?: "platform_owner" | null;
}

export interface ActiveMembershipCandidate {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  status: string;
}

export interface EventAssignmentCandidate {
  userId: string;
  organizationId: string;
  eventId: string;
  status: string;
}

export interface AuthorizationInput {
  user: AuthenticatedIdentity | null;
  permission: Permission;
  organization?: { id: string; status: string };
  membership?: ActiveMembershipCandidate | null;
  /** Ownership is loaded from the scoped repository, not asserted by the client. */
  resource?: { organizationId: string; eventId?: string };
  assignments?: readonly EventAssignmentCandidate[];
}

export type AuthorizationDenial =
  | "UNAUTHENTICATED"
  | "UNKNOWN_PERMISSION"
  | "PLATFORM_ROLE_REQUIRED"
  | "ORGANIZATION_INACTIVE"
  | "MEMBERSHIP_REQUIRED"
  | "RESOURCE_SCOPE_MISMATCH"
  | "ROLE_DENIED"
  | "EVENT_ASSIGNMENT_REQUIRED";

export type AuthorizationDecision =
  { allowed: true } | { allowed: false; reason: AuthorizationDenial };

const allowed: AuthorizationDecision = { allowed: true };

export function authorize(input: AuthorizationInput): AuthorizationDecision {
  if (!input.user?.id) return { allowed: false, reason: "UNAUTHENTICATED" };
  if (!(permissions as readonly string[]).includes(input.permission)) {
    return { allowed: false, reason: "UNKNOWN_PERMISSION" };
  }
  if (platformPermissions.has(input.permission)) {
    return input.user.platformRole === "platform_owner"
      ? allowed
      : { allowed: false, reason: "PLATFORM_ROLE_REQUIRED" };
  }
  const { organization, membership, resource } = input;
  if (!organization?.id || organization.status !== "active") {
    return { allowed: false, reason: "ORGANIZATION_INACTIVE" };
  }
  if (
    !membership ||
    membership.status !== "active" ||
    membership.organizationId !== organization.id ||
    membership.userId !== input.user.id
  ) {
    return { allowed: false, reason: "MEMBERSHIP_REQUIRED" };
  }
  if (!resource || resource.organizationId !== organization.id) {
    return { allowed: false, reason: "RESOURCE_SCOPE_MISMATCH" };
  }
  const grants = Object.hasOwn(rolePermissions, membership.role)
    ? rolePermissions[membership.role]
    : undefined;
  if (!grants?.has(input.permission))
    return { allowed: false, reason: "ROLE_DENIED" };

  const organizationWide =
    membership.role === "organization_owner" ||
    membership.role === "organization_admin";
  if (!organizationWide && eventPermissions.has(input.permission)) {
    if (
      !resource.eventId ||
      !input.assignments?.some(
        (assignment) =>
          assignment.status === "active" &&
          assignment.organizationId === organization.id &&
          assignment.userId === input.user?.id &&
          assignment.eventId === resource.eventId,
      )
    ) {
      return { allowed: false, reason: "EVENT_ASSIGNMENT_REQUIRED" };
    }
  }
  return allowed;
}

export function can(input: AuthorizationInput): boolean {
  return authorize(input).allowed;
}

export class AuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(readonly reason: AuthorizationDenial) {
    super(
      reason === "UNAUTHENTICATED" ? "Sign in required" : "Permission denied",
    );
    this.name = "AuthorizationError";
    this.status = reason === "UNAUTHENTICATED" ? 401 : 403;
  }
}

export function requirePermission(input: AuthorizationInput): void {
  const decision = authorize(input);
  if (!decision.allowed) throw new AuthorizationError(decision.reason);
}
