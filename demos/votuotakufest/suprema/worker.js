/* global URL, Response, fetch */
/* VOF Suprema — demo gateway. GitHub is source of truth; no secrets in repository. */
const ASSET_SHA = 'c00fd2c3281e095199d8149ef64727fbb777d773';
const ASSET_ROOT = 'https://raw.githubusercontent.com/CristianoRFB/Eventos/' + ASSET_SHA + '/demos/votuotakufest/suprema/';
const ASSET_TYPES = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js'};
const ASSET_MIMES = {'index.html':'text/html; charset=utf-8','style.css':'text/css; charset=utf-8','app.js':'application/javascript; charset=utf-8'};
const LIMIT = new Map();
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function testEmail(request, env) {
  if(request.method!=='POST') return json({message:'Método não permitido'},405);
  const u=new URL(request.url);
  if(request.headers.get('Origin')!==u.origin) return json({message:'Origem não permitida'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json')) return json({message:'Conteúdo inválido'},415);
  if(+(request.headers.get('Content-Length')||0)>1024) return json({message:'Requisição muito grande'},413);
  if(!env.BREVO_API_KEY || !env.VOF_DEMO_MAIL_TOKEN || !env.VOF_DEMO_EMAIL_FROM || !env.VOF_DEMO_EMAIL_TO) return json({message:'Envio de teste ainda não configurado.'},503);
  const token=request.headers.get('X-VOF-Demo-Token')||'';
  if(token.length<32 || token!==env.VOF_DEMO_MAIL_TOKEN) return json({message:'Código administrativo inválido'},401);
  const remote=request.headers.get('CF-Connecting-IP')||'local', now=Date.now();
  const last=LIMIT.get(remote)||0;
  if(now-last<120000) return json({message:'Aguarde 2 minutos entre testes de e-mail.'},429);
  LIMIT.set(remote,now);
  try {const body=await request.json(); if(body?.kind!=='demo-confirmation') return json({message:'Solicitação inválida'},400);}
  catch {return json({message:'JSON inválido'},400);}
  const email={
    sender:{name:'VOF 2027 — Demonstração',email:env.VOF_DEMO_EMAIL_FROM},
    to:[{email:env.VOF_DEMO_EMAIL_TO,name:'Equipe de teste VOF'}],
    subject:'[DEMONSTRAÇÃO NÃO OFICIAL] Teste de e-mail — VOF 2027',
    htmlContent:'<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;background:#f7f4fc;padding:25px"><div style="max-width:580px;margin:auto;background:white;border-radius:12px;padding:28px"><h1 style="color:#4d239f">VOF 2027 · Teste de e-mail</h1><p>Este é um teste autorizado da demonstração independente do sistema de ingressos e concursos.</p><p><strong>Nenhuma venda, inscrição ou ingresso válido foi criado.</strong></p><hr><p style="font-size:12px;color:#777">Ambiente de desenvolvimento comercial · Não é o site oficial do evento.</p></div></body></html>',
    tags:['vof-demo-test']
  };
  let response;
  try { response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json','accept':'application/json'},body:JSON.stringify(email)});}
  catch {return json({message:'Não foi possível conectar ao serviço de e-mail.'},502);}
  if(!response.ok){return json({message:'A Brevo recusou o teste. Confira autenticação do remetente e status de envio.',status:response.status},502);}
  const data=await response.json().catch(()=>({}));
  return json({ok:true,messageId:data.messageId||null});
}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/test-email') return testEmail(request,env);
 if(!(url.pathname in ASSET_TYPES)) return new Response('Não encontrado',{status:404,headers:{'X-Robots-Tag':'noindex, nofollow'}});
 if(request.method!=='GET'&&request.method!=='HEAD') return new Response('Método não permitido',{status:405});
 const file=ASSET_TYPES[url.pathname];
 let upstream;
 try{upstream=await fetch(ASSET_ROOT+file,{cf:{cacheEverything:true,cacheTtl:900}});}catch{return new Response('Prévia temporariamente indisponível',{status:503});}
 if(!upstream.ok) return new Response('Arquivo indisponível na origem',{status:502});
 return new Response(request.method==='HEAD'?null:upstream.body,{status:200,headers:{'Content-Type':ASSET_MIMES[file],'Cache-Control':'public,max-age=300','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https://drive.google.com https://*.googleusercontent.com data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}};