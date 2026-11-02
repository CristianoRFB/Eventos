import assert from "node:assert/strict";
import {chromium} from "@playwright/test";
const browser=await chromium.launch({headless:true});
const base="http://127.0.0.1:4179/suprema/";
const calls=[];
const mockTurnstile="window.turnstile={render(el,opts){window.__vofCallback=opts.callback;return 'test-widget'},execute(){queueMicrotask(()=>window.__vofCallback('synthetic-turnstile-for-browser-smoke-12345'))},reset(){},remove(){}};";
try{
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport});
  await page.route(/https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js.*/,route=>route.fulfill({status:200,contentType:"application/javascript",body:mockTurnstile}));
  await page.route("**/api/test-email",async route=>{
   const payload=route.request().postDataJSON();calls.push(payload);
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({message:"Mock Brevo accepted with PDF",messageId:"<browser-smoke@example.test>",filename:"ingressos-mock.pdf"})});
  });
  await page.goto(base+"?view=tickets",{waitUntil:"load"});
  await page.locator("#buy-next-1").click();
  await page.locator("#buyer-name").fill("Pessoa Demonstracao");
  await page.locator("#buyer-email").fill("comprador@sample.org");
  await page.locator("#buyer-agree").check();
  await page.locator("#buyer-email-real").check();
  await page.locator("#buyer-form button[type=submit]").click();
  await page.locator("#approve-buy").click();
  await page.waitForFunction(()=>document.querySelector("#ticket-email-feedback")?.textContent?.includes("O PDF está anexado"),{timeout:12000});
  let req=calls.at(-1);
  assert.equal(req.kind,"ticket-demo");assert.equal(req.recipient,"comprador@sample.org");
  assert.equal(req.ticket.qty,1);assert.equal(req.ticket.buyer,"Pessoa Demonstracao");
  assert.match(req.turnstileToken,/synthetic-turnstile/);
  assert.equal(JSON.stringify(req).includes("emailAuth"),false);
  await page.goto(base+"?view=admin",{waitUntil:"load"});
  await page.locator("#admin-menu [data-admin=emails]").click();
  await page.locator("#email-recipient").fill("admin@sample.org");
  await page.locator("#email-test-consent").check();
  await page.locator("#test-email-form button[type=submit]").click();
  await page.waitForFunction(()=>document.querySelector("#test-email-result")?.textContent?.includes("O PDF está anexado"),{timeout:12000});
  req=calls.at(-1);assert.equal(req.kind,"demo-confirmation");assert.equal(req.recipient,"admin@sample.org");
  await page.goto(base+"?view=contests",{waitUntil:"load"});
  await page.locator("#prefill-contest").click();
  await page.locator("#contest-email").fill("grupo@sample.org");
  await page.locator("#contest-email-real").check();
  await page.locator("#contest-form button[type=submit]").click();
  await page.waitForFunction(()=>document.querySelector("#contest-email-feedback")?.textContent?.includes("O PDF está anexado"),{timeout:12000});
  req=calls.at(-1);assert.equal(req.kind,"contest-demo");assert.equal(req.contest.kind,"Cosplay");
  await page.close();
 }
 assert.equal(calls.length,6,"3 mail opt-in paths x 2 viewports");
 console.log("VOF email browser PASS: no password, checkout, admin, contest, consent, Turnstile and PDF request payloads");
}finally{await browser.close()}
