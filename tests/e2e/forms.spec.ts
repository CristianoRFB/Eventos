import { test, expect, type Page } from "@playwright/test";
import { setTimeout as delay } from "node:timers/promises";
import type { ContentDocument } from "../../app/domain/content";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("owner-a@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("TEST_ONLY-Local-2026!");
  for (let attempt = 0; attempt < 4; attempt++) {
    const pending = page.waitForResponse((r) =>
      r.url().endsWith("/api/auth/sign-in/email"),
    );
    await page.getByRole("button", { name: "Entrar no painel ↗" }).click();
    const response = await pending;
    if (response.status() !== 429) {
      expect(response.status()).toBe(200);
      break;
    }
    await delay(
      Math.min(
        30,
        Math.max(1, Number(response.headers()["retry-after"] ?? 10)),
      ) *
        1000 +
        100,
    );
  }
  await expect(page).toHaveURL(/\/admin$/);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
test("organizer builds and publishes a form, applicant submits privately, reviewer stages only consented profile", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  await signIn(page);
  const base = "/api/v1/orgs/org-a/editions/edition-a";
  const current = (await (await page.request.get(`${base}/draft`)).json()) as {
    revision: number;
    content: ContentDocument;
  };
  current.content.forms = [];
  const prepared = await page.request.post(`${base}/draft`, {
    headers: { Origin: "http://localhost:5173" },
    data: { expectedRevision: current.revision, content: current.content },
  });
  expect(prepared.status(), await prepared.text()).toBe(201);
  const adminPath = "/admin/org-a/events/event-a/editions/edition-a";
  await page.goto(`${adminPath}/forms`);
  const formName = `Candidatura fictícia ${testInfo.project.name} ${Date.now()}`;
  await page.getByLabel("Nome do formulário", { exact: true }).fill(formName);
  await page.getByLabel("Retenção em dias", { exact: true }).fill("30");
  await page
    .getByLabel("Aviso de privacidade e finalidade", { exact: true })
    .fill(
      "Ensaio local com dados fictícios. As respostas servem exclusivamente à análise desta candidatura, sem envio de mensagens.",
    );
  const consent =
    "Aceito a análise privada dos dados desta candidatura fictícia";
  await page
    .getByLabel("Texto do aceite de privacidade", { exact: true })
    .fill(consent);
  await page
    .getByRole("button", { name: "Adicionar pergunta", exact: true })
    .click();
  await page
    .getByLabel("Pergunta 2", { exact: true })
    .fill("Categoria do projeto");
  await page
    .getByLabel("Tipo da pergunta 2", { exact: true })
    .selectOption("category");
  await page
    .getByLabel("Categorias (uma por linha)", { exact: true })
    .fill("Arte\nLivros");
  const created = page.waitForResponse(
    (r) => r.url().endsWith(`${base}/forms`) && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Salvar versão do formulário", exact: true })
    .click();
  const creation = await created;
  expect(creation.status()).toBe(201);
  await expect(page).toHaveURL(/\?form=/);
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath(`form-builder-${testInfo.project.name}.png`),
    fullPage: true,
  });
  const open = page.waitForResponse(
    (r) => r.url().endsWith("/state") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Abrir recebimento", exact: true })
    .click();
  expect((await open).status()).toBe(200);
  await expect(page.getByText(/Recebimento: aberto/)).toBeVisible();
  const stage = page.waitForResponse(
    (r) => r.url().endsWith("/stage") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", {
      name: "Preparar formulário no rascunho do site",
      exact: true,
    })
    .click();
  expect((await stage).status()).toBe(201);
  await page
    .getByRole("link", { name: "Revisar e publicar o site", exact: true })
    .click();
  const publish = page.waitForResponse(
    (r) =>
      r.url().endsWith(`${base}/publish`) && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Publicar versão/ }).click();
  expect((await publish).status()).toBe(201);
  await page.goto("http://evento-a.example.test:5173/expositores/inscricao");
  const publicForm = page.getByRole("form", { name: formName, exact: true });
  await publicForm
    .getByLabel(/E-mail para contato profissional/)
    .fill("candidate-synthetic@example.test");
  await publicForm.getByLabel(/Categoria do projeto/).selectOption("Arte");
  await publicForm.getByLabel(consent, { exact: true }).check();
  await publicForm.getByLabel(/Autorizo separadamente/).check();
  const publicName = `Ateliê sintético ${testInfo.project.name}`;
  await publicForm.getByLabel("Nome público", { exact: true }).fill(publicName);
  await publicForm
    .getByLabel("Descrição pública", { exact: true })
    .fill("Perfil público fictício, separado do contato privado.");
  await noOverflow(page);
  expect(
    await page.context().cookies("http://evento-a.example.test:5173"),
  ).toHaveLength(0);
  await page.screenshot({
    path: testInfo.outputPath(`public-form-${testInfo.project.name}.png`),
    fullPage: true,
  });
  await publicForm
    .getByRole("button", { name: "Enviar candidatura", exact: true })
    .click();
  await expect(page).toHaveURL(/\/candidatura\/[a-f0-9]{64}$/);
  const receiptUrl = page.url();
  await expect(
    page.getByRole("heading", { name: "Recebida", exact: true }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow",
  );
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath(`private-receipt-${testInfo.project.name}.png`),
    fullPage: true,
  });
  await page.goto(`${adminPath}/applications`);
  await page
    .locator("article")
    .filter({ hasText: formName })
    .getByRole("link", { name: "Analisar candidatura", exact: true })
    .click();
  await expect(
    page.getByText("candidate-synthetic@example.test", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Decisão", { exact: true }).selectOption("approved");
  await page
    .getByLabel("Mensagem para a pessoa candidata", { exact: true })
    .fill("Candidatura fictícia aprovada para o teste.");
  const review = page.waitForResponse(
    (r) => r.url().endsWith("/review") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Registrar decisão", exact: true })
    .click();
  expect((await review).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Aprovada", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath(`private-review-${testInfo.project.name}.png`),
    fullPage: true,
  });
  const stageProfile = page.waitForResponse(
    (r) =>
      r.url().endsWith("/stage-profile") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", {
      name: "Preparar perfil público no rascunho",
      exact: true,
    })
    .click();
  expect((await stageProfile).status()).toBe(201);
  await page.goto(`${adminPath}/cms`);
  const publishProfile = page.waitForResponse(
    (r) =>
      r.url().endsWith(`${base}/publish`) && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Publicar versão/ }).click();
  expect((await publishProfile).status()).toBe(201);
  await page.goto("http://evento-a.example.test:5173/expositores");
  await expect(
    page.getByRole("heading", { name: publicName, exact: true }),
  ).toBeVisible();
  expect(await page.content()).not.toContain(
    "candidate-synthetic@example.test",
  );
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath(
      `consented-exhibitor-${testInfo.project.name}.png`,
    ),
    fullPage: true,
  });
  await page.goto(receiptUrl);
  await page
    .getByRole("button", {
      name: "Retirar candidatura e revogar listagem",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Retirada", exact: true }),
  ).toBeVisible();
  await page.goto("http://evento-a.example.test:5173/expositores");
  await expect(
    page.getByRole("heading", { name: publicName, exact: true }),
  ).toHaveCount(0);
  expect(await page.content()).not.toContain(
    "candidate-synthetic@example.test",
  );
  expect(browserErrors).toEqual([]);
});
