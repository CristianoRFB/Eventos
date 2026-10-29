import { z } from "zod";
import { normalizeHostname } from "../domain/host";
import type { AuthEnvironment } from "../infrastructure/auth.server";
import { readJsonBody } from "../infrastructure/request.server";
import { privateHeaders } from "../infrastructure/security.server";
import { requireTenant } from "./tenant.server";

/**
 * F7: Persistent, tenant-bound domain requests. All public activation gates
 * remain false until a separate privileged, provider-verified reconciliation.
 * This route has NO Cloudflare API calls and never registers a real hostname.
 */
const revision = z.number().int().positive();
const create = z.object({
  hostname: z.string().min(3).max(253),
  editionId: z.string().min(1).max(128),
}).strict();
const mutation = z.object({
  revision,
  operation: z.enum(["suspend", "retry", "release"]),
}).strict();
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: privateHeaders() });

export type DomainRow = {
  id: string;
  organization_id: string;
  hostname: string;
  destination: "FIXED_EDITION";
  destination_id: string;
  status: string;
  ownership_verified: number;
  hostname_status: string | null;
  ssl_status: string | null;
  dns_verified: number;
  version: number;
};
export async function handleDomainBindingsAdmin(
  request: Request,
  env: AuthEnvironment,
  orgId: string,
  bindingId?: string,
) {
  const actor = await requireTenant(
    request, env, orgId, "org.domains.request",
  );
  if (!bindingId && request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT id,hostname,destination,destination_id,status,ownership_verified,hostname_status,ssl_status,dns_verified,version FROM domain_bindings WHERE organization_id=? ORDER BY created_at DESC LIMIT 100",
    ).bind(orgId).all();
    return json(result.results);
  }
  if (!bindingId && request.method === "POST") {
    const payload = create.parse(await readJsonBody(request));
    const hostname = normalizeHostname(payload.hostname);
    const adminHostname = normalizeHostname(new URL(env.ADMIN_ORIGIN).hostname, {
      allowLocalPort: env.APP_ENV === "local",
    });
    // Platform-controlled/reserved hosts are never for sale or claimable.
    if (
      hostname === adminHostname ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".workers.dev") ||
      hostname.endsWith(".pages.dev") ||
      (env.APP_ENV !== "local" &&
        (hostname.endsWith(".test") || hostname.endsWith(".example")))
    ) {
      return json({ error: "Domínio reservado ou não permitido" }, 400);
    }
    const edition = await env.DB.prepare(
      "SELECT e.id FROM editions e JOIN events v ON v.organization_id=e.organization_id AND v.id=e.event_id JOIN organizations o ON o.id=e.organization_id WHERE e.organization_id=? AND e.id=? AND e.status='active' AND v.status='active' AND o.status='active'",
    ).bind(orgId, payload.editionId).first<{ id: string }>();
    if (!edition)
      return json({ error: "Edição ativa não encontrada" }, 404);

    const id = crypto.randomUUID();
    try {
      const result = await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO domain_bindings(id,organization_id,hostname,destination,destination_id,status,ownership_verified,hostname_status,ssl_status,dns_verified,version) VALUES(?,?,?,'FIXED_EDITION',?,'requested',0,NULL,NULL,0,1)",
        ).bind(id, orgId, hostname, edition.id),
        env.DB.prepare(
          "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,?,'domain.requested','domain',?,? WHERE changes()=1",
        ).bind(crypto.randomUUID(), orgId, actor.identity.user.id, id,
          JSON.stringify({ hostname })),
      ]);
      if (result[0]?.meta.changes !== 1)
        return json({ error: "Não foi possível solicitar o domínio" }, 409);
      return json({ id, hostname, status: "requested", version: 1 }, 201);
    } catch (error) {
      if (/UNIQUE constraint/i.test(error instanceof Error ? error.message : ""))
        return json({ error: "Domínio indisponível" }, 409);
      throw error;
    }
  }
  if (!bindingId) return new Response(null, { status: 405, headers: privateHeaders() });
  const binding = await env.DB.prepare(
    "SELECT id,organization_id,hostname,destination,destination_id,status,ownership_verified,hostname_status,ssl_status,dns_verified,version FROM domain_bindings WHERE organization_id=? AND id=?",
  ).bind(orgId, bindingId).first<DomainRow>();
  if (!binding) return json({ error: "Domínio não encontrado" }, 404);
  if (request.method === "GET") {
    return json({
      id: binding.id, hostname: binding.hostname, status: binding.status,
      destination: binding.destination, destinationId: binding.destination_id,
      ownershipVerified: Boolean(binding.ownership_verified),
      hostnameStatus: binding.hostname_status, sslStatus: binding.ssl_status,
      dnsVerified: Boolean(binding.dns_verified), version: binding.version,
    });
  }
  if (request.method !== "PATCH")
    return new Response(null, { status: 405, headers: privateHeaders() });
  const input = mutation.parse(await readJsonBody(request));
  let status: "suspended" | "requested" | "released";
  let eligible: readonly string[];
  switch (input.operation) {
    case "suspend":
      status = "suspended";
      eligible = ["requested", "ownership_pending", "tls_pending",
        "dns_pending", "active", "failed"];
      break;
    case "retry":
      status = "requested";
      eligible = ["failed", "suspended"];
      break;
    case "release":
      // A live or previously activated custom hostname must be released by
      // the real provider before its local binding can ever be retired.
      status = "released";
      eligible = ["requested", "failed"];
      break;
  }
  if (!eligible.includes(binding.status))
    return json({ error: "Transição não permitida" }, 409);
  if ((input.operation === "retry" || input.operation === "release") &&
    (binding.ownership_verified !== 0 || binding.hostname_status !== null ||
      binding.ssl_status !== null || binding.dns_verified !== 0))
    return json({ error: "Revisão do provedor necessária" }, 409);
  const now = new Date().toISOString();
  const updates = await env.DB.batch([
    env.DB.prepare(
      "UPDATE domain_bindings SET status=?,ownership_verified=0,hostname_status=NULL,ssl_status=NULL,dns_verified=0,version=version+1,updated_at=? WHERE organization_id=? AND id=? AND version=? AND status=?",
    ).bind(status, now, orgId, bindingId, input.revision, binding.status),
    env.DB.prepare(
      "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,?,'domain.transition','domain',?,? WHERE changes()=1",
    ).bind(crypto.randomUUID(), orgId, actor.identity.user.id, bindingId,
      JSON.stringify({ operation: input.operation, nextStatus: status })),
  ]);
  if (updates[0]?.meta.changes !== 1)
    return json({ error: "Domínio alterado. Atualize a página." }, 409);
  return json({ id: bindingId, status, version: input.revision + 1 });
}
