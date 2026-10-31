import {
  deriveDomainStatus,
  type DomainActivationState,
  type DomainStatus,
} from "../domain/host";
import type { CustomHostnameProvider } from "../domain/custom-hostname-provider";
import type { AuthEnvironment } from "../infrastructure/auth.server";

/**
 * LOCAL TEST ONLY. Privileged reconciler: not exposed through API routes.
 * Future production must replace the fake with a verified Cloudflare adapter
 * and store its authoritative provider ID/proof before enabling hostnames.
 */
export async function reconcileSimulatedHostname(
  env: AuthEnvironment,
  provider: CustomHostnameProvider,
  orgId: string,
  bindingId: string,
  expectedVersion: number,
) {
  if (env.APP_ENV !== "local")
    throw new Error("Fake custom hostname reconciliation prohibited outside local");
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)
    throw new Error("Invalid binding version");
  const binding = await env.DB.prepare(
    "SELECT id,hostname,organization_id,status,ownership_verified,hostname_status,ssl_status,dns_verified,version FROM domain_bindings WHERE organization_id=? AND id=?",
  ).bind(orgId, bindingId).first<{
    id: string;
    hostname: string;
    organization_id: string;
    status: DomainStatus;
    ownership_verified: number;
    hostname_status: string | null;
    ssl_status: string | null;
    dns_verified: number;
    version: number;
  }>();
  if (!binding) throw new Error("Binding not found");
  if (binding.version !== expectedVersion) throw new Error("Stale binding version");
  if (["suspended", "failed", "releasing", "released"].includes(binding.status))
    throw new Error("Binding requires explicit trusted operator retry");

  const organization = await env.DB.prepare(
    "SELECT status FROM organizations WHERE id=?",
  ).bind(orgId).first<{ status: string }>();
  if (!organization) throw new Error("Organization missing");

  const providerRecord = await provider.inspect({
    organizationId: orgId,
    hostname: binding.hostname,
  });
  // Provider must never supply the tenant from an untrusted string/alias.
  if (providerRecord.organizationId !== orgId ||
      providerRecord.hostname !== binding.hostname)
    throw new Error("Provider returned inconsistent hostname ownership");
  // Never leave a previously active binding published after the provider
  // reports suspension, failure or removal. Provider terminal states dominate
  // stale success flags (which may remain present in a provider snapshot).
  const providerTerminal = ([
    "suspended", "failed", "releasing", "released",
  ] as readonly DomainStatus[]).includes(providerRecord.status);
  const invalidateEvidence = providerTerminal || organization.status !== "active";
  const next: DomainActivationState = {
    status: binding.status,
    ownershipVerified: invalidateEvidence ? false : providerRecord.ownershipVerified,
    hostnameStatus: invalidateEvidence ? null : providerRecord.hostnameStatus,
    sslStatus: invalidateEvidence ? null : providerRecord.sslStatus,
    dnsVerified: invalidateEvidence ? false : providerRecord.dnsVerified,
    organizationStatus: organization.status,
  };
  const derivedStatus = deriveDomainStatus(next);
  // An apparently valid set of gates cannot override a provider that has not
  // independently reached "active". Persist its pending state, not an active
  // binding, so read-time routing remains fail-closed.
  const nextStatus: DomainStatus = providerTerminal
    ? providerRecord.status
    : derivedStatus === "active" && providerRecord.status !== "active"
      ? (["requested", "ownership_pending", "tls_pending", "dns_pending"] as
          readonly DomainStatus[]).includes(providerRecord.status)
        ? providerRecord.status
        : "failed"
      : derivedStatus;
  const now = new Date().toISOString();

  const result = await env.DB.batch([
    env.DB.prepare(
      "UPDATE domain_bindings SET status=?,ownership_verified=?,hostname_status=?,ssl_status=?,dns_verified=?,version=version+1,updated_at=? WHERE organization_id=? AND id=? AND version=? AND status=?",
    ).bind(
      nextStatus, next.ownershipVerified ? 1 : 0,
      next.hostnameStatus, next.sslStatus, next.dnsVerified ? 1 : 0,
      now, orgId, bindingId, expectedVersion, binding.status,
    ),
    env.DB.prepare(
      "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_type,resource_id,diff_safe_json) SELECT ?,?,NULL,'domain.simulated_reconciliation','domain',?,? WHERE changes()=1",
    ).bind(
      crypto.randomUUID(), orgId, bindingId,
      JSON.stringify({ status: nextStatus, providerStatus: providerRecord.status, simulated: true }),
    ),
  ]);
  if (result[0]?.meta.changes !== 1)
    throw new Error("Concurrent domain reconciliation rejected");
  return { id: bindingId, status: nextStatus, version: expectedVersion + 1 };
}
