import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({headless:true});
const base = process.env.DEMO_URL || "http://127.0.0.1:4177";
const widths = [320,360,390,430,768,1024,1440];
fs.mkdirSync("demos/m7-academy/evidence",{recursive:true});
try {
  for (const width of widths) {
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto(base+"/?view=publico");
    await expect(page.locator("h1")).toContainText("CADA PARTIDA.");
    await expect(page.locator("#public-matches .match-card")).toHaveCount(3);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    if(overflow>1)throw new Error("Horizontal overflow at "+width+" px: "+overflow+" px");
    if(width===390||width===1440){await page.screenshot({path:`demos/m7-academy/evidence/public-${width}.png`,fullPage:true});}
    await page.getByRole("link",{name:"Área do capitão"}).click();
    await expect(page.locator("#view-capitao")).toBeVisible();
    await page.getByRole("button",{name:/Fazer check-in/}).click();
    await expect(page.locator("#checkin-note")).toContainText("registrada");
    await page.locator("#score-a").fill("2");
    await page.locator("#score-b").fill("1");
    await page.locator("#evidence").fill("<script>alert(1)</script>");
    await page.getByRole("button",{name:/Encaminhar para análise/}).click();
    await expect(page.locator("#captain-decision")).toContainText("aguardando");
    await page.getByRole("link",{name:/Abrir a visão da staff/}).click();
    await expect(page.locator("#view-staff")).toBeVisible();
    await expect(page.locator("#staff-waiting")).toHaveText("02");
    await expect(page.locator("#staff-queue")).not.toContainText("alert(1)</script>"); // markup must not render
    await page.locator('[data-action="approve"][data-id="M-101"]').click();
    await expect(page.locator("#staff-approved")).toHaveText("02");
    await page.getByRole("link",{name:"Arena pública"}).click();
    await expect(page.locator("#metric-validated")).toHaveText("02");
    await expect(page.locator("#public-matches")).toContainText("2 : 1");
    if(width===390||width===1440){await page.screenshot({path:`demos/m7-academy/evidence/validated-${width}.png`,fullPage:true});}
    if(errors.length)throw new Error("Page errors at "+width+" px: "+errors.join(" | "));
    await page.close();
    console.log("OK viewport "+width);
  }
  const page=await browser.newPage({viewport:{width:390,height:850}});
  await page.goto(base+"/?view=staff");
  await page.locator('[data-reason="M-103"]').fill("Rever o placar");
  await page.locator('[data-action="reject"][data-id="M-103"]').click();
  await page.getByRole("link",{name:"Área do capitão"}).click();
  await page.locator("#team-select").selectOption("neon");
  await expect(page.locator("#captain-decision")).toContainText("Rever o placar");
  await page.getByRole("button",{name:/Encaminhar para análise/}).click();
  await page.getByRole("link",{name:"Central da staff"}).click();
  await expect(page.locator("#staff-waiting")).toHaveText("01");
  await page.getByRole("button",{name:/Restaurar dados demo/}).click();
  await expect(page.locator("#staff-approved")).toHaveText("01");
  await expect(page.locator("#staff-waiting")).toHaveText("01");
  console.log("OK return, resubmit, reset");
  await page.close();
} finally {await browser.close();}
