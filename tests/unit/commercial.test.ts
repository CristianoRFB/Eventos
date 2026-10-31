import { describe, expect, it } from "vitest";
import {
  canUse,
  commercialView,
  getLimit,
  isCommercialStatusEligible,
  localDemoCatalog,
  type TenantCommercialState,
} from "../../app/domain/commercial";

function assignment(
  changes: Partial<TenantCommercialState> = {},
): TenantCommercialState {
  return {
    planId: "internal-demo",
    subscriptionStatus: "demo",
    trialUntil: null,
    entitlementOverrides: {},
    limitOverrides: {},
    ...changes,
  };
}

describe("F8 TEST_ONLY commercial contract", () => {
  it("does not contain unapproved pricing, rank tiers, trials or invented quotas", () => {
    expect(Object.keys(localDemoCatalog)).toEqual(["internal-demo"]);
    expect(localDemoCatalog["internal-demo"]).not.toHaveProperty("monthlyPriceCents");
    expect(localDemoCatalog["internal-demo"]).not.toHaveProperty("annualPriceCents");
    expect(localDemoCatalog["internal-demo"]!.limits).toEqual({});
    expect(commercialView("local", null)).toMatchObject({
      configured: false, enabled: false, commercialApproved: false,
      planId: null,
    });
  });

  it("fails closed for unknown plans, unimplemented features and outside local", () => {
    for (const appEnv of ["production", "preview", "staging", "development"]) {
      expect(canUse(appEnv, assignment(), "events.manage", true)).toBe(false);
      expect(getLimit(appEnv, assignment(), "active_events")).toBe(0);
      expect(commercialView(appEnv, assignment()).configured).toBe(false);
    }
    expect(canUse("local", assignment({ planId: "enterprise" }), "events.manage", true))
      .toBe(false);
    expect(canUse("local", assignment(), "unimplemented.feature", true)).toBe(false);
    expect(canUse("local", assignment(), "events.manage", false)).toBe(false);
    expect(getLimit("local", assignment(), "unknown_resource")).toBe(0);
  });

  it("combines simulated base rights, runtime flags and bounded overrides", () => {
    const state = assignment({
      entitlementOverrides: { "branding.manage": false },
      limitOverrides: { active_events: 0, members: 5, domains: null },
    });
    expect(canUse("local", state, "branding.manage", true)).toBe(false);
    expect(canUse("local", state, "events.manage", true)).toBe(true);
    expect(canUse("local", state, "events.manage", false)).toBe(false);
    expect(getLimit("local", state, "active_events")).toBe(0);
    expect(getLimit("local", state, "members")).toBe(5);
    expect(getLimit("local", state, "domains")).toBeNull();
    expect(getLimit("local", assignment(), "active_events")).toBe(0);
    expect(getLimit("local", assignment({ limitOverrides: { members: -1 } }), "members"))
      .toBe(0);
  });

  it("never invents trial duration and blocks expired or invalid expirations", () => {
    const at = new Date("2026-11-01T12:00:00.000Z");
    expect(isCommercialStatusEligible(assignment({ subscriptionStatus: "trial" }), at))
      .toBe(false);
    expect(canUse(
      "local",
      assignment({ subscriptionStatus: "trial", trialUntil: "2026-10-31T00:00:00Z" }),
      "events.manage", true, at,
    )).toBe(false);
    expect(canUse(
      "local",
      assignment({ subscriptionStatus: "trial", trialUntil: "2026-11-02T00:00:00Z" }),
      "events.manage", true, at,
    )).toBe(true);
    expect(canUse(
      "local",
      assignment({ subscriptionStatus: "trial", trialUntil: "bogus" }),
      "events.manage", true, at,
    )).toBe(false);
  });

  it.each(["past_due", "suspended", "cancelled"] as const)(
    "removes simulated rights on %s without erasing the commercial record",
    (status) => {
      const current = assignment({ subscriptionStatus: status });
      const view = commercialView("local", current);
      expect(view).toMatchObject({
        configured: true, enabled: false, subscriptionStatus: status,
        capabilities: { "events.manage": false, "domains.request": false },
        limits: { active_events: 0, members: 0, domains: 0 },
      });
    },
  );
});
