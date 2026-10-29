import {
  expect,
  request,
  test,
  type APIRequestContext,
} from "@playwright/test";
import { setTimeout as delay } from "node:timers/promises";
import { starterContent, type ContentDocument } from "../../app/domain/content";
import type { OperationKind } from "../../app/domain/operations";

const origin = "http://localhost:5173";
const password = "TEST_ONLY-Local-2026!";
type Account =
  | "owner-a"
  | "owner-b"
  | "editor-a"
  | "reviewer-a"
  | "shared"
  | "plataforma"
  | "invitee";
const clients = new Map<Account, APIRequestContext>();
const setCookies = new Map<Account, string>();
const unique = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
test.describe.configure({ mode: "serial" });

interface Settings {
  id: string;
  name: string;
  timezone: string;
  revision: number;
  status: string;
}
interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  revision: number;
}
interface EventRow {
  id: string;
  name: string;
  slug: string;
}

function client(account: Account): APIRequestContext {
  const context = clients.get(account);
  if (!context) throw new Error(`Missing local test context: ${account}`);
  return context;
}

async function login(account: Account) {
  const context = await request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const response = await authPost(context, "/api/auth/sign-in/email", {
    email: `${account}@example.test`,
    password,
  });
  expect(
    response.status(),
    `Local seed login for ${account}: ${await response.text()}`,
  ).toBe(200);
  return { context, cookie: response.headers()["set-cookie"] ?? "" };
}

async function authPost(
  context: APIRequestContext,
  path: string,
  data: object,
) {
  for (let attempt = 0; ; attempt++) {
    const response = await context.post(path, { data });
    if (response.status() !== 429 || attempt >= 3) return response;
    // Exercise the real limiter and respect its window instead of changing it.
    const seconds = Number(response.headers()["retry-after"] ?? 10);
    await delay(
      Math.min(60, Math.max(1, Number.isFinite(seconds) ? seconds : 10)) *
        1000 +
        100,
    );
  }
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  for (const account of [
    "owner-a",
    "owner-b",
    "editor-a",
    "reviewer-a",
    "shared",
    "plataforma",
    "invitee",
  ] as const) {
    const signedIn = await login(account);
    clients.set(account, signedIn.context);
    setCookies.set(account, signedIn.cookie);
  }
});

test.afterAll(async () => {
  await Promise.all([...clients.values()].map((context) => context.dispose()));
});

test("health and public SSR expose no private user, membership or infrastructure data", async () => {
  const anonymous = await request.newContext({ baseURL: origin });
  try {
    const health = await anonymous.get("/healthz");
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    const page = await anonymous.get("/");
    expect(page.status()).toBe(200);
    const html = await page.text();
    expect(html).toContain("Grandes encontros.");
    expect(html).toContain("Uma gestão mais leve.");
    expect(html).not.toMatch(
      /owner-a@example|owner-b@example|BETTER_AUTH_SECRET|account-owner-a|member-a|Organizadora Aurora/,
    );
    expect(page.headers()["x-content-type-options"]).toBe("nosniff");
    expect(page.headers()["x-frame-options"]).toBe("DENY");
    expect(page.headers()["x-robots-tag"]).toContain("noindex");
    expect(page.headers()["x-request-id"]).toBeTruthy();
  } finally {
    await anonymous.dispose();
  }
});

test("anonymous and forged-session requests never gain administrative access", async () => {
  const anonymous = await request.newContext({ baseURL: origin });
  try {
    for (const path of [
      "/api/v1/me",
      "/api/v1/orgs/org-a/settings",
      "/api/v1/platform/organizations",
    ]) {
      expect((await anonymous.get(path)).status()).toBe(401);
    }
    const invalid = await anonymous.get("/api/v1/me", {
      headers: { Cookie: "better-auth.session_token=forged.invalid.signature" },
    });
    expect(invalid.status()).toBe(401);
    const session = await anonymous.get("/api/auth/get-session", {
      headers: { Cookie: "better-auth.session_token=forged.invalid.signature" },
    });
    expect(session.status()).toBe(200);
    expect(await session.json()).toBeNull();
  } finally {
    await anonymous.dispose();
  }
});

test("signup stays closed and incorrect credentials cannot produce a session", async () => {
  const anonymous = await request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  try {
    const signup = await authPost(anonymous, "/api/auth/sign-up/email", {
      name: "Untrusted signup",
      email: `${unique("signup")}@example.test`,
      password,
      role: "platform_owner",
    });
    expect([400, 403, 404]).toContain(signup.status());
    const invalid = await authPost(anonymous, "/api/auth/sign-in/email", {
      email: "owner-a@example.test",
      password: "TEST_ONLY-wrong-password!",
    });
    expect(invalid.status()).toBe(401);
    expect((await anonymous.get("/api/v1/me")).status()).toBe(401);
  } finally {
    await anonymous.dispose();
  }
});

test("session cookie is host-only, HttpOnly and SameSite; session survives subsequent Worker requests", async () => {
  const cookie = setCookies.get("owner-a") ?? "";
  expect(cookie).toMatch(/httponly/i);
  expect(cookie).toMatch(/samesite=lax/i);
  expect(cookie).not.toMatch(/;\s*domain=/i);
  const identity = await client("owner-a").get("/api/v1/me");
  expect(identity.status()).toBe(200);
  expect((await identity.json()).user.id).toBe("owner-a");
  expect(identity.headers()["cache-control"]).toContain("no-store");
  const refreshed = await client("owner-a").get("/api/auth/get-session");
  expect(refreshed.status()).toBe(200);
  expect((await refreshed.json()).user.id).toBe("owner-a");
});

test("tenant A and B API resources remain isolated under direct URL and ID tampering", async () => {
  const a = client("owner-a");
  const b = client("owner-b");
  expect((await (await a.get("/api/v1/orgs/org-a/settings")).json()).id).toBe(
    "org-a",
  );
  expect((await (await b.get("/api/v1/orgs/org-b/settings")).json()).id).toBe(
    "org-b",
  );
  const eventsA = (await (
    await a.get("/api/v1/orgs/org-a/events")
  ).json()) as EventRow[];
  const eventsB = (await (
    await b.get("/api/v1/orgs/org-b/events")
  ).json()) as EventRow[];
  expect(eventsA.map((row) => row.id)).toContain("event-a");
  expect(eventsA.map((row) => row.id)).not.toContain("event-b");
  expect(eventsB.map((row) => row.id)).toContain("event-b");
  expect(eventsB.map((row) => row.id)).not.toContain("event-a");
  for (const resource of ["settings", "events", "members"]) {
    const crossA = await a.get(`/api/v1/orgs/org-b/${resource}`);
    const crossB = await b.get(`/api/v1/orgs/org-a/${resource}`);
    expect(crossA.status()).toBe(403);
    expect(crossB.status()).toBe(403);
    expect(await crossA.text()).not.toContain("Horizonte");
    expect(await crossB.text()).not.toContain("Aurora");
  }
  expect(
    (await a.get("/api/v1/orgs/org-a/events/event-b/editions")).status(),
  ).toBe(404);
  expect(
    (
      await a.post("/api/v1/orgs/org-b/events", {
        data: { name: "Tamper", slug: unique("tamper") },
      })
    ).status(),
  ).toBe(403);
});

test("a shared identity selects either membership without merging event scopes", async () => {
  const shared = client("shared");
  const me = await shared.get("/api/v1/me/memberships");
  expect(me.status()).toBe(200);
  const data = await me.json();
  expect(
    data.memberships
      .map((row: { organization_id: string }) => row.organization_id)
      .sort(),
  ).toEqual(["org-a", "org-b"]);
  for (const suffix of ["a", "b"]) {
    const events = await shared.get(`/api/v1/orgs/org-${suffix}/events`);
    expect(events.status()).toBe(200);
    expect((await events.json()).map((row: EventRow) => row.id)).toEqual([
      `event-${suffix}`,
    ]);
    expect(
      (
        await shared.get(
          `/api/v1/orgs/org-${suffix}/events/event-${suffix}/editions`,
        )
      ).status(),
    ).toBe(200);
    expect(
      (
        await shared.post(`/api/v1/orgs/org-${suffix}/events`, {
          data: { name: "Denied", slug: unique("shared") },
        })
      ).status(),
    ).toBe(403);
  }
});

test("tenant invitation token is hashed, email bound, scoped, one-use and audited", async () => {
  const owner = client("owner-a");
  const created = await owner.post("/api/v1/orgs/org-a/invitations", {
    data: {
      email: "invitee@example.test",
      role: "content_editor",
      eventId: "event-a",
    },
  });
  expect(created.status()).toBe(201);
  const invite = (await created.json()) as {
    id: string;
    token: string;
    expiresAt: string;
  };
  expect(invite.token).toMatch(/^[a-f0-9]{64}$/);
  expect(new Date(invite.expiresAt).getTime()).toBeGreaterThan(Date.now());
  const list = await (await owner.get("/api/v1/orgs/org-a/invitations")).json();
  expect(list).toContainEqual(
    expect.objectContaining({
      id: invite.id,
      role: "content_editor",
      event_id: "event-a",
      accepted_at: null,
    }),
  );
  expect(JSON.stringify(list)).not.toContain(invite.token);
  expect((await owner.get("/api/v1/orgs/org-b/invitations")).status()).toBe(
    403,
  );
  expect(
    (
      await client("shared").post("/api/v1/orgs/org-a/invitations", {
        data: { email: "invitee@example.test", role: "organization_owner" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await client("shared").post("/api/v1/orgs/org-a/invitations/accept", {
        data: { token: invite.token },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await client("invitee").post("/api/v1/orgs/org-a/invitations/accept", {
        data: { token: invite.token },
      })
    ).status(),
  ).toBe(200);
  const memberships = await (
    await client("invitee").get("/api/v1/me/memberships")
  ).json();
  expect(memberships.memberships).toContainEqual(
    expect.objectContaining({
      organization_id: "org-a",
      role: "content_editor",
    }),
  );
  expect(
    (
      await client("invitee").get("/api/v1/orgs/org-a/events/event-a/editions")
    ).status(),
  ).toBe(200);
  expect(
    (
      await client("invitee").post("/api/v1/orgs/org-a/events", {
        data: { name: "Escalada", slug: unique("escalated") },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await client("invitee").post("/api/v1/orgs/org-a/invitations/accept", {
        data: { token: invite.token },
      })
    ).status(),
  ).toBe(404);
  const audit = await (
    await client("plataforma").get("/api/v1/platform/audit")
  ).json();
  expect(audit).toContainEqual(
    expect.objectContaining({
      organization_id: "org-a",
      actor_id: "invitee-local",
      action: "invitation.accepted",
      resource_id: invite.id,
    }),
  );
});

test("private media stays behind tenant and event authorization and public media needs a license", async () => {
  const owner = client("owner-a");
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b4944415478da6364f80f0001050101274175c40000000049454e44ae426082",
    "hex",
  );
  const base = "/api/v1/orgs/org-a/media";
  const upload = await owner.post(base, {
    data: png,
    headers: {
      "Content-Type": "image/png",
      "X-Media-Owner-Type": "event",
      "X-Media-Owner-Id": "event-a",
    },
  });
  expect(upload.status(), await upload.text()).toBe(201);
  const asset = (await upload.json()) as {
    id: string;
    mime: string;
    width: number;
    height: number;
  };
  expect(asset).toMatchObject({ mime: "image/png", width: 1, height: 1 });
  const privateRead = await client("editor-a").get(`${base}/${asset.id}`);
  expect(privateRead.status()).toBe(200);
  expect(privateRead.headers()["content-type"]).toContain("image/png");
  expect(privateRead.headers()["cache-control"]).toContain("no-store");
  expect(Buffer.from(await privateRead.body())).toEqual(png);
  expect(
    (
      await client("owner-b").get(`/api/v1/orgs/org-b/media/${asset.id}`)
    ).status(),
  ).toBe(404);

  const event = await owner.post("/api/v1/orgs/org-a/events", {
    data: { name: "Evento de escopo — fictício", slug: unique("scope") },
  });
  const { id: eventId } = (await event.json()) as { id: string };
  const edition = await owner.post(
    `/api/v1/orgs/org-a/events/${eventId}/editions`,
    {
      data: {
        name: "Edição privada",
        editionKey: unique("scope"),
        city: "Cidade fictícia",
        timeZone: "America/Sao_Paulo",
        startAt: "2027-06-12T12:00:00.000Z",
        endAt: "2027-06-12T22:00:00.000Z",
      },
    },
  );
  const { id: editionId } = (await edition.json()) as { id: string };
  expect(
    (
      await client("editor-a").post(base, {
        data: png,
        headers: {
          "Content-Type": "image/png",
          "X-Media-Owner-Type": "edition",
          "X-Media-Owner-Id": editionId,
        },
      })
    ).status(),
  ).toBe(403);

  const unlicensed = await owner.post(base, {
    data: png,
    headers: {
      "Content-Type": "image/png",
      "X-Media-Visibility": "public",
      "X-Media-Owner-Type": "organization",
      "X-Media-Owner-Id": "org-a",
    },
  });
  expect(unlicensed.status()).toBe(400);
});

test("editors and reviewers cannot escalate roles or create organization-wide events", async () => {
  for (const account of ["editor-a", "reviewer-a"] as const) {
    const scoped = client(account);
    expect(
      (await scoped.get("/api/v1/orgs/org-a/events/event-a/editions")).status(),
    ).toBe(200);
    expect((await scoped.get("/api/v1/orgs/org-a/members")).status()).toBe(403);
    expect(
      (
        await scoped.post("/api/v1/orgs/org-a/events", {
          data: { name: "Denied", slug: unique("staff") },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await scoped.patch(`/api/v1/orgs/org-a/members/member-${account}`, {
          data: { role: "organization_owner", status: "active", revision: 1 },
        })
      ).status(),
    ).toBe(403);
    expect((await scoped.get("/api/v1/platform/organizations")).status()).toBe(
      403,
    );
  }
});

test("Platform Owner can administer globally but cannot read private tenant data without membership", async () => {
  const platform = client("plataforma");
  const organizations = await platform.get("/api/v1/platform/organizations");
  expect(organizations.status()).toBe(200);
  expect(
    (await organizations.json()).map((row: { id: string }) => row.id),
  ).toEqual(expect.arrayContaining(["org-a", "org-b"]));
  expect((await platform.get("/api/v1/platform/audit")).status()).toBe(200);
  expect((await platform.get("/api/v1/orgs/org-a/settings")).status()).toBe(
    403,
  );
  expect((await platform.get("/api/v1/orgs/org-b/members")).status()).toBe(403);
  expect(
    (await client("owner-a").get("/api/v1/platform/organizations")).status(),
  ).toBe(403);
});

test("cookie-authenticated writes reject missing Origin, foreign Origin and cross-site fetches", async () => {
  const owner = client("owner-a");
  const noOrigin = await request.newContext({
    baseURL: origin,
    storageState: await owner.storageState(),
  });
  try {
    const payload = { name: "Cross site", slug: unique("csrf") };
    expect(
      (
        await noOrigin.post("/api/v1/orgs/org-a/events", { data: payload })
      ).status(),
    ).toBe(403);
    expect(
      (
        await owner.post("/api/v1/orgs/org-a/events", {
          data: payload,
          headers: { Origin: "https://attacker.example.test" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await owner.post("/api/v1/orgs/org-a/events", {
          data: payload,
          headers: { "Sec-Fetch-Site": "cross-site" },
        })
      ).status(),
    ).toBe(403);
    const events = (await (
      await owner.get("/api/v1/orgs/org-a/events")
    ).json()) as EventRow[];
    expect(events.some((event) => event.slug === payload.slug)).toBe(false);
  } finally {
    await noOrigin.dispose();
  }
});

test("strict input validation rejects forged ownership, SQL-shaped slugs and invalid timezones", async () => {
  const owner = client("owner-a");
  const settings = (await (
    await owner.get("/api/v1/orgs/org-a/settings")
  ).json()) as Settings;
  expect(
    (
      await owner.post("/api/v1/orgs/org-a/events", {
        data: { name: "Injected", slug: "';DROP TABLE events;--" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await owner.post("/api/v1/orgs/org-a/events", {
        data: {
          name: "Forged",
          slug: unique("forged"),
          organizationId: "org-b",
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await owner.patch("/api/v1/orgs/org-a/settings", {
        data: {
          name: settings.name,
          timezone: "Invalid/Timezone",
          revision: settings.revision,
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await owner.post("/api/v1/orgs/org-a/events", {
        data: "not-json",
        headers: { "Content-Type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await owner.post("/api/v1/orgs/org-a/events", { data: "name=wrong" })
    ).status(),
  ).toBe(415);
  expect((await owner.get("/api/v1/orgs/org-a/events")).status()).toBe(200);
});

test("event creation persists, scopes duplicate slugs per tenant and limits staff to assigned events", async () => {
  const slug = unique("persisted");
  const payload = { name: "Encontro persistido — somente teste", slug };
  const created = await client("owner-a").post("/api/v1/orgs/org-a/events", {
    data: payload,
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const after = (await (
    await client("owner-a").get("/api/v1/orgs/org-a/events")
  ).json()) as EventRow[];
  expect(after).toContainEqual(
    expect.objectContaining({ id, name: payload.name, slug }),
  );
  expect(
    (
      await client("owner-a").post("/api/v1/orgs/org-a/events", {
        data: payload,
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await client("owner-b").post("/api/v1/orgs/org-b/events", {
        data: payload,
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await client("editor-a").get(`/api/v1/orgs/org-a/events/${id}/editions`)
    ).status(),
  ).toBe(403);
  const editorEvents = (await (
    await client("editor-a").get("/api/v1/orgs/org-a/events")
  ).json()) as EventRow[];
  expect(editorEvents.map((row) => row.id)).not.toContain(id);
});

test("edition creation validates timing, timezone and external HTTPS ticket URLs", async () => {
  const owner = client("owner-a");
  const payload = {
    name: "Edição de integração fictícia",
    editionKey: unique("edition"),
    city: "Cidade fictícia",
    timeZone: "America/Sao_Paulo",
    startAt: "2027-06-12T12:00:00.000Z",
    endAt: "2027-06-12T22:00:00.000Z",
    externalTicketUrl: "https://tickets.example.test/event",
  };
  const created = await owner.post(
    "/api/v1/orgs/org-a/events/event-a/editions",
    { data: payload },
  );
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const rows = await (
    await owner.get("/api/v1/orgs/org-a/events/event-a/editions")
  ).json();
  expect(rows).toContainEqual(
    expect.objectContaining({
      id,
      organization_id: "org-a",
      event_id: "event-a",
      time_zone: payload.timeZone,
    }),
  );
  for (const invalid of [
    { ...payload, editionKey: unique("invalid"), endAt: payload.startAt },
    { ...payload, editionKey: unique("invalid"), timeZone: "Invalid/Zone" },
    {
      ...payload,
      editionKey: unique("invalid"),
      externalTicketUrl: "javascript:alert(1)",
    },
    {
      ...payload,
      editionKey: unique("invalid"),
      externalTicketUrl: "http://tickets.example.test",
    },
  ]) {
    expect(
      (
        await owner.post("/api/v1/orgs/org-a/events/event-a/editions", {
          data: invalid,
        })
      ).status(),
    ).toBe(400);
  }
  expect(
    (
      await owner.post("/api/v1/orgs/org-a/events/event-b/editions", {
        data: { ...payload, editionKey: unique("foreign") },
      })
    ).status(),
  ).toBe(404);
});

test("concurrent settings updates use compare-and-swap instead of losing an update", async () => {
  const owner = client("owner-a");
  const settings = (await (
    await owner.get("/api/v1/orgs/org-a/settings")
  ).json()) as Settings;
  const input = {
    name: settings.name,
    timezone: settings.timezone,
    revision: settings.revision,
  };
  const results = await Promise.all([
    owner.patch("/api/v1/orgs/org-a/settings", { data: input }),
    owner.patch("/api/v1/orgs/org-a/settings", { data: input }),
  ]);
  expect(results.map((response) => response.status()).sort()).toEqual([
    200, 409,
  ]);
  const after = (await (
    await owner.get("/api/v1/orgs/org-a/settings")
  ).json()) as Settings;
  expect(after.revision).toBe(settings.revision + 1);
  expect(after.name).toBe(settings.name);
});

test("last-owner guard preserves an active owner and membership revocation takes effect in the existing session", async () => {
  const owner = client("owner-a");
  const members = (await (
    await owner.get("/api/v1/orgs/org-a/members")
  ).json()) as Member[];
  const lastOwner = members.find((member) => member.id === "member-a")!;
  expect(lastOwner).toBeTruthy();
  const removeOwner = await owner.patch("/api/v1/orgs/org-a/members/member-a", {
    data: {
      role: "content_editor",
      status: "active",
      revision: lastOwner.revision,
    },
  });
  expect(removeOwner.status()).toBe(409);
  const editor = members.find((member) => member.user_id === "editor-a")!;
  expect(
    (await client("editor-a").get("/api/v1/orgs/org-a/settings")).status(),
  ).toBe(200);
  const revoked = await owner.patch(`/api/v1/orgs/org-a/members/${editor.id}`, {
    data: { role: editor.role, status: "revoked", revision: editor.revision },
  });
  expect(revoked.status()).toBe(200);
  try {
    expect(
      (await client("editor-a").get("/api/v1/orgs/org-a/settings")).status(),
    ).toBe(403);
    const me = await (
      await client("editor-a").get("/api/v1/me/memberships")
    ).json();
    expect(me.memberships).toHaveLength(0);
    expect(
      (await client("owner-b").get("/api/v1/orgs/org-b/settings")).status(),
    ).toBe(200);
  } finally {
    const current = (await (
      await owner.get("/api/v1/orgs/org-a/members")
    ).json()) as Member[];
    const row = current.find((member) => member.id === editor.id)!;
    expect(
      (
        await owner.patch(`/api/v1/orgs/org-a/members/${editor.id}`, {
          data: { role: editor.role, status: "active", revision: row.revision },
        })
      ).status(),
    ).toBe(200);
  }
  expect(
    (await client("editor-a").get("/api/v1/orgs/org-a/settings")).status(),
  ).toBe(200);
});

test("platform suspension immediately denies tenant access and reactivation preserves data", async () => {
  const platform = client("plataforma");
  const owner = client("owner-b");
  const before = await (await owner.get("/api/v1/orgs/org-b/events")).json();
  const orgs = (await (
    await platform.get("/api/v1/platform/organizations")
  ).json()) as Settings[];
  const org = orgs.find((row) => row.id === "org-b")!;
  expect(
    (
      await platform.patch("/api/v1/platform/organizations/org-b/status", {
        data: { status: "suspended", revision: org.revision },
      })
    ).status(),
  ).toBe(200);
  try {
    expect((await owner.get("/api/v1/orgs/org-b/settings")).status()).toBe(403);
    expect((await owner.get("/api/v1/orgs/org-b/events")).status()).toBe(403);
    expect(
      (await client("owner-a").get("/api/v1/orgs/org-a/events")).status(),
    ).toBe(200);
  } finally {
    const current = (await (
      await platform.get("/api/v1/platform/organizations")
    ).json()) as Settings[];
    const row = current.find((item) => item.id === "org-b")!;
    expect(
      (
        await platform.patch("/api/v1/platform/organizations/org-b/status", {
          data: { status: "active", revision: row.revision },
        })
      ).status(),
    ).toBe(200);
  }
  expect(await (await owner.get("/api/v1/orgs/org-b/events")).json()).toEqual(
    before,
  );
});

test("platform creation persists and critical mutations produce server audit records", async () => {
  const platform = client("plataforma");
  const payload = {
    name: "Organizadora de teste — fictícia",
    slug: unique("org-test"),
    timezone: "America/Sao_Paulo",
  };
  const created = await platform.post("/api/v1/platform/organizations", {
    data: payload,
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const orgs = await (
    await platform.get("/api/v1/platform/organizations")
  ).json();
  expect(orgs).toContainEqual(
    expect.objectContaining({
      id,
      name: payload.name,
      slug: payload.slug,
      status: "active",
    }),
  );
  const audit = await (await platform.get("/api/v1/platform/audit")).json();
  expect(audit).toContainEqual(
    expect.objectContaining({
      organization_id: id,
      actor_id: "platform-local",
      action: "organization.created",
      resource_id: id,
    }),
  );
  expect(audit).toContainEqual(
    expect.objectContaining({
      organization_id: "org-a",
      actor_id: "owner-a",
      action: "event.created",
    }),
  );
  expect(JSON.stringify(audit)).not.toMatch(
    /password|session_token|TEST_ONLY-Local/,
  );
});

test("sign-out revokes the server session so a captured cookie cannot be replayed", async () => {
  // This extra session is intentionally isolated from the suite's owner session.
  const { context } = await login("owner-b");
  const state = await context.storageState();
  const replay = await request.newContext({
    baseURL: origin,
    storageState: state,
    extraHTTPHeaders: { Origin: origin },
  });
  try {
    expect((await replay.get("/api/v1/me")).status()).toBe(200);
    expect(
      (await context.post("/api/auth/sign-out", { data: {} })).status(),
    ).toBe(200);
    expect((await context.get("/api/v1/me")).status()).toBe(401);
    expect((await replay.get("/api/v1/me")).status()).toBe(401);
    expect(await (await replay.get("/api/auth/get-session")).json()).toBeNull();
    expect((await client("owner-b").get("/api/v1/me")).status()).toBe(200);
  } finally {
    await context.dispose();
    await replay.dispose();
  }
});

test("CMS publishes immutable tenant snapshots, previews privately, and rolls back through verified hosts", async () => {
  const ownerA = client("owner-a");
  const ownerB = client("owner-b");
  const cmsA = "/api/v1/orgs/org-a/editions/edition-a";
  const cmsB = "/api/v1/orgs/org-b/editions/edition-b";
  const initialDraft = (await (await ownerA.get(`${cmsA}/draft`)).json()) as {
    revision: number;
  };
  const initialHistory = (await (
    await ownerA.get(`${cmsA}/revisions`)
  ).json()) as {
    current: { revision: number } | null;
  };
  const initialDraftRevision = initialDraft.revision;
  const initialPublicationRevision = initialHistory.current?.revision ?? 0;
  const initialDraftB = (await (await ownerB.get(`${cmsB}/draft`)).json()) as {
    revision: number;
  };
  const initialHistoryB = (await (
    await ownerB.get(`${cmsB}/revisions`)
  ).json()) as {
    current: { revision: number } | null;
  };
  const initialDraftRevisionB = initialDraftB.revision;
  const initialPublicationRevisionB = initialHistoryB.current?.revision ?? 0;
  const doc = (
    siteName: string,
    heroTitle: string,
    faqTitle: string,
    redirects: ContentDocument["redirects"] = [],
  ): ContentDocument => ({
    ...structuredClone(starterContent),
    siteName,
    title: `${siteName} — informações oficiais`,
    description: `Programação e informações de ${siteName}.`,
    redirects,
    pages: [
      {
        slug: "home",
        title: "Início",
        description: `Veja a próxima edição de ${siteName}.`,
        sections: [
          {
            type: "hero",
            title: heroTitle,
            subtitle: "Evento de demonstração fictício.",
          },
          {
            type: "text",
            title: "Sobre",
            body: "<script>window.__xss = true</script> texto literal seguro.",
          },
        ],
      },
      {
        slug: "faq",
        title: faqTitle,
        description: "Respostas às dúvidas comuns.",
        sections: [
          {
            type: "faq",
            title: faqTitle,
            items: [
              {
                question: "É real?",
                answer: "Não. Esta é uma fixture local sintética.",
              },
            ],
          },
        ],
      },
    ],
  });
  const publicGet = (path: string, hostname: string) =>
    ownerA.get(path, { headers: { Host: hostname }, maxRedirects: 0 });

  expect(
    (
      await ownerB.post(`${cmsA}/draft`, {
        data: { expectedRevision: 0, content: doc("Tenant B", "Falso", "FAQ") },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await ownerA.post(`${cmsA}/draft`, {
        data: {
          expectedRevision: initialDraftRevision,
          content: doc("A", "Sem licença", "FAQ", [
            { fromSlug: "antiga", toSlug: "faq" },
          ]),
        },
      })
    ).status(),
  ).toBe(201);

  const draftA = await ownerA.get(`${cmsA}/draft`);
  expect(draftA.status()).toBe(200);
  const privatePng = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b4944415478da6364f80f0001050101274175c40000000049454e44ae426082",
    "hex",
  );
  const uploaded = await ownerA.post("/api/v1/orgs/org-a/media", {
    data: privatePng,
    headers: {
      "Content-Type": "image/png",
      "X-Media-Owner-Type": "edition",
      "X-Media-Owner-Id": "edition-a",
    },
  });
  expect(uploaded.status(), await uploaded.text()).toBe(201);
  const privateAsset = (await uploaded.json()) as { id: string };
  const storedAsset = await ownerA.get(
    `/api/v1/orgs/org-a/media/${privateAsset.id}`,
  );
  expect(storedAsset.status()).toBe(200);
  expect(storedAsset.headers()["cache-control"]).toContain("no-store");
  expect(Buffer.from(await storedAsset.body())).toEqual(privatePng);
  const previewContent = doc(
    "Encontro Aurora",
    "V1 — primeira edição",
    "Dúvidas Aurora",
    [{ fromSlug: "antiga", toSlug: "faq", statusCode: 301 }],
  );
  previewContent.pages[0]!.sections = [
    {
      type: "hero",
      title: "V1 — primeira edição",
      subtitle: "Evento de demonstração fictício.",
      imageAssetId: privateAsset.id,
    },
    ...previewContent.pages[0]!.sections.slice(1),
  ];
  const savedA = await ownerA.post(`${cmsA}/draft`, {
    data: {
      expectedRevision: initialDraftRevision + 1,
      content: previewContent,
    },
  });
  expect(savedA.status(), await savedA.text()).toBe(201);
  const previewResponse = await ownerA.post(`${cmsA}/preview`, {
    data: { draftRevision: initialDraftRevision + 2 },
  });
  expect(previewResponse.status()).toBe(200);
  const preview = (await previewResponse.json()) as { url: string };
  const previewPage = await ownerA.get(preview.url);
  const previewHtml = await previewPage.text();
  expect(previewPage.status()).toBe(200);
  expect(previewPage.headers()["cache-control"]).toContain("no-store");
  expect(previewPage.headers()["x-robots-tag"]).toContain("noindex");
  expect(previewHtml).toContain("Prévia privada");
  expect(previewHtml).toContain("V1 — primeira edição");
  expect(previewHtml).toContain(
    `/preview/${preview.url.split("/").pop()}/assets/${privateAsset.id}`,
  );
  expect(previewHtml).not.toContain("<script>window.__xss = true</script>");
  const previewAsset = await ownerA.get(
    `${preview.url}/assets/${privateAsset.id}`,
  );
  expect(previewAsset.status()).toBe(200);
  expect(previewAsset.headers()["cache-control"]).toContain("no-store");
  expect(Buffer.from(await previewAsset.body())).toEqual(privatePng);

  const contentA = doc(
    "Encontro Aurora",
    "V1 — primeira edição",
    "Dúvidas Aurora",
    [{ fromSlug: "antiga", toSlug: "faq", statusCode: 301 }],
  );
  const publishedDraftA = await ownerA.post(`${cmsA}/draft`, {
    data: { expectedRevision: initialDraftRevision + 2, content: contentA },
  });
  expect(publishedDraftA.status()).toBe(201);

  const unlicensed = await ownerA.post(`${cmsA}/draft`, {
    data: {
      expectedRevision: initialDraftRevision + 3,
      content: {
        ...contentA,
        redirects: [],
        pages: [
          {
            ...contentA.pages[0]!,
            sections: [
              {
                type: "hero",
                title: "Imagem",
                imageAssetId: "missing-public-license",
              },
            ],
          },
        ],
      },
    },
  });
  expect(unlicensed.status()).toBe(201);
  const blockedPublish = await ownerA.post(`${cmsA}/publish`, {
    data: {
      draftRevision: initialDraftRevision + 4,
      expectedPublicationRevision: initialPublicationRevision,
    },
  });
  expect(blockedPublish.status()).toBe(400);

  const publishedA = await ownerA.post(`${cmsA}/publish`, {
    data: {
      draftRevision: initialDraftRevision + 3,
      expectedPublicationRevision: initialPublicationRevision,
    },
  });
  expect(publishedA.status(), await publishedA.text()).toBe(201);
  const v1 = (await publishedA.json()) as {
    publicationId: string;
    revision: number;
  };
  const hostA = "evento-a.example.test";
  const firstPublic = await publicGet("/", hostA);
  const firstHtml = await firstPublic.text();
  expect(firstPublic.status(), firstHtml).toBe(200);
  expect(firstPublic.headers()["x-robots-tag"]).toContain("index");
  expect(firstPublic.headers()["cache-control"]).toContain("max-age=60");
  expect(firstPublic.headers()["x-publication-revision"]).toBe(
    String(initialPublicationRevision + 1),
  );
  expect(firstHtml).toContain("V1 — primeira edição");
  expect(firstHtml).toContain(`<link rel="canonical" href="http://${hostA}/"`);
  expect(firstHtml).not.toContain("<script>window.__xss = true</script>");
  expect(firstHtml).toContain(
    "&lt;script&gt;window.__xss = true&lt;/script&gt;",
  );
  expect((await publicGet("/robots.txt", hostA)).status()).toBe(200);
  expect(await (await publicGet("/sitemap.xml", hostA)).text()).toContain(
    `http://${hostA}/faq`,
  );

  const stalePublish = await ownerA.post(`${cmsA}/publish`, {
    data: {
      draftRevision: initialDraftRevision + 3,
      expectedPublicationRevision: initialPublicationRevision,
    },
  });
  expect(stalePublish.status()).toBe(409);

  const contentA2 = doc(
    "Encontro Aurora",
    "V2 — atualização",
    "Dúvidas Aurora",
    [{ fromSlug: "antiga", toSlug: "faq", statusCode: 301 }],
  );
  const savedA2 = await ownerA.post(`${cmsA}/draft`, {
    data: { expectedRevision: initialDraftRevision + 4, content: contentA2 },
  });
  expect(savedA2.status()).toBe(201);
  const stillV1 = await publicGet("/", hostA);
  expect(await stillV1.text()).toContain("V1 — primeira edição");
  const publishedA2 = await ownerA.post(`${cmsA}/publish`, {
    data: {
      draftRevision: initialDraftRevision + 5,
      expectedPublicationRevision: initialPublicationRevision + 1,
    },
  });
  expect(publishedA2.status()).toBe(201);
  expect(await (await publicGet("/", hostA)).text()).toContain(
    "V2 — atualização",
  );
  const redirect = await publicGet("/antiga", hostA);
  expect(redirect.status()).toBe(301);
  expect(redirect.headers().location).toBe(`http://${hostA}/faq`);

  const savedB = await ownerB.post(`${cmsB}/draft`, {
    data: {
      expectedRevision: initialDraftRevisionB,
      content: doc("Encontro Horizonte", "Horizonte B1", "Dúvidas Horizonte"),
    },
  });
  expect(savedB.status()).toBe(201);
  const publishedB = await ownerB.post(`${cmsB}/publish`, {
    data: {
      draftRevision: initialDraftRevisionB + 1,
      expectedPublicationRevision: initialPublicationRevisionB,
    },
  });
  expect(publishedB.status()).toBe(201);
  const race = await Promise.all([
    ownerB.post(`${cmsB}/draft`, {
      data: {
        expectedRevision: initialDraftRevisionB + 1,
        content: doc(
          "Encontro Horizonte",
          "Horizonte B2-A",
          "Dúvidas Horizonte",
        ),
      },
    }),
    ownerB.post(`${cmsB}/draft`, {
      data: {
        expectedRevision: initialDraftRevisionB + 1,
        content: doc(
          "Encontro Horizonte",
          "Horizonte B2-B",
          "Dúvidas Horizonte",
        ),
      },
    }),
  ]);
  expect(race.map((response) => response.status()).sort()).toEqual([201, 409]);
  const publicB = await publicGet("/", "evento-b.example.test");
  const htmlB = await publicB.text();
  expect(publicB.status()).toBe(200);
  expect(htmlB).toContain("Horizonte B1");
  expect(htmlB).not.toContain("V2 — atualização");
  expect(await (await publicGet("/", hostA)).text()).toContain(
    "V2 — atualização",
  );
  expect((await publicGet("/", "nao-cadastrado.example.test")).status()).toBe(
    404,
  );
  expect((await publicGet("/admin", "evento-a.example.test")).status()).toBe(
    404,
  );

  const rollback = await ownerA.post(`${cmsA}/rollback`, {
    data: {
      targetPublicationId: v1.publicationId,
      expectedPublicationRevision: initialPublicationRevision + 2,
    },
  });
  expect(rollback.status(), await rollback.text()).toBe(201);
  expect(await (await publicGet("/", hostA)).text()).toContain(
    "V1 — primeira edição",
  );
  const history = await ownerA.get(`${cmsA}/revisions`);
  expect(history.status()).toBe(200);
  const entries = (await history.json()) as {
    publications: { rollback_of_id: string | null; revision: number }[];
    current: { revision: number };
  };
  expect(entries.current.revision).toBe(initialPublicationRevision + 3);
  expect(entries.publications).toContainEqual(
    expect.objectContaining({
      rollback_of_id: v1.publicationId,
      revision: initialPublicationRevision + 3,
    }),
  );
});

test("edition operations reject resource conflicts, isolate roles, and remain private until snapshot publication", async () => {
  const owner = client("owner-a");
  const base = "/api/v1/orgs/org-a/editions/edition-a";
  const current = (await (await owner.get(`${base}/draft`)).json()) as {
    revision: number;
  };
  const reset = await owner.post(`${base}/draft`, {
    data: {
      expectedRevision: current.revision,
      content: structuredClone(starterContent),
    },
  });
  expect(reset.status(), await reset.text()).toBe(201);
  let revision = ((await reset.json()) as { revision: number }).revision;
  const create = async (kind: OperationKind, data: Record<string, unknown>) => {
    const response = await owner.post(`${base}/${kind}`, {
      data: { expectedRevision: revision, data },
    });
    expect(response.status(), await response.text()).toBe(201);
    const saved = (await response.json()) as { id: string; revision: number };
    revision = saved.revision;
    return saved.id;
  };
  const stageA = await create("stages", { name: "Palco Aurora" });
  const stageB = await create("stages", { name: "Palco Horizonte" });
  const guest = await create("guests", {
    name: "Convidada sintética Aurora",
    description: "Perfil aprovado para o evento fictício.",
    status: "public",
  });
  await create("guests", { name: "NÃO PUBLICAR — perfil em preparação" });
  await create("exhibitors", {
    name: "Listagem sintética autorizada",
    status: "public",
    publicOptIn: true,
  });
  await create("exhibitors", {
    name: "NÃO PUBLICAR — sem consentimento",
    status: "public",
    publicOptIn: false,
  });
  await create("sponsors", {
    name: "Apoio sintético",
    status: "public",
    website: "https://example.test/apoio",
  });
  expect((await client("owner-b").get(`${base}/guests`)).status()).toBe(403);
  expect(
    (await owner.get("/api/v1/orgs/org-a/editions/edition-b/program")).status(),
  ).toBe(404);
  expect(
    (
      await client("editor-a").post(`${base}/stages`, {
        data: { expectedRevision: revision, data: { name: "Forjado" } },
      })
    ).status(),
  ).toBe(403);
  const activity = {
    title: "Abertura da edição sintética",
    stageId: stageA,
    startAt: "2027-06-12T12:00:00Z",
    endAt: "2027-06-12T13:00:00Z",
    guestIds: [guest],
    status: "public",
  };
  const itemId = await create("program", activity);
  const conflict = await owner.post(`${base}/program`, {
    data: {
      expectedRevision: revision,
      data: {
        ...activity,
        title: "Sobreposição",
        startAt: "2027-06-12T12:30:00Z",
        endAt: "2027-06-12T13:30:00Z",
      },
    },
  });
  expect(conflict.status()).toBe(400);
  expect(await conflict.text()).toContain("Conflito de palco");
  const guestConflict = await owner.post(`${base}/program`, {
    data: {
      expectedRevision: revision,
      data: { ...activity, stageId: stageB },
    },
  });
  expect(guestConflict.status()).toBe(400);
  expect(await guestConflict.text()).toContain("Conflito de convidado");
  await create("program", {
    ...activity,
    title: "Encontro no segundo palco",
    stageId: stageB,
    startAt: "2027-06-12T13:00:00Z",
    endAt: "2027-06-12T14:00:00Z",
  });
  for (const data of [
    { ...activity, stageId: "foreign-stage" },
    {
      ...activity,
      startAt: "2027-06-13T12:00:00Z",
      endAt: "2027-06-13T13:00:00Z",
    },
  ])
    expect(
      (
        await owner.post(`${base}/program`, {
          data: { expectedRevision: revision, data },
        })
      ).status(),
    ).toBe(400);
  expect(
    (
      await owner.post(`${base}/sponsors`, {
        data: {
          expectedRevision: revision,
          data: { name: "URL maliciosa", website: "javascript:alert(1)" },
        },
      })
    ).status(),
  ).toBe(400);
  const doc = (await (await owner.get(`${base}/draft`)).json()) as {
    revision: number;
    content: ContentDocument;
  };
  doc.content.operations.stages.push({
    id: "forged",
    name: "Escalada",
    accessibility: "",
  });
  expect(
    (
      await client("editor-a").post(`${base}/draft`, {
        data: { expectedRevision: revision, content: doc.content },
      })
    ).status(),
  ).toBe(403);
  const history = (await (await owner.get(`${base}/revisions`)).json()) as {
    current: { revision: number } | null;
  };
  let pubRevision = history.current?.revision ?? 0;
  const publish = async () => {
    const response = await owner.post(`${base}/publish`, {
      data: {
        draftRevision: revision,
        expectedPublicationRevision: pubRevision,
      },
    });
    expect(response.status(), await response.text()).toBe(201);
    const pub = (await response.json()) as {
      publicationId: string;
      revision: number;
    };
    pubRevision = pub.revision;
    return pub.publicationId;
  };
  const publicGet = (path: string) =>
    owner.get(path, { headers: { Host: "evento-a.example.test" } });
  const first = await publish();
  const agenda = await publicGet("/programacao");
  expect(agenda.status()).toBe(200);
  expect(await agenda.text()).toContain(activity.title);
  const filtered = await publicGet(`/programacao?stage=${stageA}`);
  const filteredHtml = await filtered.text();
  expect(filteredHtml).toContain(activity.title);
  expect(filteredHtml).not.toContain("<h2>Encontro no segundo palco</h2>");
  const guestHtml = await (await publicGet("/convidados")).text();
  expect(guestHtml).toContain("Convidada sintética Aurora");
  expect(guestHtml).not.toContain("NÃO PUBLICAR");
  const exhibitorHtml = await (await publicGet("/expositores")).text();
  expect(exhibitorHtml).toContain("Listagem sintética autorizada");
  expect(exhibitorHtml).not.toContain("sem consentimento");
  expect(await (await publicGet("/sitemap.xml")).text()).toContain(
    "/programacao",
  );
  const modified = await owner.patch(`${base}/program/${itemId}`, {
    data: {
      expectedRevision: revision,
      data: { ...activity, title: "Título atualizado no rascunho" },
    },
  });
  expect(modified.status(), await modified.text()).toBe(200);
  revision = ((await modified.json()) as { revision: number }).revision;
  expect(await (await publicGet("/programacao")).text()).not.toContain(
    "Título atualizado no rascunho",
  );
  await publish();
  expect(await (await publicGet("/programacao")).text()).toContain(
    "Título atualizado no rascunho",
  );
  const rollback = await owner.post(`${base}/rollback`, {
    data: {
      targetPublicationId: first,
      expectedPublicationRevision: pubRevision,
    },
  });
  expect(rollback.status()).toBe(201);
  expect(await (await publicGet("/programacao")).text()).toContain(
    activity.title,
  );
  const concurrent = await Promise.all(
    ["Palco C", "Palco D"].map((name) =>
      owner.post(`${base}/stages`, {
        data: { expectedRevision: revision, data: { name } },
      }),
    ),
  );
  expect(concurrent.map((r) => r.status()).sort()).toEqual([201, 409]);
});


test("F7: domain requests are owner-only, tenant-bound and versioned in D1", async () => {
  const owner = client("owner-a");
  const other = client("owner-b");
  const editor = client("editor-a");
  const a = "/api/v1/orgs/org-a/domains";
  const b = "/api/v1/orgs/org-b/domains";
  const hostname = `festival-${crypto.randomUUID()}.example.test`;
  const payload = { hostname: hostname.toUpperCase(), editionId: "edition-a" };

  expect((await editor.post(a, { data: payload })).status()).toBe(403);
  expect((await owner.post(a, { data: {
    hostname: "localhost", editionId: "edition-a",
  } })).status()).toBe(400);
  expect((await owner.post(a, { data: {
    hostname, editionId: "edition-b",
  } })).status()).toBe(404);

  const created = await owner.post(a, { data: payload });
  expect(created.status(), await created.text()).toBe(201);
  const record = await created.json() as { id: string; status: string; version: number };
  expect(record).toMatchObject({ status: "requested", version: 1 });
  const detail = await owner.get(`${a}/${record.id}`);
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({
    hostname, status: "requested",
    ownershipVerified: false, sslStatus: null,
    hostnameStatus: null, dnsVerified: false,
  });
  expect((await other.get(`${b}/${record.id}`)).status()).toBe(404);
  expect((await other.post(b, { data: {
    hostname, editionId: "edition-b",
  } })).status()).toBe(409);

  const suspended = await owner.patch(`${a}/${record.id}`, {
    data: { operation: "suspend", revision: 1 },
  });
  expect(suspended.status(), await suspended.text()).toBe(200);
  expect(await suspended.json()).toMatchObject({ status: "suspended", version: 2 });
  expect((await owner.patch(`${a}/${record.id}`, {
    data: { operation: "retry", revision: 1 },
  })).status()).toBe(409);
  const retried = await owner.patch(`${a}/${record.id}`, {
    data: { operation: "retry", revision: 2 },
  });
  expect(retried.status(), await retried.text()).toBe(200);
  expect(await retried.json()).toMatchObject({ status: "requested", version: 3 });
  const released = await owner.patch(`${a}/${record.id}`, {
    data: { operation: "release", revision: 3 },
  });
  expect(released.status(), await released.text()).toBe(200);
  expect(await released.json()).toMatchObject({ status: "released", version: 4 });
  expect((await owner.post(a, { data: payload })).status()).toBe(409);
  const listed = await owner.get(a);
  expect(listed.status()).toBe(200);
  expect((await listed.json() as { id: string }[])
    .some((item) => item.id === record.id)).toBe(true);
});
