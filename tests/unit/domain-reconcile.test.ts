import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { FakeCustomHostnameProvider } from "../../app/domain/custom-hostname-provider";
import { reconcileSimulatedHostname } from "../../app/services/domain-reconcile.server";
import type { AuthEnvironment } from "../../app/infrastructure/auth.server";

type Arg = string | number | null;
describe("F7 simulated D1 reconciliation (never hosted)", () => {
  let sql: DatabaseSync;
  const record = (statement: string, ...args: Arg[]) =>
    sql.prepare(statement).run(...args);
  const read = (statement: string, ...args: Arg[]) =>
    sql.prepare(statement).get(...args);
  function prepared(statement: string, args: Arg[] = []) {
    return {
      bind(...args2: Arg[]) { return prepared(statement, args2); },
      async first() { return read(statement, ...args); },
      async run() {
        return { meta: { changes: Number(record(statement, ...args).changes) } };
      },
    };
  }
  const database = {
    prepare: (statement: string) => prepared(statement),
    async batch(statements: { run(): Promise<unknown> }[]) {
      sql.exec("BEGIN IMMEDIATE");
      try {
        const result = [];
        for (const command of statements) result.push(await command.run());
        sql.exec("COMMIT");
        return result;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const env = () => ({ DB: database, APP_ENV: "local" }) as unknown as AuthEnvironment;
  const binding = (tenant: string) => {
    const suffix = tenant.at(-1)!;
    record(
      "INSERT INTO domain_bindings(id,organization_id,hostname,destination,destination_id,status) VALUES(?,?,?,'FIXED_EDITION',?,'requested')",
      `binding-${suffix}`, tenant, `festival-${suffix}.example.test`, `edition-${suffix}`,
    );
  };
  const fake = () => new FakeCustomHostnameProvider();

  beforeEach(() => {
    sql = new DatabaseSync(":memory:");
    sql.exec("PRAGMA foreign_keys=ON");
    for (const name of readdirSync(resolve("migrations")).filter((n) => n.endsWith(".sql")).sort())
      sql.exec(readFileSync(resolve("migrations", name), "utf8"));
    for (const suffix of ["a", "b"]) {
      const tenant = `org-${suffix}`;
      record("INSERT INTO organizations(id,slug,name) VALUES(?,?,?)", tenant, tenant, "Synthetic");
      record("INSERT INTO events(id,organization_id,slug,name) VALUES(?,?,?,?)",
        `event-${suffix}`, tenant, "festival", "Synthetic");
      record("INSERT INTO editions(id,organization_id,event_id,edition_key,name,status) VALUES(?,?,?,?,?,'active')",
        `edition-${suffix}`, tenant, `event-${suffix}`, "2027", "Synthetic");
      binding(tenant);
    }
  });
  afterEach(() => sql.close());

  it("persists independent ownership, SSL and DNS gates and activates only with provider confirmation", async () => {
    const provider = fake();
    const host = { organizationId: "org-a", hostname: "festival-a.example.test" };
    await provider.provision(host);
    provider.observe(host, {
      ownershipVerified: true,
      hostnameStatus: "active",
      sslStatus: "active",
      dnsVerified: false,
      organizationStatus: "active",
    });
    const pending = await reconcileSimulatedHostname(env(), provider, "org-a", "binding-a", 1);
    expect(pending).toMatchObject({ status: "dns_pending", version: 2 });
    provider.observe(host, {
      ownershipVerified: true,
      hostnameStatus: "active",
      sslStatus: "active",
      dnsVerified: true,
      organizationStatus: "active",
    });
    const ready = await reconcileSimulatedHostname(env(), provider, "org-a", "binding-a", 2);
    expect(ready).toMatchObject({ status: "active", version: 3 });
    expect(read("SELECT status,version FROM domain_bindings WHERE id=?", "binding-a"))
      .toMatchObject({ status: "active", version: 3 });
    expect(read("SELECT status,version FROM domain_bindings WHERE id=?", "binding-b"))
      .toMatchObject({ status: "requested", version: 1 });
    expect(() => read("SELECT count(*) FROM audit_events WHERE organization_id='org-a'")).not.toThrow();
  });

  it("refuses stale changes, cross-tenant IDs, outages and nonlocal fake execution", async () => {
    const provider = fake();
    await provider.provision({ organizationId: "org-a", hostname: "festival-a.example.test" });
    await expect(reconcileSimulatedHostname(env(), provider, "org-b", "binding-a", 1))
      .rejects.toThrow("Binding not found");
    await expect(reconcileSimulatedHostname(env(), provider, "org-a", "binding-a", 9))
      .rejects.toThrow("Stale binding");
    provider.simulateOutage(true);
    await expect(reconcileSimulatedHostname(env(), provider, "org-a", "binding-a", 1))
      .rejects.toThrow("provider unavailable");
    expect(read("SELECT version FROM domain_bindings WHERE id=?", "binding-a"))
      .toMatchObject({ version: 1 });
    const nonlocal = { ...env(), APP_ENV: "production" };
    await expect(reconcileSimulatedHostname(nonlocal, provider, "org-a", "binding-a", 1))
      .rejects.toThrow("prohibited outside local");
  });

  it("honors suspended organization regardless of provider DNS and SSL", async () => {
    const provider = fake();
    const host = { organizationId: "org-a", hostname: "festival-a.example.test" };
    await provider.provision(host);
    provider.observe(host, {
      ownershipVerified: true, hostnameStatus: "active",
      sslStatus: "active", dnsVerified: true, organizationStatus: "active",
    });
    record("UPDATE organizations SET status='suspended' WHERE id='org-a'");
    expect(await reconcileSimulatedHostname(env(), provider, "org-a", "binding-a", 1))
      .toMatchObject({ status: "suspended" });
    await expect(reconcileSimulatedHostname(env(), provider, "org-a", "binding-a", 2))
      .rejects.toThrow("explicit trusted operator retry");
  });
});
