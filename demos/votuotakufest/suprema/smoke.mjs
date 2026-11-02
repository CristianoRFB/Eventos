/* global document, window */
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser=await chromium.launch({headless:true});
const base=process.env.VOF_SUPREMA_URL||"http://127.0.0.1:4179/suprema/";
try{
for(const viewport of [{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
 const page=await browser.newPage({viewport,reducedMotion:"reduce"});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base+"?view=home",{waitUntil:"load"});
 await page.locator(".hero h1").waitFor();
 const bad=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 assert.equal(bad,false,"horizontal overflow on "+viewport.width);
 // Sale fixture: complete simulated wizard, no real payment.
 await page.goto(base+'?view=tickets',{waitUntil:'load'});
 await page.locator('#buy-next-1').click();
 await page.locator('#buyer-name').fill("Pessoa de Teste");
 await page.locator('#buyer-email').fill("teste@example.test");
 await page.locator('#buyer-agree').check();
 await page.locator('#buyer-form button[type=submit]').click();
 await page.locator('#approve-buy').click();
 assert.equal(await page.locator('#buy-step-4').isVisible(),true,"ticket step success");
 const ticketCode=(await page.locator('#ticket-issued').innerText()).match(/VOF-DEMO-[A-Z0-9]+/);
 assert.ok(ticketCode,"fake issued code");
 // Contest signup and printable record.
 await page.goto(base+'?view=contests',{waitUntil:'load'});
 await page.locator('#prefill-contest').click();
 await page.locator('#contest-form button[type=submit]').click();
 assert.equal(await page.locator('#contest-result').isVisible(),true,"contest confirmation");
 // Administration flow and checkin preventing double usage.
 await page.goto(base+'?view=admin',{waitUntil:'load'});
 // Existing fictional records persist across navigation in this browser session.
 await page.locator('[data-admin=checkin]').first().click();
 await page.locator('#checkin-code').fill(ticketCode[0]);
 await page.locator('#checkin-form button[type=submit]').click();
 assert.match(await page.locator('#checkin-result').innerText(),/valid|sucesso|confirm|entrada/i);
 await page.locator('#checkin-code').fill(ticketCode[0]);
 await page.locator('#checkin-form button[type=submit]').click();
 assert.match(await page.locator('#checkin-result').innerText(),/utiliz|segunda|bloque|já/i);
 await page.locator('[data-admin=contests]').first().click();
 assert.ok((await page.locator('#contest-rows tr').count())>=1,"contest visible admin");
 assert.deepEqual(errors,[],"JavaScript errors at "+viewport.width);
 await page.screenshot({path:"/tmp/vof-suprema-"+viewport.width+".png",fullPage:true});
 await page.close();
}
console.log("VOF Suprema smoke: PASS 320/390/768/1440, purchase, contest, admin and one-time checkin");
} finally {await browser.close();}
