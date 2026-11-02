// Deployment wrapper for the VOF 2027 non-official demo.
// Production must use static assets deploy, auth, Firestore and signed webhooks.
// Populate VOF_ASSET_REV with a reviewed commit SHA when deploying.
const DEFAULT_REV="6ec8961b153bdaf09181e21436ddc2f208537ab4";
const SOURCE="https://raw.githubusercontent.com/CristianoRFB/Eventos/";
const TYPES={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8"};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"Content-Type":"application/json;charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==="/health")return json({ok:true,mode:"simulation",brevo_secret_configured:!!env.BREVO_API_KEY,email_test_enabled:!!env.VOF_DEMO_EMAIL_TOKEN});
 if(path==="/api/test-email"){
  if(request.method!=="POST")return json({message:"Método não permitido"},405);
  const origin=request.headers.get("Origin");if(origin&&origin!==url.origin)return json({message:"Origem não autorizada"},403);
  if(!env.BREVO_API_KEY||!env.VOF_DEMO_EMAIL_TOKEN)return json({message:"Teste real desativado até configurar código de autorização."},503);
  const token=request.headers.get("X-VOF-Demo-Token")||"";
  if(token.length<16||token.length>256||token!==env.VOF_DEMO_EMAIL_TOKEN)return json({message:"Autorização inválida"},401);
  if(Number(request.headers.get("Content-Length")||0)>1200)return json({message:"Solicitação muito grande"},413);
  let data;try{data=await request.json()}catch{return json({message:"Dados inválidos"},400)}
  if(data?.kind!=="demo-confirmation")return json({message:"Tipo de teste inválido"},400);
  const message={sender:{name:"VOF 2027 — Demonstração",email:"crisf.bueno10@gmail.com"},to:[{name:"Cristiano — Teste VOF",email:"crisf.bueno10@gmail.com"}],subject:"[DEMO NÃO OFICIAL] Teste de e-mail — VOF 2027",htmlContent:"<main style='font-family:Arial;max-width:570px;margin:auto;padding:32px'><h1>Seu teste chegou! ✦</h1><p>Mensagem de teste do protótipo comercial VOF 2027.</p><p><strong>DEMONSTRAÇÃO NÃO OFICIAL:</strong> nenhum ingresso, pagamento ou inscrição foi processado.</p></main>"};
  try{const res=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"api-key":env.BREVO_API_KEY,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(message)});const data=await res.json().catch(()=>({}));return res.ok?json({message:"E-mail de teste aceito pela Brevo para a caixa autorizada.",messageId:String(data.messageId||"").slice(0,120)}):json({message:"Brevo recusou o teste (HTTP "+res.status+"). Verifique remetente e conta."},502)}catch{return json({message:"Falha no serviço de envio."},502)}
 }
 const file={"/":"index.html","/index.html":"index.html","/style.css":"style.css","/app.js":"app.js"}[path];
 if(!file)return new Response("Não encontrado",{status:404});
 if(!["GET","HEAD"].includes(request.method))return new Response("Método não permitido",{status:405});
 const revision=env.VOF_ASSET_REV||DEFAULT_REV;
 if(!/^[0-9a-f]{40}$/.test(revision))return new Response("Asset revision inválida",{status:503});
 const target=SOURCE+revision+"/demos/votuotakufest/suprema/"+file;
 try{const result=await fetch(target,{cf:{cacheEverything:true,cacheTtl:120}});if(!result.ok)return new Response("Asset indisponível",{status:503});
 const ext=file.slice(file.lastIndexOf("."));
 return new Response(request.method==="HEAD"?null:result.body,{status:200,headers:{"Content-Type":TYPES[ext],"Cache-Control":"public,max-age=120","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex,nofollow","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https://drive.google.com https://lh3.googleusercontent.com data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}});
 }catch{return new Response("Prévia temporariamente indisponível",{status:503})}
 }};
