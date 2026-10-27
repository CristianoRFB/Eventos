import { describe, expect, it } from "vitest";
import {
  FakeCustomHostnameProvider,
  HostnameClaimConflict,
  HostnameProviderOffline,
  type FakeObservation,
} from "../../app/domain/custom-hostname-provider";

const a = { organizationId: "org-a", hostname: "Aurora.Example.TEST." };
const b = { organizationId: "org-b", hostname: "aurora.example.test" };
const ready: FakeObservation = {
  ownershipVerified: true,
  hostnameStatus: "active",
  sslStatus: "active",
  dnsVerified: true,
  organizationStatus: "active",
};

describe("F7 fake custom hostname provider — local simulation only", () => {
  it("is idempotent for one tenant, canonicalizes hostname, rejects a cross-tenant claim", async () => {
    const fake = new FakeCustomHostnameProvider();
    const initial = await fake.provision(a);
    const duplicate = await fake.provision({
      organizationId: "org-a",
      hostname: "aurora.example.test",
    });
    expect(initial).toEqual(duplicate);
    expect(initial.hostname).toBe("aurora.example.test");
    expect(initial.status).toBe("requested");
    expect(initial.ownershipVerified).toBe(false);
    await expect(fake.provision(b)).rejects.toThrow(HostnameClaimConflict);
    await expect(fake.inspect(b)).rejects.toThrow(HostnameClaimConflict);
    // Consumers cannot mutate the provider by editing returned snapshots.
    duplicate.status = "active";
    expect((await fake.inspect(a)).status).toBe("requested");
  });

  it("requires independent ownership, TLS and DNS before activation", async () => {
    const fake = new FakeCustomHostnameProvider();
    await fake.provision(a);
    const first = fake.observe(a, {
      ...ready,
      ownershipVerified: false,
    });
    expect(first.status).toBe("ownership_pending");
    expect(fake.observe(a, { ...ready, hostnameStatus: "pending" }).status)
      .toBe("tls_pending");
    expect(fake.observe(a, { ...ready, sslStatus: "pending" }).status)
      .toBe("tls_pending");
    expect(fake.observe(a, { ...ready, dnsVerified: false }).status)
      .toBe("dns_pending");
    const active = fake.observe(a, ready);
    expect(active.status).toBe("active");
    const duplicate = fake.observe(a, ready);
    expect(duplicate.version).toBe(active.version);
    expect(fake.observe(a, { ...ready, dnsVerified: false }).status)
      .toBe("dns_pending");
  });

  it("suspension, failed provider and inactive organization never self-reactivate", async () => {
    const fake = new FakeCustomHostnameProvider();
    await fake.provision(a);
    fake.observe(a, ready);
    expect(fake.suspend(a).status).toBe("suspended");
    expect(fake.observe(a, ready).status).toBe("suspended");
    expect(fake.retry(a).status).toBe("requested");
    expect((await fake.inspect(a)).ownershipVerified).toBe(false);
    expect(fake.observe(a, ready).status).toBe("active");
    expect(fake.markFailed(a).status).toBe("failed");
    expect(fake.observe(a, ready).status).toBe("failed");
    fake.retry(a);
    expect(fake.observe(a, { ...ready, organizationStatus: "suspended" }).status)
      .toBe("suspended");
    expect(fake.observe(a, ready).status).toBe("suspended");
  });

  it("revocation is idempotent and keeps a non-reassignable tombstone", async () => {
    const fake = new FakeCustomHostnameProvider();
    const created = await fake.provision(a);
    fake.observe(a, ready);
    const released = await fake.release(a);
    expect(released.status).toBe("released");
    expect(released.providerId).toBe(created.providerId);
    expect((await fake.release(a)).version).toBe(released.version);
    expect(fake.observe(a, ready).status).toBe("released");
    await expect(fake.provision(a)).rejects.toThrow(HostnameClaimConflict);
    await expect(fake.provision(b)).rejects.toThrow(HostnameClaimConflict);
    expect(() => fake.retry(a)).toThrow(HostnameClaimConflict);
  });

  it("an outage does not leak or change binding state; invalid hosts fail closed", async () => {
    const fake = new FakeCustomHostnameProvider();
    await fake.provision(a);
    fake.simulateOutage(true);
    await expect(fake.inspect(a)).rejects.toThrow(HostnameProviderOffline);
    await expect(fake.provision(b)).rejects.toThrow(HostnameProviderOffline);
    expect(() => fake.observe(a, ready)).toThrow(HostnameProviderOffline);
    fake.simulateOutage(false);
    expect((await fake.inspect(a)).status).toBe("requested");
    await expect(fake.provision({
      organizationId: "org-a",
      hostname: "aurora.example.test.attacker.test/path",
    })).rejects.toThrow();
    await expect(fake.provision({
      organizationId: "",
      hostname: "new.example.test",
    })).rejects.toThrow("Missing organization");
  });

  it("handles distinct domains for A and B without shared state", async () => {
    const fake = new FakeCustomHostnameProvider();
    const left = { organizationId: "org-a", hostname: "a.example.test" };
    const right = { organizationId: "org-b", hostname: "b.example.test" };
    await fake.provision(left);
    await fake.provision(right);
    fake.observe(left, ready);
    expect((await fake.inspect(left)).status).toBe("active");
    expect((await fake.inspect(right)).status).toBe("requested");
    await fake.release(left);
    expect((await fake.inspect(right)).status).toBe("requested");
  });
});
