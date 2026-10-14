import { describe, expect, it } from "vitest";
import {
  authorize,
  AuthorizationError,
  can,
  permissions,
  requirePermission,
  type AuthorizationInput,
  type OrganizationRole,
  type Permission,
} from "../../app/domain/permissions";

function context(
  role: OrganizationRole = "organization_owner",
): AuthorizationInput {
  return {
    user: { id: "user-a" },
    permission: "content.write",
    organization: { id: "org-a", status: "active" },
    membership: {
      userId: "user-a",
      organizationId: "org-a",
      role,
      status: "active",
    },
    resource: { organizationId: "org-a", eventId: "event-a" },
    assignments: [
      {
        userId: "user-a",
        organizationId: "org-a",
        eventId: "event-a",
        status: "active",
      },
    ],
  };
}

describe("membership and resource boundaries", () => {
  it("requires a session identity for every administrative permission", () => {
    for (const permission of permissions) {
      expect(can({ ...context(), user: null, permission })).toBe(false);
    }
    expect(() => requirePermission({ ...context(), user: null })).toThrow(
      AuthorizationError,
    );
    expect(authorize({ ...context(), user: null })).toEqual({
      allowed: false,
      reason: "UNAUTHENTICATED",
    });
  });

  it("requires a current active membership belonging to this same authenticated user", () => {
    const base = context();
    expect(can(base)).toBe(true);
    expect(can({ ...base, membership: null })).toBe(false);
    expect(
      can({ ...base, membership: { ...base.membership!, status: "revoked" } }),
    ).toBe(false);
    expect(
      can({ ...base, membership: { ...base.membership!, status: "invited" } }),
    ).toBe(false);
    expect(
      can({ ...base, membership: { ...base.membership!, userId: "user-b" } }),
    ).toBe(false);
    expect(
      can({
        ...base,
        membership: { ...base.membership!, organizationId: "org-b" },
      }),
    ).toBe(false);
  });

  it("denies a forged resource org, missing resource ownership and suspended organizations", () => {
    expect(
      can({
        ...context(),
        resource: { organizationId: "org-b", eventId: "event-b" },
      }),
    ).toBe(false);
    expect(can({ ...context(), resource: undefined })).toBe(false);
    expect(
      can({ ...context(), organization: { id: "org-a", status: "suspended" } }),
    ).toBe(false);
    expect(
      can({ ...context(), organization: { id: "org-b", status: "active" } }),
    ).toBe(false);
  });

  it("can independently select two active memberships without inheriting the other context", () => {
    const a = context();
    const b: AuthorizationInput = {
      ...a,
      organization: { id: "org-b", status: "active" },
      membership: { ...a.membership!, organizationId: "org-b" },
      resource: { organizationId: "org-b", eventId: "event-b" },
    };
    expect(can(a)).toBe(true);
    expect(can(b)).toBe(true);
    expect(can({ ...b, membership: a.membership })).toBe(false);
    expect(can({ ...a, resource: b.resource })).toBe(false);
  });

  it("fails closed on forged permission or role strings", () => {
    expect(
      can({ ...context(), permission: "platform.superuser" as Permission }),
    ).toBe(false);
    expect(
      can({
        ...context(),
        membership: {
          ...context().membership!,
          role: "platform_owner" as OrganizationRole,
        },
      }),
    ).toBe(false);
    expect(
      can({
        ...context(),
        membership: {
          ...context().membership!,
          role: "__proto__" as OrganizationRole,
        },
      }),
    ).toBe(false);
  });
});

describe("Platform Owner separation", () => {
  it("grants global administration only via the trusted identity's platform role", () => {
    expect(
      can({
        user: { id: "platform", platformRole: "platform_owner" },
        permission: "platform.organizations.manage",
      }),
    ).toBe(true);
    expect(
      can({ ...context(), permission: "platform.organizations.manage" }),
    ).toBe(false);
    expect(
      can({
        ...context("organization_admin"),
        permission: "platform.commercial.assign",
      }),
    ).toBe(false);
  });

  it("gives a platform owner no automatic access to any private tenant resource", () => {
    const user = { id: "platform", platformRole: "platform_owner" as const };
    for (const permission of permissions.filter(
      (item) => !item.startsWith("platform."),
    )) {
      expect(can({ ...context(), user, membership: null, permission })).toBe(
        false,
      );
    }
    // A real tenant membership remains necessary even when global role exists.
    expect(
      can({
        ...context(),
        user: { id: "user-a", platformRole: "platform_owner" },
      }),
    ).toBe(true);
  });
});

describe("least-privilege role actions", () => {
  it("allows owner/admin operation in their own org without event assignments", () => {
    for (const role of ["organization_owner", "organization_admin"] as const) {
      for (const permission of [
        "org.members.manage",
        "event.write",
        "content.publish",
        "submissions.export",
      ] as const) {
        expect(can({ ...context(role), assignments: [], permission })).toBe(
          true,
        );
      }
    }
    expect(
      can({
        ...context("organization_admin"),
        permission: "org.domains.request",
      }),
    ).toBe(false);
    expect(
      can({
        ...context("organization_owner"),
        permission: "org.domains.request",
      }),
    ).toBe(true);
  });

  it("lets editors save and preview assigned drafts, but cannot publish or review submissions", () => {
    for (const permission of [
      "content.write",
      "content.preview",
      "media.write",
    ] as const) {
      expect(can({ ...context("content_editor"), permission })).toBe(true);
    }
    for (const permission of [
      "content.publish",
      "content.rollback",
      "applications.review",
      "org.members.manage",
    ] as const) {
      expect(can({ ...context("content_editor"), permission })).toBe(false);
    }
  });

  it("separates publisher approval and rollback from editing drafts", () => {
    expect(
      can({ ...context("publisher"), permission: "content.publish" }),
    ).toBe(true);
    expect(
      can({ ...context("publisher"), permission: "content.rollback" }),
    ).toBe(true);
    expect(
      can({ ...context("publisher"), permission: "content.preview" }),
    ).toBe(true);
    expect(can({ ...context("publisher"), permission: "content.write" })).toBe(
      false,
    );
    expect(
      can({ ...context("publisher"), permission: "org.members.manage" }),
    ).toBe(false);
  });

  it("restricts reviewers to assigned applications without implicit export permission", () => {
    expect(
      can({ ...context("reviewer_staff"), permission: "applications.review" }),
    ).toBe(true);
    for (const permission of [
      "forms.manage",
      "submissions.export",
      "content.write",
      "content.publish",
    ] as const) {
      expect(can({ ...context("reviewer_staff"), permission })).toBe(false);
    }
  });

  it("lets a manager operate assigned events without org team/domain privileges", () => {
    for (const permission of [
      "event.write",
      "edition.write",
      "program.write",
      "guest.write",
      "content.publish",
      "applications.review",
    ] as const) {
      expect(can({ ...context("event_manager"), permission })).toBe(true);
    }
    for (const permission of [
      "org.members.manage",
      "org.domains.request",
      "private.audit.read",
      "submissions.export",
    ] as const) {
      expect(can({ ...context("event_manager"), permission })).toBe(false);
    }
  });
});

describe("event assignment boundary", () => {
  it.each([
    "event_manager",
    "content_editor",
    "publisher",
    "reviewer_staff",
  ] as const)(
    "requires an active assignment tied to user, organization AND event for %s",
    (role) => {
      const base = {
        ...context(role),
        permission:
          role === "reviewer_staff"
            ? ("applications.review" as const)
            : ("content.preview" as const),
      };
      expect(can(base)).toBe(true);
      expect(can({ ...base, assignments: [] })).toBe(false);
      expect(can({ ...base, resource: { organizationId: "org-a" } })).toBe(
        false,
      );
      expect(
        can({
          ...base,
          resource: { organizationId: "org-a", eventId: "event-a-other" },
        }),
      ).toBe(false);
      for (const assignment of [
        { ...base.assignments![0], status: "revoked" },
        { ...base.assignments![0], userId: "user-b" },
        { ...base.assignments![0], organizationId: "org-b" },
        { ...base.assignments![0], eventId: "event-b" },
      ]) {
        expect(can({ ...base, assignments: [assignment] })).toBe(false);
      }
    },
  );

  it("turns membership revocation into denial even while the same identity is signed in", () => {
    const base = context("content_editor");
    expect(can(base)).toBe(true);
    expect(
      can({ ...base, membership: { ...base.membership!, status: "revoked" } }),
    ).toBe(false);
    expect(can(base)).toBe(true);
  });
});
