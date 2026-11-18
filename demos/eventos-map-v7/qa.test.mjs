import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE = 'https://77-eventos-map-v7-demo.on7.workers.dev';
fs.mkdirSync('qa-screenshots', { recursive:true });
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--no-sandbox'] });
const problems=[];
function check(ok,label){ if(!ok)problems.push(label); console.log((ok?'PASS':'FAIL')+' :: '+label); }
try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const jsErrors=[];
  page.on('pageerror',e=>jsErrors.push(String(e)));
  for(const width of [320,360,390,430,768,1024,1440]){
    await page.setViewportSize({width,height:width<500?844:900});
    const response=await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
    check(response.status()===200,'home status '+width);
    await page.waitForTimeout(200);
    const info=await page.evaluate(()=>{
      const hero=document.querySelector('.hero-signature');
      return {width:innerWidth,scroll:document.documentElement.scrollWidth,heroVisible:hero&&hero.getBoundingClientRect().top>=0&&hero.getBoundingClientRect().bottom<=innerHeight,links:[document.querySelector('#hero-public')?.getAttribute('href'),document.querySelector('#hero-admin')?.getAttribute('href')],tables:document.querySelectorAll('.comparison').length,price:document.body.innerText.includes('Orçamentos começam em R$ 100 mensais.'),slogan:document.body.innerText.includes('Melhor pra você, e pro cliente')};
    });
    check(info.scroll<=info.width+2,'no horizontal overflow '+width+' (scroll='+info.scroll+')');
    check(info.heroVisible,'slogan inside first fold '+width);
    check(info.tables===2,'two tables '+width);
    check(info.price&&info.slogan,'exact slogan and price '+width);
    check(info.links[0]==='/publico'&&info.links[1]==='/gestao','two CTA destinations '+width);
    if(width===390||width===1440)await page.screenshot({path:'qa-screenshots/home-'+width+'.png',fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#hero-public').click();
  check(new URL(page.url()).pathname==='/publico','hero customer click reaches public route');
  check((await page.locator('.session-card').count())===5,'public has 5 demo activities');
  await page.locator('.pick').first().click();
  check((await page.locator('#my-agenda').innerText()).includes('Boas-vindas'),'personal agenda selection reflects');
  await page.locator('#prepare-message').click();
  check(await page.locator('#message-dialog').evaluate(el=>el.open),'manual Instagram dialog opens');
  check((await page.locator('#message-text').inputValue()).includes('Eventos MAP'),'manual message is populated');
  await page.locator('#close-message').click();
  await page.screenshot({path:'qa-screenshots/public-mobile.png',fullPage:true});
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#hero-admin').click();
  check(new URL(page.url()).pathname==='/gestao','hero management click reaches admin route');
  await page.locator('[data-edit="s1"]').click();
  await page.locator('#field-title').fill('Boas-vindas QA MAP');
  await page.locator('#field-time').fill('13:25');
  await page.locator('#session-form button[type=submit]').click();
  check((await page.locator('#admin-sessions').innerText()).includes('Boas-vindas QA MAP'),'manager edit saved');
  await page.locator('.admin-header a[href="/publico"]').click();
  check((await page.locator('#public-sessions').innerText()).includes('Boas-vindas QA MAP'),'manager edit reflected in public');
  check((await page.locator('#public-sessions').innerText()).includes('13:25'),'manager time reflected in public');
  await page.goto(BASE+'/gestao',{waitUntil:'domcontentloaded'});
  await page.locator('#new-session').click();
  await page.locator('#field-title').fill('Atividade de QA criada');
  await page.locator('#field-time').fill('17:45');
  await page.locator('#field-desc').fill('Descrição teste para verificar criação e exclusão.');
  await page.locator('#session-form button[type=submit]').click();
  check((await page.locator('#admin-sessions').innerText()).includes('Atividade de QA criada'),'create new activity');
  page.once('dialog',dialog=>dialog.accept());
  const deleteButton=page.locator('.admin-row').filter({hasText:'Atividade de QA criada'}).locator('[data-delete]');
  await deleteButton.click();
  check(!(await page.locator('#admin-sessions').innerText()).includes('Atividade de QA criada'),'delete activity');
  await page.locator('#notice-text').fill('Aviso QA alterado e visível no portal.');
  await page.locator('#notice-form button[type=submit]').click();
  await page.goto(BASE+'/publico',{waitUntil:'domcontentloaded'});
  check((await page.locator('#public-notice').innerText()).includes('Aviso QA alterado'),'notice update visible in public');
  await page.goto(BASE+'/gestao',{waitUntil:'domcontentloaded'});
  await page.screenshot({path:'qa-screenshots/admin-mobile.png',fullPage:true});

  for(const route of ['/','/publico','/gestao']){
    for(const width of [320,360,390,430,768,1024,1440]){
      await page.setViewportSize({width,height:width<=430?844:900});
      await page.goto(BASE+route,{waitUntil:'load'});
      const probe=await page.evaluate((route)=>{
        const imgs=Array.from(document.querySelectorAll((route==='/publico'?'#public':route==='/gestao'?'#admin':'#home')+' img'));
        return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,images:imgs.map(img=>({ok:img.complete&&img.naturalWidth>0,src:img.currentSrc||img.src}))};
      },route);
      if(probe.scroll>probe.viewport+2&&width===390){
        const culprits=await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(el=>getComputedStyle(el).display!=='none').map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,class:String(el.className).slice(0,75),text:(el.textContent||'').trim().slice(0,60),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}}).filter(x=>x.right>innerWidth+2&&x.width>0).sort((a,b)=>b.right-a.right).slice(0,15));
        console.log('OVERFLOW_DIAGNOSTIC '+route+' '+width+' '+JSON.stringify(culprits));
      }
      check(probe.scroll<=probe.viewport+2,'overflow '+route+' '+width+' (scroll='+probe.scroll+')');
      if(width===390){
        const activePage=route==='/publico'?'#public':route==='/gestao'?'#admin':'#home';
        const pictures=page.locator(activePage+' img');
        const checks=[];
        for(let i=0;i<await pictures.count();i++){
          const current=pictures.nth(i);
          await current.scrollIntoViewIfNeeded();
          const result=await current.evaluate(async image=>{try{await image.decode()}catch(e){}return {ok:image.complete&&image.naturalWidth>0,src:image.currentSrc||image.src}});
          checks.push(result);
        }
        check(checks.every(x=>x.ok),'image loading after scroll '+route+' '+JSON.stringify(checks));
        await page.evaluate(()=>window.scrollTo(0,0));
        if(route==='/publico'){
          const shot=await page.screenshot({type:'jpeg',quality:35,fullPage:false});
          console.log('VISUAL_QA_PUBLIC_JPEG_BASE64:'+shot.toString('base64'));
        }
      }
      if(width===390&&route==='/'){
        const bytes=await page.screenshot({type:'jpeg',quality:35,fullPage:false});
        console.log('VISUAL_QA_MOBILE_JPEG_BASE64:'+bytes.toString('base64'));
      }
    }
  }

  check(jsErrors.length===0,'no uncaught browser JavaScript errors: '+JSON.stringify(jsErrors));
  await page.close();
  const desktop=await browser.newPage({viewport:{width:1440,height:900}});
  await desktop.goto(BASE+'/gestao',{waitUntil:'domcontentloaded'});
  await desktop.screenshot({path:'qa-screenshots/admin-desktop.png',fullPage:true});
  await desktop.close();
} finally {
  await browser.close();
}
if(problems.length){console.error('QA FAILED: '+JSON.stringify(problems));process.exitCode=1;}else console.log('QA COMPLETO: todos os testes automatizados passaram.');
