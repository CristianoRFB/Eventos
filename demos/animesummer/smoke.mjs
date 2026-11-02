/* global document, window */
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const url = process.env.ANIMESUMMER_PREVIEW_URL || "http://127.0.0.1:4184";
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", err => errors.push(err.message));
    await page.goto(url + "/?view=publico", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /UM VERÃO/i }).waitFor();
    assert.equal(await page.locator(".demo-notice").isVisible(), true, "demo disclaimer");
    await page.locator('[data-start="cosplay"]').click();
    await page.getByRole("heading", { name: /FAÇA PARTE/i }).waitFor();
    assert.match(page.url(), /view=inscricoes/);
    await page.locator("#entry-name").fill("Equipe Fictícia Teste");
    await page.locator("#entry-email").fill("pessoa@gmail.com");
    await page.locator("#entry-details").fill("Exemplo fictício de inscrição no palco cosplay.");
    await page.locator("#fake-agreement").check();
    await page.locator("#signup-form button[type=submit]").click();
    await page.getByRole("alert").getByText(/@example.test/).waitFor();
    await page.locator("#entry-email").fill("teste@example.test");
    await page.locator("#signup-form button[type=submit]").click();
    await page.getByText("PRONTO!", { exact: false }).waitFor();
    await page.locator("#signup-success [data-go=gestao]").click();
    await page.getByRole("heading", { name: /O EVENTO/i }).waitFor();
    await page.locator("#admin-search").fill("Equipe Fictícia Teste");
    const row = page.locator(".application-card", { hasText: "Equipe Fictícia Teste" });
    assert.equal(await row.count(), 1, "new demo application appears");
    await row.locator("select").selectOption("aprovada");
    assert.equal(await page.locator("#metric-approved").textContent(), "2");
    await page.locator("#agenda-title").fill("Oficina fictícia de desenho");
    await page.locator("#agenda-time").fill("16:15");
    await page.locator("#agenda-form button").click();
    await page.locator("[data-go=publico]").last().click();
    await page.locator("#agenda-list").getByText("Oficina fictícia de desenho (exemplo)", { exact: true }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, "no overflow at " + width);
    assert.deepEqual(errors, [], "no JS page errors at " + width);
    if (width === 390 || width === 1440) await page.screenshot({ path: "/tmp/animesummer-" + width + ".png", fullPage: true });
    await page.close();
  }
  console.log("Anime Summer demo: browser smoke PASS at 320/360/390/430/768/1024/1440.");
} finally {
  await browser.close();
}
