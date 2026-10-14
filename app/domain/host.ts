/** Hosts are routing identifiers, never evidence of tenant membership. */
export interface HostNormalizationOptions {
  /** Development only: ports are accepted on reserved local/test hosts. */
  allowLocalPort?: boolean;
  allowedPorts?: readonly number[];
}

export class HostValidationError extends Error {
  readonly status = 421;

  constructor() {
    super("Invalid request hostname");
    this.name = "HostValidationError";
  }
}

function invalidHost(): never {
  throw new HostValidationError();
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".test") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

/**
 * Normalize an authority received from a trusted request boundary. This accepts
 * a hostname, not a URL or a visitor-provided forwarding header. WHATWG URL
 * performs IDNA conversion on Workers and browsers without a Node dependency.
 */
export function normalizeHostname(
  input: string,
  options: HostNormalizationOptions = {},
): string {
  if (
    typeof input !== "string" ||
    input.length === 0 ||
    input.length > 1024 ||
    // eslint-disable-next-line no-control-regex -- Control bytes must be rejected at the host trust boundary.
    /[\s\u0000-\u001f\u007f-\u009f/\\@%?#"'<>]/u.test(input)
  ) {
    return invalidHost();
  }

  let host = input;
  let port: string | undefined;
  if (input.startsWith("[")) {
    const match = /^\[::1\](?::([0-9]{1,5}))?$/u.exec(input);
    if (!match || !options.allowLocalPort) return invalidHost();
    host = "[::1]";
    port = match[1];
  } else if (input.includes(":")) {
    const match = /^([^:]+):([0-9]{1,5})$/u.exec(input);
    if (!match) return invalidHost();
    host = match[1];
    port = match[2];
  }

  // One trailing root dot is valid DNS syntax; extra dots are malformed.
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (!host || host.endsWith(".") || host.startsWith(".")) return invalidHost();

  let normalized: string;
  try {
    const parsed = new URL(`https://${host}/`);
    if (
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return invalidHost();
    }
    normalized = parsed.hostname.toLowerCase();
  } catch {
    return invalidHost();
  }

  // The IDNA mapper can translate Unicode dot characters into a root dot.
  if (normalized.endsWith(".")) normalized = normalized.slice(0, -1);
  if (normalized !== "[::1]") {
    if (normalized.length > 253 || normalized.length === 0)
      return invalidHost();
    const labels = normalized.split(".");
    if (
      labels.some(
        (label) =>
          label.length === 0 ||
          label.length > 63 ||
          !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label),
      )
    ) {
      return invalidHost();
    }
    // WHATWG accepts shorthand, octal and hex IPs. None are tenant domains.
    if (/^[0-9.]+$/u.test(normalized)) {
      if (
        !options.allowLocalPort ||
        host !== "127.0.0.1" ||
        normalized !== "127.0.0.1"
      ) {
        return invalidHost();
      }
    }
    if (labels.length < 2 && normalized !== "localhost") return invalidHost();
  }

  if (port !== undefined) {
    const number = Number(port);
    if (
      !options.allowLocalPort ||
      !isLocalHostname(normalized) ||
      number < 1 ||
      number > 65535 ||
      String(number) !== port ||
      (options.allowedPorts !== undefined &&
        !options.allowedPorts.includes(number))
    ) {
      return invalidHost();
    }
  }
  return normalized;
}

export type DomainStatus =
  | "requested"
  | "ownership_pending"
  | "tls_pending"
  | "dns_pending"
  | "active"
  | "suspended"
  | "releasing"
  | "released"
  | "failed";

export interface DomainActivationState {
  status: DomainStatus;
  ownershipVerified: boolean;
  hostnameStatus: string | null;
  sslStatus: string | null;
  dnsVerified: boolean;
  organizationStatus: string;
}

/** Provider hostname state, certificate state and DNS are separate gates. */
export function deriveDomainStatus(state: DomainActivationState): DomainStatus {
  // Explicit administrative/terminal states require an audited retry/reactivate.
  if (["suspended", "releasing", "released", "failed"].includes(state.status)) {
    return state.status;
  }
  if (state.organizationStatus !== "active") return "suspended";
  if (state.ownershipVerified !== true) return "ownership_pending";
  if (state.hostnameStatus !== "active" || state.sslStatus !== "active") {
    return "tls_pending";
  }
  if (state.dnsVerified !== true) return "dns_pending";
  return "active";
}

/** Read-time guard never promotes a pending stored binding automatically. */
export function isDomainActive(state: DomainActivationState): boolean {
  return state.status === "active" && deriveDomainStatus(state) === "active";
}

export type DomainDestination =
  "HOME_ORGANIZATION" | "EVENT_HOME" | "CURRENT_EDITION" | "FIXED_EDITION";

export interface DomainBinding extends Omit<
  DomainActivationState,
  "organizationStatus"
> {
  id: string;
  hostname: string;
  organizationId: string;
  destination: DomainDestination;
  destinationId: string;
  version: number;
}

export interface DomainResources {
  events: readonly {
    id: string;
    organizationId: string;
    currentEditionId?: string | null;
  }[];
  editions: readonly { id: string; organizationId: string; eventId: string }[];
}

export interface DestinationContext {
  organizationId: string;
  eventId?: string;
  editionId?: string;
}

export class DomainResolutionError extends Error {
  constructor(
    readonly status: 404 | 421 | 503,
    readonly code:
      | "UNKNOWN_HOST"
      | "RESERVED_HOST"
      | "DOMAIN_UNAVAILABLE"
      | "INVALID_DESTINATION",
  ) {
    super("This hostname is unavailable");
    this.name = "DomainResolutionError";
  }
}

function invalidDestination(): never {
  throw new DomainResolutionError(404, "INVALID_DESTINATION");
}

/** Require ownership of the complete event/edition chain, not just an ID match. */
export function assertDestinationOwnership(
  binding: Pick<
    DomainBinding,
    "organizationId" | "destination" | "destinationId"
  >,
  resources: DomainResources,
): DestinationContext {
  const organizationId = binding.organizationId;
  if (!organizationId || !binding.destinationId) return invalidDestination();
  if (binding.destination === "HOME_ORGANIZATION") {
    if (binding.destinationId !== organizationId) return invalidDestination();
    return { organizationId };
  }
  if (binding.destination === "FIXED_EDITION") {
    const editions = resources.editions.filter(
      (edition) =>
        edition.id === binding.destinationId &&
        edition.organizationId === organizationId,
    );
    if (editions.length !== 1) return invalidDestination();
    const edition = editions[0];
    const events = resources.events.filter(
      (event) =>
        event.id === edition.eventId && event.organizationId === organizationId,
    );
    if (events.length !== 1) return invalidDestination();
    return { organizationId, eventId: edition.eventId, editionId: edition.id };
  }
  if (
    binding.destination !== "EVENT_HOME" &&
    binding.destination !== "CURRENT_EDITION"
  ) {
    return invalidDestination();
  }
  const events = resources.events.filter(
    (event) =>
      event.id === binding.destinationId &&
      event.organizationId === organizationId,
  );
  if (events.length !== 1) return invalidDestination();
  const event = events[0];
  if (binding.destination === "EVENT_HOME")
    return { organizationId, eventId: event.id };
  const editions = resources.editions.filter(
    (edition) =>
      edition.id === event.currentEditionId &&
      edition.organizationId === organizationId &&
      edition.eventId === event.id,
  );
  if (editions.length !== 1) return invalidDestination();
  return { organizationId, eventId: event.id, editionId: editions[0].id };
}

export function resolvePublicDomain(input: {
  hostname: string;
  bindings: readonly DomainBinding[];
  organizations: readonly { id: string; status: string }[];
  resources: DomainResources;
  reservedHosts?: readonly string[];
  normalizeOptions?: HostNormalizationOptions;
}): DestinationContext & {
  hostname: string;
  bindingId: string;
  bindingVersion: number;
} {
  const hostname = normalizeHostname(input.hostname, input.normalizeOptions);
  if (
    input.reservedHosts?.some(
      (reserved) =>
        normalizeHostname(reserved, input.normalizeOptions) === hostname,
    )
  ) {
    throw new DomainResolutionError(421, "RESERVED_HOST");
  }
  const matches = input.bindings.filter(
    (binding) => binding.hostname === hostname,
  );
  if (matches.length !== 1)
    throw new DomainResolutionError(404, "UNKNOWN_HOST");
  const binding = matches[0];
  const organizations = input.organizations.filter(
    (org) => org.id === binding.organizationId,
  );
  if (
    organizations.length !== 1 ||
    !isDomainActive({ ...binding, organizationStatus: organizations[0].status })
  ) {
    throw new DomainResolutionError(503, "DOMAIN_UNAVAILABLE");
  }
  const destination = assertDestinationOwnership(binding, input.resources);
  return {
    ...destination,
    hostname,
    bindingId: binding.id,
    bindingVersion: binding.version,
  };
}
