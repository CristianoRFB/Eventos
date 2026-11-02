// VOF 2027 — non-official concept. Public mail requires consent, Turnstile and rate limits.
// NO REAL PAYMENTS: all items and prices are illustrative.
// Never expose BREVO_API_KEY or VOF_TURNSTILE_SECRET to the frontend.
const SOURCE="https://raw.githubusercontent.com/CristianoRFB/Eventos/";
const DEFAULT_REV="8f55d8f6bf96170b1c6775df4c833470795a56da";
const ASSETS={"/":"index.html","/index.html":"index.html","/style.css":"style.css","/app.js":"app.js","/mail-demo.js":"mail-demo.js","/demo-qr.svg":"demo-qr.svg"};
const TYPES={html:"text/html; charset=utf-8",css:"text/css; charset=utf-8",js:"application/javascript; charset=utf-8",svg:"image/svg+xml; charset=utf-8"};
const HOST="77-votuotakufest-piloto.on7.workers.dev",ACTION="vof_email";
const CATALOG={individual:{name:"Ingresso individual",price:40,accesses:1},duplo:{name:"Ingresso duplo",price:70,accesses:2},solidario:{name:"Ingresso solidario",price:30,accesses:1}};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex"}});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const val=s=>String(s??"").trim().slice(0,160);
const money=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const ascii=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g,"?").slice(0,120);
const pdfStr=s=>"("+ascii(s).replace(/[\\()]/g,"\\$&")+")";
function validEmail(v){return typeof v==="string"&&v.length>=6&&v.length<=254&&/^[^\s@<>"']+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(v)&&!/@example\.(test|invalid)$/i.test(v)}
function orderFrom(data){
 const typeId=data.ticket?.typeId,product=CATALOG[typeId],qty=Number(data.ticket?.qty);
 if(!product||!Number.isInteger(qty)||qty<1||qty>4)throw new Error("Selecao ou quantidade de ingressos invalida.");
 const buyer=val(data.ticket?.buyer),reference=val(data.ticket?.reference||data.reference);
 if(buyer.length<3||buyer.length>80||!/^VOF-DEMO-[A-Z0-9]{6,12}$/.test(reference))throw new Error("Dados do pedido ficticio invalidos.");
 const method=data.ticket?.method;if(method!=="pix"&&method!=="card")throw new Error("Metodo de simulacao invalido.");
 return {buyer,reference,product,qty,total:product.price*qty,method:method==="pix"?"Pix demonstrativo":"Cartao demonstrativo",accesses:product.accesses,recipient:data.recipient};
}
function makeSample(recipient){return {buyer:"Visitante de demonstracao",reference:"VOF-DEMO-EXEMPLO",product:CATALOG.individual,qty:1,total:40,method:"Pix demonstrativo",accesses:1,recipient}}
function contestFrom(data){
 const d=data.contest||{},kind=d.kind, name=val(d.name),piece=val(d.piece),category=val(d.category);
 const count=Number(d.members),reference=val(d.reference||data.reference);
 if(!["Cosplay","K-pop"].includes(kind)||name.length<3||piece.length<3||!Number.isInteger(count)||count<1||count>20||!/^CON-DEMO-[A-Z0-9]{6,12}$/.test(reference))throw new Error("Dados de concurso invalidos.");
 return {kind,name,piece,category,count,reference};
}
// Compact standalone PDF writer: each ticket on an independent, printable A4-like page.
// No third-party package, remote PDF hosting, or private user data persisted.
function pdfPages(sheets){
 const pages=sheets.slice(0,8);
 const objs=["<< /Type /Catalog /Pages 2 0 R >>","","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"];
 const kids=[];
 function text(line,x,y,size=12,bold=false,rgb="0.15 0.11 0.24"){
  return "BT /F"+(bold?"2":"1")+" "+size+" Tf "+rgb+" rg 1 0 0 1 "+x+" "+y+" Tm "+pdfStr(line)+" Tj ET\n";
 }
 for(const sheet of pages){
  const pageId=objs.length+1,streamId=pageId+1;
  kids.push(pageId+" 0 R");
  let content="q 0.065 0.045 0.13 rg 0 690 595 152 re f Q\n";
  content+="q 0.84 0.98 0.47 rg 46 706 503 8 re f Q\n";
  content+=text("VOF 2027 / CONEXAO DE MUNDOS",46,790,23,true,"1 1 1");
  content+=text("DOCUMENTO DEMONSTRATIVO - SEM VALIDADE",46,757,12,true,"0.86 0.98 0.47");
  content+=text(sheet.title,46,642,22,true);
  content+=text("Documento emitido apenas para apresentacao comercial.",46,617,11);
  let y=564;
  for(const [label,value] of sheet.rows){
   content+=text(ascii(label).toUpperCase(),48,y,10,true,"0.38 0.29 0.59");
   content+=text(value,48,y-21,14,false);
   content+="q 0.88 0.86 0.92 rg 48 "+(y-34)+" 499 0.7 re f Q\n";
   y-=59;
  }
  content+="q 0.94 0.89 0.99 rg 47 108 501 64 re f Q\n";
  content+=text("NENHUM PAGAMENTO REAL FOI EFETUADO.",59,144,14,true,"0.39 0.13 0.56");
  content+=text("Este codigo NAO autoriza entrada no festival.",59,123,11);
  content+=text("Votu Otaku Fest 2027 | Material nao oficial | Cristiano TI",47,55,10,false,"0.46 0.41 0.50");
  const bytes=new TextEncoder().encode(content);
  objs.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents "+streamId+" 0 R >>");
  objs.push("<< /Length "+bytes.length+" >>\nstream\n"+content+"endstream");
 }
 objs[1]="<< /Type /Pages /Kids ["+kids.join(" ")+"] /Count "+kids.length+" >>";
 let pdf="%PDF-1.4\n",offsets=[0];
 for(let i=0;i<objs.length;i++){offsets.push(new TextEncoder().encode(pdf).length);pdf+=(i+1)+" 0 obj\n"+objs[i]+"\nendobj\n";}
 const start=new TextEncoder().encode(pdf).length;
 pdf+="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n";
 for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
 pdf+="trailer\n<< /Size "+(objs.length+1)+" /Root 1 0 R >>\nstartxref\n"+start+"\n%%EOF\n";
 const bytes=new TextEncoder().encode(pdf);
 let base64="";for(let i=0;i<bytes.length;i+=12288){let s="";for(const b of bytes.subarray(i,i+12288))s+=String.fromCharCode(b);base64+=btoa(s);}
 return {content:base64,bytes:bytes.length};
}
function makeTicketPDF(order){
 const count=order.qty*order.accesses,at=new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
 const rows=[];
 for(let i=1;i<=count;i++)rows.push({title:"INGRESSO DEMO "+i+" / "+count,rows:[
 ["CODIGO INDIVIDUAL",order.reference+"-"+String(i).padStart(2,"0")],
 ["PARTICIPANTE (FICTICIO)",order.buyer],
 ["TIPO DE INGRESSO",order.product.name],
 ["PEDIDO / QUANTIDADE",order.reference+" | "+order.qty+" pacote(s) / "+count+" acesso(s)"],
 ["PAGAMENTO DEMONSTRADO",order.method],
 ["VALOR TOTAL ILUSTRATIVO",money(order.total)],
 ["GERADO EM",at]]});
 return pdfPages(rows);
}
function makeContestPDF(c){
 return pdfPages([{title:"FICHA DE CONCURSO DEMO",rows:[
 ["PROTOCOLO FICTICIO",c.reference],["PARTICIPANTE / GRUPO",c.name],["MODALIDADE",c.kind],
 ["CATEGORIA",c.category],["INTEGRANTES",String(c.count)],["APRESENTACAO",c.piece],["STATUS","Inscricao demonstrativa, nao oficial"]]}]);
}
function renderEmail({recipient,order,contest,kind}){
 const ticket=kind!=="contest-demo",subject=kind==="contest-demo"?"[DEMO] Sua ficha de concurso VOF 2027":"[DEMO] Ingresso e comprovante ilustrativo VOF 2027";
 const items=ticket?[
 ["Codigo do pedido",order.reference],["Comprador",order.buyer],
 ["Produto",order.product.name],["Quantidade",order.qty+" pacote(s) / "+(order.qty*order.accesses)+" ingresso(s)"],
 ["Preco unitario ficticio",money(order.product.price)],["Total ilustrativo",money(order.total)],
 ["Meio de pagamento simulado",order.method],["Situacao","SIMULACAO - NENHUM PAGAMENTO EFETUADO"]
 ]:[
 ["Protocolo",contest.reference],["Participante",contest.name],["Modalidade",contest.kind],
 ["Categoria",contest.category],["Integrantes",contest.count],["Apresentacao",contest.piece],
 ["Situacao","INSCRICAO FICTICIA / SEM VAGA RESERVADA"]];
 const rows=items.map(([k,v])=>"<tr><td style='padding:12px 15px;border-bottom:1px solid #e8e2f0;color:#625878;font-weight:bold'>"+esc(k)+"</td><td style='padding:12px 15px;border-bottom:1px solid #e8e2f0;color:#19132a'>"+esc(v)+"</td></tr>").join("");
 const html="<div style='background:#f4f0fb;padding:25px 8px;font-family:Arial,sans-serif'><table role='presentation' style='max-width:650px;width:100%;margin:auto;border-collapse:collapse;background:#fff;border-radius:16px;overflow:hidden'><tr><td style='background:#170d2a;padding:32px 24px;color:#e1fe91'><b style='font-size:13px;letter-spacing:2px'>VOTU OTAKU FEST 2027</b><h1 style='color:#fff;font-size:29px;line-height:1.2;margin:16px 0 8px'>"+(ticket?"Seu ingresso de demonstração chegou!":"Sua ficha de demonstração chegou!")+"</h1><p style='color:#e4d9f6;margin:0'>Conceito de sistema comercial independente • Cristiano TI</p></td></tr><tr><td style='padding:24px'><p style='font-size:15px;line-height:1.6'>"+(ticket?"Simulamos sua compra e preparamos "+order.qty*order.accesses+" ingresso(s) de exemplo.":"Sua inscrição de concurso foi simulada e a ficha está em anexo.")+" O arquivo <b>PDF está anexado</b> a este e-mail.</p><table role='presentation' style='border-collapse:collapse;width:100%;font-size:13px'>"+rows+"</table><p style='padding:14px;margin:24px 0;background:#f3eaff;border-left:4px solid #7c4de0;line-height:1.6'><b>DEMONSTRAÇÃO SEM VALIDADE:</b> isto não representa compra, pagamento, inscrição oficial nem direito de entrada. Valores, produtos e data do evento ainda não são oficiais.</p><p style='font-size:12px;color:#685c74'>Recebido porque houve uma solicitação expressa de teste no protótipo. <a href='https://www.votuotakufestoficial.com/'>Consultar site oficial do evento</a>.</p></td></tr></table></div>";
 return {subject,html};
}
async function verifyHuman(token,env,request){
 if(!env.VOF_TURNSTILE_SECRET||typeof token!=="string"||token.length<20||token.length>2048)return false;
 try{const ip=request.headers.get("CF-Connecting-IP")||"";const res=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.VOF_TURNSTILE_SECRET,response:token,...(ip?{remoteip:ip}:{})})});if(!res.ok)return false;const result=await res.json();return result.success===true&&result.hostname===HOST&&result.action===ACTION;}catch{return false}
}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==="/api/ingresso-exemplo.pdf"){
  if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Metodo nao permitido",{status:405});
  const example={...makeSample("exemplo@example.test"),product:CATALOG.duplo,qty:2,accesses:CATALOG.duplo.accesses,total:140,reference:"VOF-DEMO-AMOSTRA"};
  const generated=makeTicketPDF(example);
  const bytes=Uint8Array.from(atob(generated.content),c=>c.charCodeAt(0));
  return new Response(request.method==="HEAD"?null:bytes,{headers:{"Content-Type":"application/pdf","Content-Disposition":'inline; filename="VOF-2027-ingressos-DEMO-exemplo.pdf"',"Cache-Control":"no-store","X-Robots-Tag":"noindex,nofollow","X-Content-Type-Options":"nosniff"}});
 }
 if(path==="/health")return json({ok:true,mode:"demo",email_service:!!env.BREVO_API_KEY,turnstile:!!env.VOF_TURNSTILE_SECRET,rate_limiter:!!env.VOF_MAIL_LIMIT});
 if(path==="/api/test-email"){
  if(request.method!=="POST")return json({message:"Metodo nao permitido."},405);
  const origin=request.headers.get("Origin");if(origin&&origin!==url.origin)return json({message:"Origem nao autorizada."},403);
  if(request.headers.get("Sec-Fetch-Site")==="cross-site")return json({message:"Chamada externa bloqueada."},403);
  if(!env.BREVO_API_KEY||!env.VOF_TURNSTILE_SECRET||!env.VOF_MAIL_LIMIT)return json({message:"O envio demonstrativo nao esta configurado no servidor."},503);
  const length=Number(request.headers.get("Content-Length")||"0");if(length>3000)return json({message:"Formulario excede o tamanho permitido."},413);
  let data;try{data=await request.json()}catch{return json({message:"Formulario invalido."},400)}
  if(!validEmail(data?.recipient)||!["ticket-demo","contest-demo","demo-confirmation"].includes(data?.kind))return json({message:"Informe seu e-mail real e conclua um dos fluxos de demonstracao."},400);
  let order=null,contest=null;try{if(data.kind==="ticket-demo")order=orderFrom(data);else if(data.kind==="contest-demo")contest=contestFrom(data);else order=makeSample(data.recipient)}catch(e){return json({message:e.message},400)}
  if(!await verifyHuman(data.turnstileToken,env,request))return json({message:"Verificacao de seguranca nao concluida. Atualize o desafio e tente novamente."},403);
  const recipient=data.recipient.trim().toLowerCase();
  // Fail closed: per-colo limits (CF RateLimit is approximate) + one-use human tokens.
  try{
    const ip=(request.headers.get("CF-Connecting-IP")||"unknown").slice(0,90);
    for(const key of ["vof-demo-global","vof-ip:"+ip,"vof-recipient:"+recipient]){
      const result=await env.VOF_MAIL_LIMIT.limit({key});
      if(!result.success)return json({message:"Limite de envios de teste atingido. Tente novamente mais tarde."},429);
    }
  }catch{return json({message:"Protecao de e-mail indisponivel no momento."},503)}
  const {subject,html}=renderEmail({recipient,order,contest,kind:data.kind});
  const pdf=contest?makeContestPDF(contest):makeTicketPDF(order);
  if(pdf.bytes>500000)return json({message:"PDF do exemplo muito grande."},413);
  const filename=(contest?"ficha-concurso-":"ingressos-")+(contest?contest.reference:order.reference)+".pdf";
  const body={sender:{name:"VOF 2027 - Demonstracao",email:env.VOF_DEMO_EMAIL_FROM||"crisf.bueno10@gmail.com"},to:[{email:recipient}],subject,htmlContent:html,attachment:[{content:pdf.content,name:filename}],tags:["vof2027-demo","pdf-ficticio"]};
  try{
    const result=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json","api-key":env.BREVO_API_KEY},body:JSON.stringify(body)});
    if(!result.ok)return json({message:"Brevo recusou a solicitacao (HTTP "+result.status+"). Confira a configuracao do remetente."},502);
    const reply=await result.json().catch(()=>({}));
    return json({message:"Email de demonstracao aceito pela Brevo com PDF anexado. Entrega nao garantida.",filename,bytes:pdf.bytes,messageId:String(reply.messageId||"").slice(0,125)});
  }catch{return json({message:"Brevo indisponivel neste momento."},502)}
 }
 const file=ASSETS[path];if(!file)return new Response("Nao encontrado",{status:404});
 if(!["GET","HEAD"].includes(request.method))return new Response("Metodo nao permitido",{status:405});
 const revision=env.VOF_ASSET_REV||DEFAULT_REV;if(!/^[0-9a-f]{40}$/.test(revision))return new Response("Revisao invalida",{status:503});
 try{
   const response=await fetch(SOURCE+revision+"/demos/votuotakufest/suprema/"+file,{cf:{cacheEverything:true,cacheTtl:90}});
   if(!response.ok)return new Response("Arquivo indisponivel",{status:503});
   const ext=file.slice(file.lastIndexOf(".")+1);
   return new Response(request.method==="HEAD"?null:response.body,{status:200,headers:{
     "Content-Type":TYPES[ext],"Cache-Control":"public,max-age=90","X-Content-Type-Options":"nosniff",
     "X-Robots-Tag":"noindex,nofollow","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer",
     "Content-Security-Policy":"default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://challenges.cloudflare.com; font-src https://fonts.gstatic.com; img-src 'self' https://drive.google.com https://lh3.googleusercontent.com https://static.wixstatic.com https://acidadevotuporanga.com.br https://www.acidadevotuporanga.com.br https://challenges.cloudflare.com data:; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
   }});
 }catch{return new Response("Previa temporariamente indisponivel",{status:503})}
}};
