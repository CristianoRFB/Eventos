/* Playwright smoke — Crazy Geek Fest CONCEITO não oficial. */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const base = process.env.CRAZYGEEK_PREVIEW_URL || "http://127.0.0.1:4189";
const shots = "demo-screenshots/crazygeek";
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(base + "/?view=festival", { waitUntil: "load" });
    await page.getByRole("heading", { name: /SEU MUNDO/i }).waitFor();
    assert.equal(await page.locator("#public-schedule .schedule-row").count(), 3);
    assert.equal(await page.locator('a[href="https://linktr.ee/crazygeekfest"]').count() > 0, true);
    await page.locator('.hero-actions [data-go="participar"]').click();
    await page.getByRole("heading", { name: /ENTRE PARA/i }).waitFor();
    await page.locator("#fill-example").click();
    await page.locator("#join-form button[type=submit]").click();
    await page.getByRole("heading", { name: /SEU EXEMPLO/i }).waitFor();
    await page.locator('#join-success [data-go="gestao"]').click();
    await page.getByRole("heading", { name: /A MÁGICA/i }).waitFor();
    await page.locator("#search-entries").fill("Atelier Estrela Teste");
    const item = page.locator(".entry-item", { hasText: "Atelier Estrela Teste" });
    assert.equal(await item.count(), 1);
    await item.locator("select").selectOption("analise");
    assert.equal(await page.locator("#metric-review").textContent(), "2");
    await page.locator("#agenda-title").fill("Encontro geek especial (exemplo)");
    await page.locator("#agenda-form button[type=submit]").click();
    assert.equal(await page.locator("#metric-agenda").textContent(), "4");
    await page.locator('.admin-controls [data-go="festival"]').click();
    await page.getByRole("heading", { name: /SEU MUNDO/i }).waitFor();
    await page.locator("#public-schedule").getByText("Encontro geek especial (exemplo)").waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, "Horizontal overflow at " + width);
    assert.deepEqual(errors, [], "Javascript page errors at " + width);
    await page.screenshot({ path: shots + "/festival-" + width + ".png", fullPage: true });
    await page.locator("#reset-from-footer").click();
    await page.reload({ waitUntil: "load" });
    assert.equal(await page.locator("#public-schedule .schedule-row").count(), 3, "Reset restores initial programme at " + width);
    await page.close();
  }
  console.log("CRAZY GEEK FEST smoke PASS — 7 sizes, attendance→admin, schedule, reset, no JS errors or overflow.");
} finally {
  await browser.close();
}
