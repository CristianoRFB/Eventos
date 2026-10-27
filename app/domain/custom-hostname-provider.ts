/**
 * F7 — Fake custom-hostname adapter. NO Cloudflare API calls or deployment.
 * DNS, TLS and ownership evidence are simulated in tests only.
 */
import { deriveDomainStatus, normalizeHostname, type DomainStatus } from "./host";

export interface HostnameRequest { organizationId: string; hostname: string }
export interface HostnameSnapshot extends HostnameRequest {
  providerId: string;
  status: DomainStatus;
  ownershipVerified: boolean;
  hostnameStatus: string | null;
  sslStatus: string | null;
  dnsVerified: boolean;
  version: number;
}
export interface CustomHostnameProvider {
  provision(input: HostnameRequest): Promise<HostnameSnapshot>;
  inspect(input: HostnameRequest): Promise<HostnameSnapshot>;
  release(input: HostnameRequest): Promise<HostnameSnapshot>;
}
export interface FakeObservation {
  ownershipVerified: boolean;
  hostnameStatus: string | null;
  sslStatus: string | null;
  dnsVerified: boolean;
  organizationStatus: string;
}

export class HostnameClaimConflict extends Error {
  constructor() { super("Hostname claimed, reserved or inaccessible"); }
}
export class HostnameProviderOffline extends Error {
  constructor() { super("Hostname provider unavailable"); }
}

/** Volatile fake for local tests; not a Cloudflare for SaaS implementation. */
export class FakeCustomHostnameProvider implements CustomHostnameProvider {
  private readonly hosts = new Map<string, HostnameSnapshot>();
  private nextId = 0;
  private offline = false;

  simulateOutage(value: boolean): void { this.offline = value; }
  private available(): void { if (this.offline) throw new HostnameProviderOffline(); }
  private find(input: HostnameRequest): HostnameSnapshot {
    const record = this.hosts.get(normalizeHostname(input.hostname));
    if (!record || record.organizationId !== input.organizationId)
      throw new HostnameClaimConflict();
    return record;
  }
  private snapshot(record: HostnameSnapshot): HostnameSnapshot {
    return { ...record };
  }
  async provision(input: HostnameRequest): Promise<HostnameSnapshot> {
    this.available();
    if (!input.organizationId.trim()) throw new Error("Missing organization");
    const hostname = normalizeHostname(input.hostname);
    const existing = this.hosts.get(hostname);
    if (existing) {
      if (
        existing.organizationId !== input.organizationId ||
        ["releasing", "released"].includes(existing.status)
      ) throw new HostnameClaimConflict();
      return this.snapshot(existing); // idempotent only for the original tenant
    }
    const record: HostnameSnapshot = {
      organizationId: input.organizationId, hostname,
      providerId: `fake-host-${++this.nextId}`, status: "requested",
      ownershipVerified: false, hostnameStatus: null,
      sslStatus: null, dnsVerified: false, version: 1,
    };
    this.hosts.set(hostname, record);
    return this.snapshot(record);
  }
  async inspect(input: HostnameRequest): Promise<HostnameSnapshot> {
    this.available();
    return this.snapshot(this.find(input));
  }
  /** Simulates independent provider signals, never bypassing suspended/failed. */
  observe(input: HostnameRequest, signals: FakeObservation): HostnameSnapshot {
    this.available();
    const record = this.find(input);
    const status = deriveDomainStatus({ ...signals, status: record.status });
    const changed = status !== record.status ||
      signals.ownershipVerified !== record.ownershipVerified ||
      signals.hostnameStatus !== record.hostnameStatus ||
      signals.sslStatus !== record.sslStatus ||
      signals.dnsVerified !== record.dnsVerified;
    if (changed) {
      Object.assign(record, {
        status,
        ownershipVerified: signals.ownershipVerified,
        hostnameStatus: signals.hostnameStatus,
        sslStatus: signals.sslStatus,
        dnsVerified: signals.dnsVerified,
        version: record.version + 1,
      });
    }
    return this.snapshot(record);
  }
  suspend(input: HostnameRequest): HostnameSnapshot {
    this.available();
    const record = this.find(input);
    if (["releasing", "released"].includes(record.status))
      throw new HostnameClaimConflict();
    if (record.status !== "suspended") {
      record.status = "suspended";
      record.version++;
    }
    return this.snapshot(record);
  }
  markFailed(input: HostnameRequest): HostnameSnapshot {
    this.available();
    const record = this.find(input);
    if (["releasing", "released"].includes(record.status))
      throw new HostnameClaimConflict();
    if (record.status !== "failed") { record.status = "failed"; record.version++; }
    return this.snapshot(record);
  }
  /** Privileged explicit retry: all old validation evidence is invalidated. */
  retry(input: HostnameRequest): HostnameSnapshot {
    this.available();
    const record = this.find(input);
    if (!["suspended", "failed"].includes(record.status))
      throw new HostnameClaimConflict();
    Object.assign(record, {
      status: "requested", ownershipVerified: false,
      hostnameStatus: null, sslStatus: null, dnsVerified: false,
      version: record.version + 1,
    });
    return this.snapshot(record);
  }
  async release(input: HostnameRequest): Promise<HostnameSnapshot> {
    this.available();
    const record = this.find(input);
    if (record.status !== "released")
      Object.assign(record, {
        status: "released", ownershipVerified: false,
        hostnameStatus: null, sslStatus: null, dnsVerified: false,
        version: record.version + 1,
      });
    // Tombstone is retained; reassignment requires an audited separate flow.
    return this.snapshot(record);
  }
}
