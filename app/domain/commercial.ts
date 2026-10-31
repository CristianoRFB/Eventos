/**
 * F8 — local-only commercial contract. A real Eventos 77 plan catalogue,
 * pricing, quotas and trial policy have NOT been approved.
 * Never use this module to suggest real customers have a paid entitlement.
 */
export const subscriptionStatuses = [
  "trial", "active", "past_due", "suspended", "cancelled", "demo",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const implementedCapabilities = [
  "branding.manage", "events.manage", "domains.request",
] as const;
export type CommercialCapability = (typeof implementedCapabilities)[number];

export const measuredResources = ["active_events", "members", "domains"] as const;
export type MeasuredResource = (typeof measuredResources)[number];
export type CommercialLimit = number | null;

export interface TenantCommercialState {
  planId: string;
  subscriptionStatus: SubscriptionStatus;
  trialUntil: string | null;
  entitlementOverrides: Partial<Record<CommercialCapability, boolean>>;
  limitOverrides: Partial<Record<MeasuredResource, CommercialLimit>>;
}

export interface PlanDefinition {
  id: string;
  name: string;
  rank: number;
  features: readonly CommercialCapability[];
  limits: Readonly<Partial<Record<MeasuredResource, CommercialLimit>>>;
  monthlyPriceCents?: number;
  annualPriceCents?: number;
}

/** A SINGLE synthetic contract: no approved tiers, quotas or prices. */
export const localDemoCatalog: Readonly<Record<string, PlanDefinition>> = {
  "internal-demo": {
    id: "internal-demo",
    name: "Simulação interna (não comercial)",
    rank: 0,
    features: implementedCapabilities,
    limits: {},
  },
};

export function isCommercialStatusEligible(
  state: TenantCommercialState,
  now: Date = new Date(),
): boolean {
  if (state.subscriptionStatus === "demo" || state.subscriptionStatus === "active")
    return true;
  if (state.subscriptionStatus !== "trial" || !state.trialUntil) return false;
  const expiresAt = Date.parse(state.trialUntil);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

function eligible(appEnv: string, state: TenantCommercialState | null, now: Date) {
  return appEnv === "local" && state !== null &&
    Object.hasOwn(localDemoCatalog, state.planId) &&
    isCommercialStatusEligible(state, now);
}

/**
 * Entitlements are distinct from rollout flags and security authorization.
 * A disabled/unknown feature is NEVER granted by arbitrary overrides.
 */
export function canUse(
  appEnv: string,
  state: TenantCommercialState | null,
  capability: string,
  enabledByRuntime = false,
  now = new Date(),
): boolean {
  if (!eligible(appEnv, state, now) || !enabledByRuntime ||
      !implementedCapabilities.includes(capability as CommercialCapability))
    return false;
  const plan = localDemoCatalog[state!.planId]!;
  const permitted = state!.entitlementOverrides[capability as CommercialCapability];
  return permitted === undefined
    ? plan.features.includes(capability as CommercialCapability)
    : permitted;
}

/**
 * 0 means blocked; null means no commercial ceiling has been defined.
 * Absence does NOT mean unlimited: unknown / unconfigured resources return 0.
 */
export function getLimit(
  appEnv: string,
  state: TenantCommercialState | null,
  resource: string,
  now = new Date(),
): CommercialLimit {
  if (!eligible(appEnv, state, now) ||
      !measuredResources.includes(resource as MeasuredResource))
    return 0;
  const override = state!.limitOverrides[resource as MeasuredResource];
  if (override !== undefined)
    return override === null || (Number.isSafeInteger(override) && override >= 0)
      ? override : 0;
  const base = localDemoCatalog[state!.planId]!.limits[resource as MeasuredResource];
  return base === undefined ? 0 : base;
}

export function commercialView(
  appEnv: string,
  state: TenantCommercialState | null,
  now = new Date(),
) {
  const ready = eligible(appEnv, state, now);
  return {
    mode: "TEST_ONLY" as const,
    configured: ready,
    commercialApproved: false,
    planId: ready ? state!.planId : null,
    subscriptionStatus: ready ? state!.subscriptionStatus : null,
    trialUntil: ready ? state!.trialUntil : null,
    capabilities: Object.fromEntries(
      implementedCapabilities.map(key =>
        [key, canUse(appEnv, state, key, true, now)]),
    ),
    limits: Object.fromEntries(
      measuredResources.map(key => [key, getLimit(appEnv, state, key, now)]),
    ),
  };
}
