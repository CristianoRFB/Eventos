import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(dir, "index.html"), "utf8");
const server = createServer((_req,res) => {res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end(html)});
await new Promise(ok => server.listen(0,"127.0.0.1",ok));
const url = "http://127.0.0.1:" + server.address().port + "/";
mkdirSync(resolve(dir, ".screenshots"), {recursive:true});
const browser = await chromium.launch({headless:true});
try{
for(const width of [320,360,390,430,768,1024,1440]){
 const page = await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url);await page.locator("#hero-title").waitFor();
 const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:window.innerWidth}));
 if(dims.scroll>dims.view+2)throw Error("Overflow "+width+" "+JSON.stringify(dims));
 if([390,1440].includes(width))await page.screenshot({path:resolve(dir,".screenshots","portal-"+width+".png"),fullPage:true});
 await page.goto(url+"#programacao");if(await page.locator(".schedule-item").count()<2)throw Error("Missing activities");
 await page.locator("#day22").click();await page.locator(".schedule-item button").first().click();
 if((await page.locator("#saved-count").innerText()).trim()!=="1")throw Error("Save failed");
 await page.locator("#clear-saved").click();
 if((await page.locator("#saved-count").innerText()).trim()!=="0")throw Error("Clear failed");
 await page.goto(url+"#gestao");await page.locator("#headline-input").fill("Aviso demonstrativo atualizado para o festival.");
 await page.locator("#headline-form button[type=submit]").click();
 await page.locator("#event-name").fill("Atividade especial de teste");
 await page.locator("#event-day").selectOption("22");
 await page.locator("#program-form button[type=submit]").click();
 await page.goto(url+"#inicio");
 if(!(await page.locator("#headline-live").innerText()).includes("Aviso demonstrativo"))throw Error("Headline sync failed");
 await page.goto(url+"#programacao");await page.locator("#day22").click();
 if(!(await page.locator("#agenda-list").innerText()).includes("Atividade especial de teste"))throw Error("Program sync failed");
 await page.goto(url+"#gestao");page.once("dialog",d=>d.accept());await page.locator("#reset-all").click();
 await page.goto(url+"#inicio");if((await page.locator("#headline-live").innerText()).includes("Aviso demonstrativo"))throw Error("Reset failed");
 if(errors.length)throw Error("Browser errors: "+errors.join(" | "));
 console.log("PASS",width,"portal agenda admin reset");await page.close();
}
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
