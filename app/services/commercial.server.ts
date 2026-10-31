import { z } from "zod";
import {
  commercialView,
  implementedCapabilities,
  localDemoCatalog,
  measuredResources,
  subscriptionStatuses,
  type TenantCommercialState,
} from "../domain/commercial";
import type { AuthEnvironment } from "../infrastructure/auth.server";
import { readJsonBody } from "../infrastructure/request.server";
import { privateHeaders } from "../infrastructure/security.server";
import { requirePlatform, requireTenant } from "./tenant.server";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: privateHeaders() });

const assignmentInput = z.object({
  planId: z.literal("internal-demo"),
  subscriptionStatus: z.enum(subscriptionStatuses),
  trialUntil: z.union([z.iso.datetime(), z.null()]).default(null),
  entitlementOverrides: z.partialRecord(z.enum(implementedCapabilities), z.boolean())
    .default({}),
  limitOverrides: z.partialRecord(
    z.enum(measuredResources),
    z.union([z.number().int().nonnegative().safe(), z.null()]),
  ).default({}),
  expectedRevision: z.number().int().nonnegative(),
}).strict().superRefine((input, ctx) => {
  if (input.subscriptionStatus === "trial" && !input.trialUntil)
    ctx.addIssue({
      code: "custom",
      path: ["trialUntil"],
      message: "Trial requires an explicit expiry, never an assumed duration",
    });
});

type AssignmentRow = {
  plan_id: string;
  subscription_status: TenantCommercialState["subscriptionStatus"];
  trial_until: string | null;
  entitlement_overrides_json: string;
  limit_overrides_json: string;
  revision: number;
};

function parseRow(row: AssignmentRow | null): TenantCommercialState | null {
  if (!row) return null;
  return {
    planId: row.plan_id,
    subscriptionStatus: row.subscription_status,
    trialUntil: row.trial_until,
    entitlementOverrides: JSON.parse(row.entitlement_overrides_json) as TenantCommercialState["entitlementOverrides"],
    limitOverrides: JSON.parse(row.limit_overrides_json) as TenantCommercialState["limitOverrides"],
  };
}

async function readState(env: AuthEnvironment, orgId: string) {
  const record = await env.DB.prepare(
    "SELECT plan_id,subscription_status,trial_until,entitlement_overrides_json,limit_overrides_json,revision FROM commercial_assignments WHERE organization_id=?",
  ).bind(orgId).first<AssignmentRow>();
  return { record, view: commercialView(env.APP_ENV, parseRow(record)) };
}

/**
 * Standalone F8 TEST_ONLY surface, intentionally not used to gate existing
 * customer operations until a real, approved catalog and enforcement rollout.
 */
export async function handlePlatformCommercial(
  request: Request, env: AuthEnvironment, orgId: string,
) {
  const actor = await requirePlatform(request, env);
  if (env.APP_ENV !== "local")
    return json({ error: "Catálogo de Eventos 77 ainda não aprovado" }, 503);
  const organization = await env.DB.prepare(
    "SELECT id FROM organizations WHERE id=?",
  ).bind(orgId).first<{ id: string }>();
  if (!organization) return json({ error: "Organizadora não encontrada" }, 404);
  if (request.method === "GET") {
    const { record, view } = await readState(env, orgId);
    return json({ ...view, revision: record?.revision ?? 0 });
  }
  if (request.method !== "PATCH")
    return new Response(null, { status: 405, headers: privateHeaders() });
  const input = assignmentInput.parse(await readJsonBody(request));
  if (!Object.hasOwn(localDemoCatalog, input.planId))
    return json({ error: "Catálogo não disponível" }, 400);
  const current = await readState(env, orgId);
  if ((current.record?.revision ?? 0) !== input.expectedRevision)
    return json({ error: "Atribuição alterada. Atualize a página." }, 409);

  const now = new Date().toISOString();
  const changed = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO commercial_assignments
      (organization_id,plan_id,subscription_status,trial_until,entitlement_overrides_json,limit_overrides_json,revision,updated_at)
      VALUES(?,?,?,?,?,?,1,?)
      ON CONFLICT(organization_id) DO UPDATE SET
        plan_id=excluded.plan_id,
        subscription_status=excluded.subscription_status,
        trial_until=excluded.trial_until,
        entitlement_overrides_json=excluded.entitlement_overrides_json,
        limit_overrides_json=excluded.limit_overrides_json,
        updated_at=excluded.updated_at,
        revision=commercial_assignments.revision+1
      WHERE commercial_assignments.revision=?`,
    ).bind(
      orgId, input.planId, input.subscriptionStatus, input.trialUntil,
      JSON.stringify(input.entitlementOverrides),
      JSON.stringify(input.limitOverrides),
      now, input.expectedRevision,
    ),
    env.DB.prepare(
      "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,?,'commercial.demo.assignment','organization',?,? WHERE changes()=1",
    ).bind(
      crypto.randomUUID(), orgId, actor.user.id, orgId,
      JSON.stringify({
        planId: input.planId,
        subscriptionStatus: input.subscriptionStatus,
        trialConfigured: Boolean(input.trialUntil),
        overrideFeatures: Object.keys(input.entitlementOverrides),
        overrideLimits: Object.keys(input.limitOverrides),
        testOnly: true,
      }),
    ),
  ]);
  if (changed[0]?.meta.changes !== 1)
    return json({ error: "Atribuição alterada. Atualize a página." }, 409);
  const fresh = await readState(env, orgId);
  return json({ ...fresh.view, revision: fresh.record!.revision });
}

export async function handleTenantCommercial(
  request: Request, env: AuthEnvironment, orgId: string,
) {
  // Platform ownership alone does not grant access to a tenant's private data.
  await requireTenant(request, env, orgId, "org.commercial.read");
  if (request.method !== "GET")
    return new Response(null, { status: 405, headers: privateHeaders() });
  if (env.APP_ENV !== "local")
    return json({ ...commercialView(env.APP_ENV, null), revision: 0 });
  const { record, view } = await readState(env, orgId);
  return json({ ...view, revision: record?.revision ?? 0 });
}
