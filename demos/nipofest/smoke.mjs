/* Browser smoke: non-official NipoFest demo. */
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const base = process.env.NIPOFEST_PREVIEW_URL || "http://127.0.0.1:4188";
const browser = await chromium.launch({headless:true});
try {
 for (const width of [320,390,768,1440]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
  const errors=[]; page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/?view=festival",{waitUntil:"load"});
  await page.getByRole("heading",{name:/UM FESTIVAL/i}).waitFor();
  await page.locator(".hero-content [data-go='concursos']").click();
  await page.getByRole("heading",{name:/SEU LUGAR/i}).waitFor();
  await page.locator('[data-kind="kpop-grupo"]').click();
  assert.equal(await page.locator('[data-kind="kpop-grupo"]').getAttribute("aria-pressed"),"true");
  await page.locator("#person-name").fill("Sakura Teste "+width);
  await page.locator("#stage-name").fill("Cometa "+width);
  await page.locator("#person-email").fill("cometa@example.test");
  await page.locator("#performance").fill("Apresentação puramente fictícia.");
  await page.locator("#fake-confirm").check();
  await page.locator("#signup button[type=submit]").click();
  await page.getByRole("heading",{name:/SUA IDEIA/i}).waitFor();
  await page.locator("#form-success [data-go='gestao']").click();
  await page.getByRole("heading",{name:/POR TRÁS/i}).waitFor();
  await page.locator("#search").fill("Cometa "+width);
  const row=page.locator(".entry",{hasText:"Cometa "+width});
  assert.equal(await row.count(),1);
  await row.locator("select").selectOption("analise");
  assert.equal(await page.locator("#review-count").textContent(),"2");
  await page.locator("#reset-demo").click();
  assert.equal(await page.locator("#total-count").textContent(),"4");
  await page.locator("#search").fill("");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  assert.equal(overflow,false,"No overflow at "+width);
  assert.deepEqual(errors,[],"JS errors at "+width);
  await page.screenshot({path:"/tmp/nipofest-"+width+".png",fullPage:true});
  await page.close();
 }
 console.log("NIPOFEST DEMO smoke PASS: flows, responsive and no JS errors.");
} finally { await browser.close(); }
