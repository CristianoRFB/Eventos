import assert from "node:assert/strict";
import worker from "./worker.mjs";
const URL_BASE="https://77-votuotakufest-piloto.on7.workers.dev";
const originalFetch=globalThis.fetch;
const captured=[];
globalThis.fetch=async (url,opts)=>{
 if(String(url).includes("turnstile/v0/siteverify"))return Response.json({success:true,hostname:"77-votuotakufest-piloto.on7.workers.dev",action:"vof_email"});
 if(String(url).includes("api.brevo.com/v3/smtp/email")){
   const body=JSON.parse(opts.body);captured.push(body);
   return Response.json({messageId:"<smoke-test@example.test>"},{status:201});
 }
 throw new Error("Unexpected network: "+url);
};
const env={
 BREVO_API_KEY:"DUMMY-SMOKE-ONLY",VOF_TURNSTILE_SECRET:"DUMMY-TURNSTILE-SMOKE",
 VOF_MAIL_LIMIT:{async limit(){return {success:true}}},
 VOF_DEMO_EMAIL_FROM:"crisf.bueno10@gmail.com"
};
const send=async payload=>worker.fetch(new Request(URL_BASE+"/api/test-email",{
 method:"POST",headers:{"Origin":URL_BASE,"Content-Type":"application/json"},
 body:JSON.stringify({...payload,turnstileToken:"synthetic-test-token-with-characters"})
}),env);
try{
 const preview=await worker.fetch(new Request(URL_BASE+"/api/ingresso-exemplo.pdf"),env);
 assert.equal(preview.status,200,"PDF preview should be downloadable without calling Brevo");
 assert.match(preview.headers.get("Content-Type")||"",/application\/pdf/);
 const previewBuf=Buffer.from(await preview.arrayBuffer());
 assert.equal(previewBuf.subarray(0,8).toString(),"%PDF-1.4");
 assert.match(previewBuf.toString(),/\/Count 4/);
 assert.match(previewBuf.toString(),/VOF-DEMO-AMOSTRA-01/);
 assert.match(previewBuf.toString(),/VOF-DEMO-AMOSTRA-04/);
 assert.equal(captured.length,0,"PDF preview must not send email");
 const ticket=await send({recipient:"buyer@sample.org",kind:"ticket-demo",reference:"VOF-DEMO-A1B2C3",ticket:{buyer:"Pessoa Exemplo",typeId:"duplo",qty:2,method:"pix",reference:"VOF-DEMO-A1B2C3"}});
 assert.equal(ticket.status,200,await ticket.text().catch(()=>""));
 assert.equal(captured.length,1);const mail=captured.at(-1);
 assert.match(mail.subject,/Ingresso/i);assert.match(mail.htmlContent,/Pessoa Exemplo/);
 assert.match(mail.htmlContent,/R\$.*140/);assert.match(mail.htmlContent,/SEM VALIDADE|SIMULACAO|NENHUM PAGAMENTO/i);
 assert.equal(mail.attachment.length,1);assert.match(mail.attachment[0].name,/^ingressos-VOF-DEMO-A1B2C3\.pdf$/);
 const buf=Buffer.from(mail.attachment[0].content,"base64");
 assert.equal(buf.subarray(0,8).toString(),"%PDF-1.4");
 assert.match(buf.toString(),/\/Count 4/);assert.match(buf.toString(),/VOF-DEMO-A1B2C3-01/);assert.match(buf.toString(),/VOF-DEMO-A1B2C3-04/);
 assert.ok(buf.subarray(-30).toString().includes("%%EOF"));
 const contest=await send({recipient:"cosplay@sample.org",kind:"contest-demo",reference:"CON-DEMO-Q2W3E4",contest:{reference:"CON-DEMO-Q2W3E4",name:"Grupo Exemplo",kind:"Cosplay",piece:"Personagem original",category:"Grupo",members:3}});
 assert.equal(contest.status,200);assert.match(captured.at(-1).attachment[0].name,/ficha-concurso/);
 assert.match(Buffer.from(captured.at(-1).attachment[0].content,"base64").toString(),/CON-DEMO-Q2W3E4/);
 const admin=await send({recipient:"admin@sample.org",kind:"demo-confirmation",reference:"VOF-DEMO-EXEMPLO"});
 assert.equal(admin.status,200);assert.equal(captured.length,3);
 const invalid=await send({recipient:"buyer@sample.org",kind:"ticket-demo",ticket:{buyer:"Pessoa",typeId:"duplo",qty:99,method:"pix",reference:"VOF-DEMO-A1B2C3"}});
 assert.equal(invalid.status,400);assert.equal(captured.length,3);
 const invalidEmail=await send({recipient:"broken@example.test",kind:"demo-confirmation"});
 assert.equal(invalidEmail.status,400);
 const otherOrigin=await worker.fetch(new Request(URL_BASE+"/api/test-email",{method:"POST",headers:{"Origin":"https://evil.example","Content-Type":"application/json"},body:JSON.stringify({recipient:"buyer@sample.org",kind:"demo-confirmation",turnstileToken:"synthetic-test-token-with-characters"})}),env);
 assert.equal(otherOrigin.status,403);
 const noTurnstile=await worker.fetch(new Request(URL_BASE+"/api/test-email",{method:"POST",headers:{"Origin":URL_BASE,"Content-Type":"application/json"},body:JSON.stringify({recipient:"buyer@sample.org",kind:"demo-confirmation"})}),env);
 assert.equal(noTurnstile.status,403);
 console.log("VOF Brevo PDF smoke PASS: 4 ticket pages, order summary, contest PDF, admin sample, invalid/cross-origin/robot protection");
} finally {globalThis.fetch=originalFetch}
