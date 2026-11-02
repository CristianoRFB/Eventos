/* VOF commercial demonstration: public Turnstile + Brevo; no access codes or credentials in browser. */
(()=>{'use strict';
const SITEKEY='0x4AAAAAAFw9XFnxPXNSv-_3';
const widgets=new Map();
function waitReady(){
 return new Promise((resolve,reject)=>{
  if(window.turnstile?.render)return resolve();
  const start=Date.now(),poll=setInterval(()=>{
   if(window.turnstile?.render){clearInterval(poll);resolve()}
   else if(Date.now()-start>15000){clearInterval(poll);reject(new Error('A proteção automática não carregou. Verifique a conexão e desative bloqueadores para testar o e-mail.'))}
  },120);
 });
}
async function prove(containerId){
 await waitReady();
 const el=document.getElementById(containerId);
 if(!el)throw new Error('Verificação de segurança indisponível na tela.');
 if(widgets.has(containerId)){try{window.turnstile.remove(widgets.get(containerId))}catch{}widgets.delete(containerId)}
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(error,token)=>{
   if(settled)return;settled=true;clearTimeout(timeout);
   if(error)reject(error);else resolve(token);
  };
  const timeout=setTimeout(()=>finish(new Error('A verificação expirou. Tente novamente.')),45000);
  try{
   const id=window.turnstile.render(el,{
    sitekey:SITEKEY,theme:'auto',size:'flexible',execution:'execute',appearance:'execute',action:'vof_email',
    callback:token=>finish(null,token),
    'error-callback':()=>finish(new Error('A verificação automática falhou. Tente novamente.')),
    'timeout-callback':()=>finish(new Error('Verificação excedeu o tempo. Tente novamente.'))
   });
   widgets.set(containerId,id);
   window.turnstile.execute(id);
  }catch(e){finish(new Error('Não foi possível iniciar a proteção de envio. '+e.message))}
 });
}
async function send({kind,recipient,reference,ticket,contest,containerId}){
 const token=await prove(containerId);
 const body={kind,recipient,reference,turnstileToken:token};
 if(ticket)body.ticket=ticket;
 if(contest)body.contest=contest;
 try{
  const res=await fetch('/api/test-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});
  const value=await res.json().catch(()=>({message:'Resposta inválida do servidor.'}));
  if(!res.ok)throw new Error(value.message||'Falha no envio.');
  return value;
 }finally{
  const id=widgets.get(containerId);if(id!=null){try{window.turnstile.reset(id)}catch{}}
 }
}
window.VOFMail={send};
})();