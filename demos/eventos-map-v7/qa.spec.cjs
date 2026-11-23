const {test, expect}=require('@playwright/test');
const fs=require('fs');
const source=fs.readFileSync('demos/eventos-map-v7/worker.js','utf8');
function extractHtml(){
 const prefix='return new Response("<!doctype html>';
 const p=source.indexOf(prefix);
 if(p<0)throw Error('HTML não encontrado no Worker');
 const q=p+'return new Response('.length;
 let e=q+1,escaped=false;
 for(;e<source.length;e++){if(escaped){escaped=false;continue}if(source[e]==='\\'){escaped=true;continue}if(source[e]==='"')break}
 return JSON.parse(source.slice(q,e+1));
}
const html=extractHtml();
test.beforeEach(async ({page})=>{
 await page.route('https://demo.test/**',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
 await page.route(/https:\/\/(images\.unsplash\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/,route=>route.abort());
 await page.goto('https://demo.test/',{waitUntil:'domcontentloaded'});
});
test('landing V7: duas entradas, slogan, duas matrizes e investimento',async({page})=>{
 await expect(page.locator('.hero-signature')).toContainText('Melhor pra você, e pro cliente');
 await expect(page.locator('#hero-public')).toHaveAttribute('href','/publico');
 await expect(page.locator('#hero-admin')).toHaveAttribute('href','/gestao');
 await expect(page.locator('#home table')).toHaveCount(2);
 await expect(page.locator('#home')).toContainText('Orçamentos começam em R$ 100 mensais.');
 await expect(page.locator('#rfb-landing-opp-title')).toHaveText('Feira de criadores ARMY');
 await page.locator('#hero-public').click();
 await expect(page).toHaveURL('https://demo.test/publico');
 await expect(page.locator('#public')).toBeVisible();
});
test('público: consulta de chamada abre mensagem sem enviar',async({page})=>{
 await page.goto('https://demo.test/publico');
 await expect(page.locator('#rfb-opps-public .opp-card')).toHaveCount(3);
 await page.locator('[data-opp-consult]').first().click();
 await expect(page.locator('#message-dialog')).toBeVisible();
 await expect(page.locator('#message-text')).toHaveValue(/A chamada exibida era fictícia/);
 await page.locator('#close-message').click();
 await expect(page.locator('#message-dialog')).not.toBeVisible();
});
test('gestão: validação negativa, criação, pausa, edição e reflexo público',async({page})=>{
 await page.goto('https://demo.test/gestao');
 await expect(page.locator('#rfb-opps-admin-list .opp-admin-item')).toHaveCount(3);
 await page.locator('#rfb-opp-title').fill('abc');
 await page.locator('#rfb-opp-desc').fill('pequena');
 await page.locator('#rfb-opp-form button[type="submit"]').click();
 await expect(page.locator('#rfb-opp-error')).toContainText('6 caracteres');
 await expect(page.locator('#rfb-opps-admin-list .opp-admin-item')).toHaveCount(3);
 await page.locator('#rfb-opp-title').fill('Vitrine criativa teste QA');
 await page.locator('#rfb-opp-kind').selectOption('creator');
 await page.locator('#rfb-opp-desc').fill('Chamada fictícia para trabalhos criativos da comunidade e exposições colaborativas.');
 await page.locator('#rfb-opp-form button[type="submit"]').click();
 await expect(page.locator('#rfb-opps-admin-list .opp-admin-item')).toHaveCount(4);
 await page.goto('https://demo.test/publico');
 await expect(page.locator('#rfb-opps-public')).toContainText('Vitrine criativa teste QA');
 await page.goto('https://demo.test/gestao');
 let row=page.locator('.opp-admin-item',{hasText:'Vitrine criativa teste QA'});
 await row.locator('[data-opp-toggle]').click();
 await page.goto('https://demo.test/publico');
 await expect(page.locator('#rfb-opps-public')).not.toContainText('Vitrine criativa teste QA');
 await page.goto('https://demo.test/gestao');
 row=page.locator('.opp-admin-item',{hasText:'Vitrine criativa teste QA'});
 await row.locator('[data-opp-edit]').click();
 await expect(page.locator('#rfb-opp-title')).toHaveValue('Vitrine criativa teste QA');
 await page.locator('#rfb-opp-title').fill('Vitrine editada QA');
 await page.locator('#rfb-opp-visible').check();
 await page.locator('#rfb-opp-form button[type="submit"]').click();
 await page.goto('https://demo.test/publico');
 await expect(page.locator('#rfb-opps-public')).toContainText('Vitrine editada QA');
});
for(const width of [320,360,390,430,768,1024,1440]){
 test('responsivo home '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await expect(page.locator('#hero-public')).toBeVisible();
  await expect(page.locator('#hero-admin')).toBeVisible();
  const m=await page.evaluate(()=>({screen:innerWidth,scroll:document.documentElement.scrollWidth,btn1:document.querySelector('#hero-public').getBoundingClientRect().width,btn2:document.querySelector('#hero-admin').getBoundingClientRect().width}));
  expect(m.scroll,JSON.stringify(m)).toBeLessThanOrEqual(width);
  expect(m.btn1).toBeGreaterThan(80);
  expect(m.btn2).toBeGreaterThan(80);
 });
}
