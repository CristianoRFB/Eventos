// VOF 2027 commercial demo — safe cloud entrypoint, not a production box office.
// All commerce and contest state is client-side demo. Only explicit Brevo mail tests are real.
const SOURCE="https://raw.githubusercontent.com/CristianoRFB/Eventos/";
const DEFAULT_REV="22adba177da249b8a18743ad2b763b511c52602c";
const ASSETS={"/":"index.html","/index.html":"index.html","/style.css":"style.css","/app.js":"app.js","/demo-qr.svg":"demo-qr.svg"};
const TYPES={html:"text/html; charset=utf-8",css:"text/css; charset=utf-8",js:"application/javascript; charset=utf-8",svg:"image/svg+xml; charset=utf-8"};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Access-Control-Allow-Origin":"null"}});
function validEmail(value){if(typeof value!=="string"||value.length>254||value.length<6)return false;const s=value.trim();return /^[^\s@<>"']+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)&&!/@example\.(test|invalid)$/i.test(s)}
async function constantTimeEqual(a,b){if(typeof a!=="string"||typeof b!=="string"||!b||a.length<16||a.length>256||a.length!==b.length)return false;const te=new TextEncoder(),x=te.encode(a),y=te.encode(b);let mismatch=0;for(let i=0;i<x.length;i++)mismatch|=x[i]^y[i];return mismatch===0}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==="/health")return json({ok:true,mode:"simulation",email_test_enabled:!!(env.BREVO_API_KEY&&env.VOF_DEMO_EMAIL_TOKEN),rate_limiter:!!env.VOF_MAIL_LIMIT});
 if(path==="/api/test-email"){
  if(request.method!=="POST")return json({message:"Método não permitido."},405);
  const origin=request.headers.get("Origin");if(origin&&origin!==url.origin)return json({message:"Origem não autorizada."},403);
  if(!env.BREVO_API_KEY||!env.VOF_DEMO_EMAIL_TOKEN)return json({message:"Envio real de teste desativado; falta a autorização do painel."},503);
  const provided=request.headers.get("X-VOF-Demo-Token")||"";
  if(!await constantTimeEqual(provided,env.VOF_DEMO_EMAIL_TOKEN))return json({message:"Código de autorização incorreto."},401);
  if(Number(request.headers.get("Content-Length")||"0")>900)return json({message:"Solicitação excede o tamanho permitido."},413);
  let data;try{data=await request.json()}catch{return json({message:"Dados de solicitação inválidos."},400)}
  const kind=data?.kind,allowed=new Set(["demo-confirmation","ticket-demo","contest-demo"]);if(!allowed.has(kind)||!validEmail(data?.recipient))return json({message:"Informe um e-mail real válido e uma modalidade de teste."},400);
  const recipient=data.recipient.trim().toLowerCase();
  const reference=typeof data.reference==="string"&&/^[A-Z0-9-]{6,50}$/.test(data.reference)?data.reference:"SEM-PROTOCOLO";
  // Approximate per-location Cloudflare limiter; the private code remains required independently.
  if(env.VOF_MAIL_LIMIT){try{const ip=(request.headers.get("CF-Connecting-IP")||"unknown").slice(0,90);const first=await env.VOF_MAIL_LIMIT.limit({key:"vof-demo-sender-global"});const second=await env.VOF_MAIL_LIMIT.limit({key:"ip:"+ip});const third=await env.VOF_MAIL_LIMIT.limit({key:"to:"+recipient});if(!first.success||!second.success||!third.success)return json({message:"Limite de demonstrações atingido. Tente novamente em alguns minutos."},429)}catch{return json({message:"Proteção de envio temporariamente indisponível."},503)}}
  const senderEmail=env.VOF_DEMO_EMAIL_FROM||"crisf.bueno10@gmail.com";
  const htmlContent="<div style='font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:28px;background:#fff'><div style='background:#1b1035;padding:22px;color:#e0ff86;border-radius:8px'><b>VOTU OTAKU FEST · 2027</b><h1 style='color:white;margin:14px 0 4px'>O teste funcionou! ✦</h1><p style='color:#d8cfeb'>Este e-mail foi enviado de verdade pela API da Brevo.</p></div><p>Você recebeu esta mensagem porque alguém com código administrativo solicitou um teste ao seu endereço no site de demonstração.</p><p><b>Importante:</b> isto não é um ingresso, não confirma pagamento, inscrição ou participação oficial. É apenas uma demonstração de entrega transacional.</p><p style='font-size:12px;color:#777'>Para dúvidas sobre o evento, contate a organização pelo site oficial.</p></div>";
  const isTicket=kind==="ticket-demo",isContest=kind==="contest-demo";
  const subject=isTicket?"[DEMONSTRAÇÃO] Seu ingresso de teste VOF 2027":isContest?"[DEMONSTRAÇÃO] Inscrição fictícia VOF 2027":"[TESTE REAL] VOF 2027 — Seu e-mail chegou!";
  const referenceHtml=isTicket||isContest?"<p style='padding:14px;background:#f1eafc;border-left:4px solid #7c4ed9'><b>Protocolo de demonstração: "+reference+"</b></p>":"";
  const payload={sender:{name:"VOF 2027 — Demonstração",email:senderEmail},to:[{email:recipient}],subject,htmlContent:htmlContent.replace("</div>","</div>"+referenceHtml),headers:{"X-Mailin-custom":"demo:vof2027|commercial:no|ticket:false"}};
  try{const result=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"Content-Type":"application/json","api-key":env.BREVO_API_KEY,"Accept":"application/json"},body:JSON.stringify(payload)});const response=await result.json().catch(()=>({}));if(!result.ok)return json({message:"A Brevo recusou o teste (HTTP "+result.status+"). Verifique a conta e a autenticação do remetente."},502);return json({message:"Solicitação aceita pela Brevo. Entrega depende do provedor e do destinatário.",messageId:String(response.messageId||"").slice(0,120)})}catch{return json({message:"A API de e-mails não respondeu neste momento."},502)}
 }
 const file=ASSETS[path];if(!file)return new Response("Não encontrado",{status:404});
 if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Método não permitido",{status:405});
 const revision=env.VOF_ASSET_REV||DEFAULT_REV;if(!/^[0-9a-f]{40}$/.test(revision))return new Response("Revisão não encontrada",{status:503});
 try{const target=SOURCE+revision+"/demos/votuotakufest/suprema/"+file;const result=await fetch(target,{cf:{cacheEverything:true,cacheTtl:90}});if(!result.ok)return new Response("Arquivo indisponível",{status:503});const ext=file.slice(file.lastIndexOf(".")+1);return new Response(request.method==="HEAD"?null:result.body,{status:200,headers:{"Content-Type":TYPES[ext],"Cache-Control":"public,max-age=90","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex,nofollow","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https://drive.google.com https://lh3.googleusercontent.com https://static.wixstatic.com https://acidadevotuporanga.com.br https://www.acidadevotuporanga.com.br data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}})}catch{return new Response("Prévia temporariamente indisponível",{status:503})}
 }};
