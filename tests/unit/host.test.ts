import { describe, expect, it } from "vitest";
import {
  assertDestinationOwnership,
  deriveDomainStatus,
  DomainResolutionError,
  HostValidationError,
  isDomainActive,
  normalizeHostname,
  resolvePublicDomain,
  type DomainActivationState,
  type DomainBinding,
  type DomainResources,
} from "../../app/domain/host";

describe("strict hostname normalization", () => {
  it("makes Unicode IDNA, ASCII case and the final DNS root dot one exact key", () => {
    expect(normalizeHostname("EVENTO.Example.TEST.")).toBe(
      "evento.example.test",
    );
    expect(normalizeHostname("BÜCHER.example")).toBe("xn--bcher-kva.example");
    expect(normalizeHostname("xn--bcher-kva.example")).toBe(
      "xn--bcher-kva.example",
    );
    expect(normalizeHostname("evento。example．test")).toBe(
      "evento.example.test",
    );
  });

  it.each([
    "",
    " example.test",
    "example.test ",
    "example.test\n",
    "example.test\r\nHost: other.test",
    "example.test\u0000.attacker.test",
    "example.test\u007f",
    "https://example.test",
    "http:example.test",
    "//example.test",
    "example.test/path",
    "example.test\\other.test",
    "example.test?org=b",
    "example.test#fragment",
    "user:password@example.test",
    "example.test@attacker.test",
    "example.test%2f.attacker.test",
    "example.test,other.test",
    "example.test;other.test",
    "example.test:443",
    "example.test:",
    "example.test..",
    ".example.test",
    "bad..example.test",
    "-bad.example.test",
    "bad-.example.test",
    "under_score.example.test",
    "*.example.test",
    "xn--a.example",
    "127.0.0.1",
    "127.1",
    "0x7f000001",
    "2130706433",
    "192.168.1.1",
    "[2001:db8::1]",
    "[::1]",
    "internal",
    `${"a".repeat(64)}.example.test`,
    `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}`,
  ])("rejects ambiguous/injected/malformed authority %j", (host) => {
    expect(() => normalizeHostname(host)).toThrow(HostValidationError);
  });

  it("only strips explicitly allowed development ports on local or .test hosts", () => {
    const options = { allowLocalPort: true, allowedPorts: [8787, 5173] };
    expect(normalizeHostname("localhost:8787", options)).toBe("localhost");
    expect(normalizeHostname("a.example.test:5173", options)).toBe(
      "a.example.test",
    );
    expect(normalizeHostname("127.0.0.1:8787", options)).toBe("127.0.0.1");
    expect(normalizeHostname("[::1]:8787", options)).toBe("[::1]");
    expect(() => normalizeHostname("a.example.com:8787", options)).toThrow();
    expect(() => normalizeHostname("localhost:3000", options)).toThrow();
    expect(() => normalizeHostname("localhost:0", options)).toThrow();
    expect(() => normalizeHostname("localhost:65536", options)).toThrow();
    expect(() => normalizeHostname("localhost:08787", options)).toThrow();
    expect(() => normalizeHostname("127.1:8787", options)).toThrow();
    expect(() => normalizeHostname("0x7f000001:8787", options)).toThrow();
  });
});

const ready: DomainActivationState = {
  status: "active",
  ownershipVerified: true,
  hostnameStatus: "active",
  sslStatus: "active",
  dnsVerified: true,
  organizationStatus: "active",
};

describe("domain activation", () => {
  it("reconciles each distinct ownership, hostname/TLS and DNS gate in order", () => {
    expect(deriveDomainStatus({ ...ready, ownershipVerified: false })).toBe(
      "ownership_pending",
    );
    expect(deriveDomainStatus({ ...ready, hostnameStatus: "pending" })).toBe(
      "tls_pending",
    );
    expect(
      deriveDomainStatus({ ...ready, sslStatus: "pending_validation" }),
    ).toBe("tls_pending");
    expect(deriveDomainStatus({ ...ready, dnsVerified: false })).toBe(
      "dns_pending",
    );
    expect(deriveDomainStatus(ready)).toBe("active");
  });

  it.each(["suspended", "releasing", "released", "failed"] as const)(
    "does not resurrect an explicitly %s binding during provider polling",
    (status) => {
      expect(deriveDomainStatus({ ...ready, status })).toBe(status);
      expect(isDomainActive({ ...ready, status })).toBe(false);
    },
  );

  it("fails closed for stale active flags, inactive tenants and unreconciled bindings", () => {
    expect(isDomainActive(ready)).toBe(true);
    expect(isDomainActive({ ...ready, ownershipVerified: false })).toBe(false);
    expect(isDomainActive({ ...ready, hostnameStatus: null })).toBe(false);
    expect(isDomainActive({ ...ready, sslStatus: "active_pending" })).toBe(
      false,
    );
    expect(isDomainActive({ ...ready, dnsVerified: false })).toBe(false);
    expect(isDomainActive({ ...ready, organizationStatus: "suspended" })).toBe(
      false,
    );
    expect(isDomainActive({ ...ready, status: "dns_pending" })).toBe(false);
    expect(
      isDomainActive({
        ...ready,
        ownershipVerified: "true" as unknown as boolean,
      }),
    ).toBe(false);
  });
});

const resources: DomainResources = {
  events: [
    { id: "event-a", organizationId: "org-a", currentEditionId: "edition-a" },
    {
      id: "event-a-other",
      organizationId: "org-a",
      currentEditionId: "edition-a-other",
    },
    { id: "event-b", organizationId: "org-b", currentEditionId: "edition-b" },
  ],
  editions: [
    { id: "edition-a", eventId: "event-a", organizationId: "org-a" },
    {
      id: "edition-a-other",
      eventId: "event-a-other",
      organizationId: "org-a",
    },
    { id: "edition-b", eventId: "event-b", organizationId: "org-b" },
  ],
};

const bindingA: DomainBinding = {
  id: "binding-a",
  hostname: "a.example.test",
  organizationId: "org-a",
  destination: "FIXED_EDITION",
  destinationId: "edition-a",
  status: "active",
  ownershipVerified: true,
  hostnameStatus: "active",
  sslStatus: "active",
  dnsVerified: true,
  version: 7,
};
const bindingB: DomainBinding = {
  ...bindingA,
  id: "binding-b",
  hostname: "b.example.test",
  organizationId: "org-b",
  destinationId: "edition-b",
};

describe("explicit destination ownership", () => {
  it("resolves organization, event, current edition and fixed edition explicitly", () => {
    expect(
      assertDestinationOwnership(
        {
          ...bindingA,
          destination: "HOME_ORGANIZATION",
          destinationId: "org-a",
        },
        resources,
      ),
    ).toEqual({ organizationId: "org-a" });
    expect(
      assertDestinationOwnership(
        { ...bindingA, destination: "EVENT_HOME", destinationId: "event-a" },
        resources,
      ),
    ).toEqual({ organizationId: "org-a", eventId: "event-a" });
    expect(
      assertDestinationOwnership(
        {
          ...bindingA,
          destination: "CURRENT_EDITION",
          destinationId: "event-a",
        },
        resources,
      ),
    ).toEqual({
      organizationId: "org-a",
      eventId: "event-a",
      editionId: "edition-a",
    });
    expect(assertDestinationOwnership(bindingA, resources)).toEqual({
      organizationId: "org-a",
      eventId: "event-a",
      editionId: "edition-a",
    });
  });

  it("blocks tenant A pointing to an organization, event or edition owned by B", () => {
    for (const binding of [
      {
        ...bindingA,
        destination: "HOME_ORGANIZATION" as const,
        destinationId: "org-b",
      },
      {
        ...bindingA,
        destination: "EVENT_HOME" as const,
        destinationId: "event-b",
      },
      {
        ...bindingA,
        destination: "CURRENT_EDITION" as const,
        destinationId: "event-b",
      },
      { ...bindingA, destinationId: "edition-b" },
    ]) {
      expect(() => assertDestinationOwnership(binding, resources)).toThrow(
        DomainResolutionError,
      );
    }
  });

  it("rejects an edition with a foreign parent event despite forged org metadata", () => {
    expect(() =>
      assertDestinationOwnership(bindingA, {
        ...resources,
        editions: [
          { id: "edition-a", organizationId: "org-a", eventId: "event-b" },
        ],
      }),
    ).toThrow();
  });

  it("requires an explicit current edition from that same event", () => {
    const current = {
      ...bindingA,
      destination: "CURRENT_EDITION" as const,
      destinationId: "event-a",
    };
    expect(() =>
      assertDestinationOwnership(current, {
        ...resources,
        events: [
          {
            id: "event-a",
            organizationId: "org-a",
            currentEditionId: "edition-a-other",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      assertDestinationOwnership(current, {
        ...resources,
        events: [{ id: "event-a", organizationId: "org-a" }],
      }),
    ).toThrow();
  });
});

describe("exact public host resolution", () => {
  const base = {
    bindings: [bindingA, bindingB],
    organizations: [
      { id: "org-a", status: "active" },
      { id: "org-b", status: "active" },
    ],
    resources,
    reservedHosts: [
      "app.example.test",
      "preview.example.test",
      "api.example.test",
    ],
  };

  it("isolates tenant A and B and includes the binding version for cache scope", () => {
    expect(
      resolvePublicDomain({ ...base, hostname: "A.Example.TEST." }),
    ).toEqual({
      hostname: "a.example.test",
      organizationId: "org-a",
      eventId: "event-a",
      editionId: "edition-a",
      bindingId: "binding-a",
      bindingVersion: 7,
    });
    expect(
      resolvePublicDomain({ ...base, hostname: "b.example.test" })
        .organizationId,
    ).toBe("org-b");
  });

  it.each([
    "unknown.example.test",
    "a.example.test.attacker.test",
    "example.test",
  ])("has no default tenant or suffix fallback for %s", (hostname) =>
    expect(() => resolvePublicDomain({ ...base, hostname })).toThrow(),
  );

  it("never resolves reserved admin/preview/api hosts as public tenant bindings", () => {
    expect(() =>
      resolvePublicDomain({
        ...base,
        hostname: "app.example.test",
        bindings: [{ ...bindingA, hostname: "app.example.test" }],
      }),
    ).toThrow(DomainResolutionError);
  });

  it("rejects duplicate bindings, suspended orgs and stale DNS independently", () => {
    expect(() =>
      resolvePublicDomain({
        ...base,
        hostname: "a.example.test",
        bindings: [bindingA, bindingA],
      }),
    ).toThrow();
    expect(() =>
      resolvePublicDomain({
        ...base,
        hostname: "a.example.test",
        organizations: [{ id: "org-a", status: "suspended" }],
      }),
    ).toThrow();
    expect(() =>
      resolvePublicDomain({
        ...base,
        hostname: "a.example.test",
        bindings: [{ ...bindingA, dnsVerified: false }],
      }),
    ).toThrow();
  });
});
