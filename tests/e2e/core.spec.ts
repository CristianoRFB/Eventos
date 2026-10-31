import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { setTimeout as delay } from "node:timers/promises";
import type { ContentDocument } from "../../app/domain/content";

const password = "TEST_ONLY-Local-2026!";

test("edition operations editor saves and public snapshot is navigable without admin cookies", async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await signIn(page, "owner-a");
  const base = "/api/v1/orgs/org-a/editions/edition-a";
  await page.goto("/admin/org-a/events/event-a/editions/edition-a/operations");
  await expect(
    page.getByRole("heading", {
      name: "Programação e participantes",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Cadastro", { exact: true }).selectOption("stages");
  await page
    .getByLabel("Nome", { exact: true })
    .fill(`Palco da interface ${testInfo.project.name}`);
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith(`${base}/stages`) && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Salvar no rascunho", exact: true })
    .click();
  expect((await saved).status()).toBe(201);
  await expect(page.getByLabel("Cadastro", { exact: true })).toHaveValue(
    "program",
  );
  await page.getByLabel("Cadastro", { exact: true }).selectOption("stages");
  await expect(
    page.getByRole("heading", {
      name: `Palco da interface ${testInfo.project.name}`,
      exact: true,
    }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await screenshot(page, testInfo, "operations-editor");

  const draft = (await (await page.request.get(`${base}/draft`)).json()) as {
    revision: number;
    content: ContentDocument;
  };
  draft.content.operations = {
    stages: [
      {
        id: "e2e-stage",
        name: "Palco sintético principal",
        accessibility: "Acesso sem degraus — demonstração",
      },
    ],
    guests: [
      {
        id: "e2e-guest",
        name: "Convidada de demonstração",
        description: "Perfil fictício aprovado",
        website: "",
        status: "public",
      },
    ],
    program: [
      {
        id: "e2e-program",
        title: "Conversa de demonstração",
        description: "Atividade fictícia",
        stageId: "e2e-stage",
        startAt: "2027-06-12T15:00:00.000Z",
        endAt: "2027-06-12T16:00:00.000Z",
        guestIds: ["e2e-guest"],
        status: "public",
      },
    ],
    exhibitors: [],
    sponsors: [],
  };
  const save = await page.request.post(`${base}/draft`, {
    headers: { Origin: "http://localhost:5173" },
    data: { expectedRevision: draft.revision, content: draft.content },
  });
  expect(save.status(), await save.text()).toBe(201);
  const { revision } = (await save.json()) as { revision: number };
  const history = (await (
    await page.request.get(`${base}/revisions`)
  ).json()) as { current: { revision: number } | null };
  const publish = await page.request.post(`${base}/publish`, {
    headers: { Origin: "http://localhost:5173" },
    data: {
      draftRevision: revision,
      expectedPublicationRevision: history.current?.revision ?? 0,
    },
  });
  expect(publish.status(), await publish.text()).toBe(201);

  await page.goto("http://evento-a.example.test:5173/programacao");
  await expect(
    page.getByRole("heading", {
      name: "Conversa de demonstração",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Convidada de demonstração", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Palco", { exact: true }).selectOption("e2e-stage");
  await page.getByRole("button", { name: "Filtrar programação" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Conversa de demonstração",
      exact: true,
    }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(
    await page.context().cookies("http://evento-a.example.test:5173"),
  ).toHaveLength(0);
  await screenshot(page, testInfo, "published-program");
  await page.getByRole("link", { name: "Convidados", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Convidada de demonstração",
      exact: true,
    }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await screenshot(page, testInfo, "published-guests");
  await page.getByRole("link", { name: "Início", exact: true }).click();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://evento-a.example.test:5173/",
  );
  expect(browserErrors).toEqual([]);
  const forbidden = await page.goto(
    "http://evento-a.example.test:5173/admin/org-a",
  );
  expect(forbidden?.status()).toBe(404);
});

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    path: testInfo.outputPath(`${name}-${testInfo.project.name}.png`),
    fullPage: true,
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

async function signIn(page: Page, account: string) {
  await page.goto("/login");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(`${account}@example.test`);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  for (let attempt = 0; ; attempt++) {
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/sign-in/email"),
    );
    await page.getByRole("button", { name: "Entrar no painel ↗" }).click();
    const response = await responsePromise;
    if (response.status() !== 429 || attempt >= 3) {
      expect(response.status()).toBe(200);
      break;
    }
    const seconds = Number(response.headers()["retry-after"] ?? 10);
    await delay(
      Math.min(30, Math.max(1, Number.isFinite(seconds) ? seconds : 10)) *
        1000 +
        100,
    );
  }
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Suas organizadoras." }),
  ).toBeVisible();
}

test("public SSR and sign-in remain readable and keyboard-accessible at this viewport", async ({
  page,
}, testInfo) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Grandes encontros.",
  );
  await expect(
    page.getByText(
      "Ambiente de desenvolvimento • dados de demonstração fictícios",
    ),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await screenshot(page, testInfo, "public");
  await page.getByRole("link", { name: "Acessar painel ↗" }).click();
  await expect(
    page.getByRole("heading", { name: "Bom ter você de volta." }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveAttribute(
    "autocomplete",
    "username",
  );
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await page.getByLabel("E-mail", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();
  await expectNoHorizontalOverflow(page);
  await screenshot(page, testInfo, "login");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("owner signs in, creates a persisted event, cannot access tenant B and signs out", async ({
  page,
}, testInfo) => {
  await signIn(page, "owner-a");
  await expect(
    page.getByRole("heading", { name: "Organizadora Aurora — fictícia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Organizadora Horizonte — fictícia" }),
  ).toHaveCount(0);
  await screenshot(page, testInfo, "organization-chooser");
  await page.getByRole("link", { name: /Organizadora Aurora/ }).click();
  await expect(
    page.getByRole("heading", { name: "Vamos ao próximo encontro." }),
  ).toBeVisible();
  const unique = `${testInfo.project.name}-${Date.now().toString(36)}`;
  const name = `Encontro ${unique} — fictício`;
  await page.getByLabel("Nome do evento", { exact: true }).fill(name);
  await page.getByLabel("Identificador", { exact: true }).fill(`e2e-${unique}`);
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/orgs/org-a/events") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Criar evento ↗" }).click();
  expect((await created).status()).toBe(201);
  await expect(
    page.getByRole("heading", { name: new RegExp(`${name} ↗$`) }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: new RegExp(`${name} ↗$`) }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await screenshot(page, testInfo, "organization");
  const foreign = await page.goto("/admin/org-b");
  expect(foreign?.status()).toBe(403);
  await expect(
    page.getByText("Encontro B — fictício", { exact: true }),
  ).toHaveCount(0);
  await screenshot(page, testInfo, "tenant-access-denied");
  await page.goto("/admin/org-a");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
  await page.goto("/admin/org-a");
  await expect(page).toHaveURL(/\/login$/);
});

test("one shared identity switches between two organizers without seeing unassigned events", async ({
  page,
}, testInfo) => {
  await signIn(page, "shared");
  await expect(
    page.getByRole("heading", { name: "Organizadora Aurora — fictícia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Organizadora Horizonte — fictícia" }),
  ).toBeVisible();
  await screenshot(page, testInfo, "two-memberships");
  await page.getByRole("link", { name: /Organizadora Aurora/ }).click();
  await expect(
    page.getByRole("heading", { name: "Encontro A — fictício ↗", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Criar um evento", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: /Minhas organizadoras/ }).click();
  await page.getByRole("link", { name: /Organizadora Horizonte/ }).click();
  await expect(
    page.getByRole("heading", { name: "Encontro B — fictício ↗", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Encontro A — fictício ↗", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await screenshot(page, testInfo, "tenant-b");
});

test("CMS editor exposes private preview and revision history at this viewport", async ({
  page,
}, testInfo) => {
  await signIn(page, "owner-a");
  await page.getByRole("link", { name: /Organizadora Aurora/ }).click();
  await page.getByRole("link", { name: /Encontro A — fictício/ }).click();
  await page
    .locator('a[href="/admin/org-a/events/event-a/editions/edition-a/cms"]')
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Conteúdo: Encontro A — edição fictícia 2027",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Nome do site")).toBeVisible();
  await expect(page.getByLabel("Destaque principal")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Histórico publicado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Publicar versão/ }),
  ).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  await screenshot(page, testInfo, "cms-editor");

  const previewResponse = page.waitForResponse((response) =>
    response.url().includes("/api/v1/orgs/org-a/editions/edition-a/preview"),
  );
  await page.getByRole("button", { name: "Abrir prévia privada" }).click();
  expect((await previewResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/preview\//);
  await expect(
    page.getByText(/Prévia privada · Organizadora Aurora/),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow",
  );
  await expectNoHorizontalOverflow(page);
  await screenshot(page, testInfo, "cms-preview");
});

test("platform owner sees global organizations and private tenant access stays denied", async ({
  page,
}, testInfo) => {
  await signIn(page, "plataforma");
  await page.getByRole("link", { name: "Administrar plataforma ↗" }).click();
  await expect(
    page.getByRole("heading", { name: "Cada organizadora, seu espaço." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Organizadora Aurora — fictícia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Organizadora Horizonte — fictícia" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await screenshot(page, testInfo, "platform");
  const denied = await page.goto("/admin/org-a");
  expect(denied?.status()).toBe(403);
  await expect(
    page.getByText("Encontro A — fictício", { exact: true }),
  ).toHaveCount(0);
});


test("F3 cloned edition is created from the dashboard with new dates and no horizontal overflow", async ({
  page,
}, testInfo) => {
  await signIn(page, "owner-a");
  await page.goto("/admin/org-a/events/event-a");
  const details = page.locator("details").filter({
    has: page.getByText("Preparar nova edição a partir desta"),
  }).first();
  await details.locator("summary").click();
  const name = `Nova edição UI ${testInfo.project.name} ${Date.now()}`;
  const key = `ui-clone-${testInfo.project.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${Date.now()}`;
  await details.getByLabel("Nome da nova edição").fill(name);
  await details.getByLabel("Identificador único").fill(key);
  await details.getByLabel("Início da nova edição (UTC)").fill("2028-07-10T10:00");
  await details.getByLabel("Término da nova edição (UTC)").fill("2028-07-11T20:00");
  const created = page.waitForResponse((response) =>
    response.url().endsWith("/clone") && response.request().method() === "POST",
  );
  await details.getByRole("button", { name: "Criar nova edição em rascunho" }).click();
  expect((await created).status()).toBe(201);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
