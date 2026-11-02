/* global document, window */
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const baseUrl = process.env.VOF_PREVIEW_URL || "http://127.0.0.1:4179";
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(baseUrl + "/?view=visitar", { waitUntil: "load" });
    await page.getByRole("heading", { name: /SEU PRÓXIMO/i }).waitFor();
    assert.match(await page.title(), /VOF 2027/);
    assert.equal(await page.locator(".concept-bar").isVisible(), true);
    await page.locator(".hero-actions [data-go='participar']").click();
    await page.getByRole("heading", { name: /FAÇA PARTE/i }).waitFor();
    assert.match(page.url(), /view=participar/);
    await page.locator('[data-kind="patrocinador"]').click();
    assert.equal(await page.locator('[data-kind="patrocinador"]').getAttribute("aria-pressed"), "true");
    await page.locator("#brand-name").fill("Parceiro Teste VOF");
    await page.locator("#contact-name").fill("Pessoa Fictícia");
    await page.locator("#contact-email").fill("parceiro@example.test");
    await page.locator("#idea").fill("Patrocínio fictício para uma área gamer demonstrativa.");
    await page.locator("#demo-consent").check();
    await page.locator("#interest-form button[type=submit]").click();
    await page.getByRole("heading", { name: /Exemplo registrado/i }).waitFor();
    await page.locator("#form-success [data-go='gestao']").click();
    await page.getByRole("heading", { name: /Olá, equipe VOF/i }).waitFor();
    await page.locator("#search-inquiries").fill("Parceiro Teste VOF");
    const row = page.locator("#inquiries-body tr", { hasText: "Parceiro Teste VOF" });
    assert.equal(await row.count(), 1, "new fake application visible in admin");
    await row.locator("select").selectOption("contato");
    assert.equal(await page.locator("#stat-contact").textContent(), "2");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, "no horizontal overflow at " + viewport.width);
    assert.deepEqual(errors, [], "page JS errors");
    await page.screenshot({ path: "/tmp/vof-" + viewport.width + ".png", fullPage: true });
    await page.close();
  }
  console.log("VOF smoke PASS: mobile+desktop, navigation, sponsorship demo, organizer statuses, no overflow/errors.");
} finally {
  await browser.close();
}