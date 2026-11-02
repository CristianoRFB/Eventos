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
 console.log('DIAGNOSTIC tickets:',{url:page.url(),ticketsHidden:await page.locator('#page-tickets').getAttribute('hidden'),homeHidden:await page.locator('#page-home').getAttribute('hidden'),pageErrors:errors.slice(),assets:await page.evaluate(()=>[...document.querySelectorAll('script[src]')].map(s=>s.src))});
 if(!(await page.locator('#buy-next-1').isVisible())) { const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(x=>x.src)); throw new Error('Checkout oculto: '+JSON.stringify({errors,scripts,url:page.url()})); }
 const qr=page.locator('#pix-fake img');
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
 await page.locator('#admin-menu [data-admin=contests]').click();
 assert.ok((await page.locator('#contest-rows tr').count())>=1,"contest visible admin");
 assert.deepEqual(errors,[],"JavaScript errors at "+viewport.width);

 // New feedback regression checks: QR encoded in local asset; mobile admin stays centered.
 await page.goto(base+'?view=tickets',{waitUntil:'load'});
 await page.locator('#buy-next-1').click();
 await page.locator('#buyer-name').fill('Outro Exemplo');
 await page.locator('#buyer-email').fill('outro@example.test');
 await page.locator('#buyer-agree').check();
 await page.locator('#buyer-form button[type=submit]').click();
 await page.locator('#pix-fake img').waitFor({state:'visible'});
 assert.equal(await page.locator('#pix-fake img').getAttribute('src'),'./demo-qr.svg');
 const imgReady=await page.locator('#pix-fake img').evaluate(img=>img.complete&&img.naturalWidth>0);
 assert.equal(imgReady,true,'real SVG QR code loads');
 await page.goto(base+'?view=admin',{waitUntil:'load'});
 const geometry=await page.evaluate(()=>({viewport:innerWidth, metrics:[...document.querySelectorAll('#metric-grid .metric')].map(x=>{let r=x.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width}}),work:(()=>{let r=document.querySelector('#admin-work').getBoundingClientRect();return {x:r.x,right:r.right}})()}));
 assert.ok(geometry.metrics.length===4,'all KPI cards rendered');
 if(viewport.width<=760){assert.ok(geometry.metrics.every(r=>r.x>=-2&&r.right<=geometry.viewport+2),'all mobile KPI cards fit screen '+JSON.stringify(geometry));assert.ok(geometry.work.x>=-2&&geometry.work.right<=geometry.viewport+2,'admin work does not overflow mobile viewport');}
 await page.locator('#admin-menu [data-admin=sales]').click();
 await page.locator('#cost-name').fill('Custo extra demonstrativo');
 await page.locator('#cost-amount').fill('123.45');
 await page.locator('#cost-form button[type=submit]').click();
 assert.match(await page.locator('#costs-rows').innerText(),/Custo extra demonstrativo/);
 await page.locator('#print-costs').click();
 assert.match(await page.locator('#print-root').innerText(),/Custo extra demonstrativo/);
 await page.locator('#admin-menu [data-admin=partners]').click();
 await page.locator('#print-partners').click();
 assert.match(await page.locator('#print-root').innerText(),/NEON PLAY/);
 await page.locator('#admin-menu [data-admin=emails]').click();
 assert.equal(await page.locator('#email-recipient').getAttribute('type'),'email');
 await page.locator('#email-recipient').fill('pessoa.real@gmail.com');
 assert.equal(await page.locator('#email-recipient').inputValue(),'pessoa.real@gmail.com');
 await page.screenshot({path:"/tmp/vof-suprema-"+viewport.width+".png",fullPage:true});
 await page.close();
}
console.log("VOF Suprema smoke: PASS 320/390/768/1440, purchase, contest, admin and one-time checkin");
} finally {await browser.close();}
