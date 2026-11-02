const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");

(async () => {
  const base = process.env.ANIMESFEST_DEMO_URL || "http://127.0.0.1:4177";
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1365]) {
      const page = await browser.newPage({ viewport: { width, height: 860 } });
      const jsErrors = [];
      page.on("pageerror", error => jsErrors.push(error.message));
      await page.goto(base + "/?view=inicio", { waitUntil: "domcontentloaded" });
      assert.match(await page.title(), /AnimeSFest/);
      await page.locator(".hero-actions a[data-view='inscricao']").click();
      await page.locator("#vendor-name").fill("Estrela Exemplo " + width);
      await page.locator("select[name=category]").selectOption("Arte");
      await page.locator("input[name=city]").fill("Cidade de Teste / SP");
      await page.locator("textarea[name=description]").fill("Criações e impressões fictícias feitas para esta validação automatizada.");
      await page.locator("input[name=instagram]").fill("@perfil_ficticio");
      await page.locator("input[name=rules]").check();
      await page.locator("input[name=privacy]").check();
      await page.locator("#vendor-form button[type=submit]").click();
      await page.locator("#vendor-receipt").waitFor({ state: "visible" });
      assert.match(await page.locator("#receipt-summary").innerText(), /Estrela Exemplo/);
      await page.locator("#vendor-receipt a[data-view=admin]").click();
      await page.locator("[data-select]").filter({ hasText: "Estrela Exemplo " + width }).click();
      await page.locator("[data-action=approved]").click();
      assert.match(await page.locator("#application-detail").innerText(), /Aprovada/);
      await page.locator(".sidebar-public[data-view=lojas]").click();
      assert.match(await page.locator(".shops-grid").innerText(), /Estrela Exemplo/);
      await page.locator("#shop-search").fill("Estrela Exemplo " + width);
      assert.equal(await page.locator(".shop-card").count(), 1);
      await page.reload({ waitUntil: "domcontentloaded" });
      assert.match(await page.locator(".shops-grid").innerText(), /Estrela Exemplo/);
      await page.locator(".site-header a[data-view=admin]").evaluate(el => el.click());
      page.once("dialog", dialog => dialog.accept());
      await page.locator("#reset-demo").click();
      assert.doesNotMatch(await page.locator("#application-list").innerText(), /Estrela Exemplo/);
      assert.deepEqual(jsErrors, [], "browser JS errors on " + width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      assert.equal(overflow, false, "horizontal overflow on " + width);
      await page.close();
      console.log("PASS viewport " + width + "px: register → approve → directory → search → reload");
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });