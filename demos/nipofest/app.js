/* Demonstração não oficial: apenas dados sintéticos em sessionStorage. */
(function () {
  "use strict";
  const KEY = "nipo-demo-2027-v1";
  const kinds = {"cosplay":"Cosplay","kpop-solo":"K-pop solo","kpop-grupo":"K-pop grupo"};
  const statuses = {"novo":"Novo","analise":"Em análise","aprovado":"Aprovado","credenciado":"Credenciado"};
  const seed = [
    {id:"nf-01",person:"Sakura Teste",stage:"Luar de Papel",email:"sakura@example.test",kind:"cosplay",performance:"Personagem fictício.",status:"novo"},
    {id:"nf-02",person:"Alex Exemplo",stage:"Neon Steps",email:"neon@example.test",kind:"kpop-solo",performance:"Dança fictícia.",status:"analise"},
    {id:"nf-03",person:"Equipe Cometa",stage:"Cometa Crew",email:"cometa@example.test",kind:"kpop-grupo",performance:"Apresentação fictícia.",status:"aprovado"},
    {id:"nf-04",person:"Rin Amostra",stage:"Kitsune",email:"rin@example.test",kind:"cosplay",performance:"Performance fictícia.",status:"credenciado"}
  ];
  let storageUsable = true;
  function readData() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return seed.map(x => ({...x}));
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(x => x && kinds[x.kind] && statuses[x.status] && typeof x.person === "string")) return parsed;
    } catch (_) { storageUsable = false; }
    return seed.map(x => ({...x}));
  }
  let entries = readData();
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(entries)); } catch (_) { storageUsable = false; } }
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const allowedViews = ["festival","concursos","gestao"];
  function goto(view, replace) {
    const next = allowedViews.includes(view) ? view : "festival";
    $$(".page").forEach(el => {el.hidden = el.id !== next;});
    $$("[data-view-link]").forEach(el => {
      const active = el.dataset.viewLink === next;
      el.classList.toggle("active",active);
      if (active) el.setAttribute("aria-current","page"); else el.removeAttribute("aria-current");
    });
    const url = new URL(location.href); url.searchParams.set("view",next);
    if (replace) history.replaceState({view:next},"",url); else history.pushState({view:next},"",url);
    if (next === "gestao") renderEntries();
    window.scrollTo({top:0,behavior:"instant"});
  }
  $$("[data-go]").forEach(el => el.addEventListener("click",() => goto(el.dataset.go,false)));
  $$("[data-view-link]").forEach(el => el.addEventListener("click",(e) => {e.preventDefault();goto(el.dataset.viewLink,false);}));
  $(".brand").addEventListener("click",e => {e.preventDefault();goto("festival",false);});
  window.addEventListener("popstate",() => goto(new URL(location.href).searchParams.get("view") || "festival",true));
  let selectedKind = "cosplay";
  $$("[data-kind]").forEach(button => button.addEventListener("click",() => {
    selectedKind = button.dataset.kind;
    $$("[data-kind]").forEach(el => {const active=el===button;el.classList.toggle("selected",active);el.setAttribute("aria-pressed",String(active));});
    $("#stage-name").placeholder = selectedKind === "kpop-grupo" ? "Ex.: Equipe Cometa" : selectedKind === "cosplay" ? "Ex.: Hoshi Cosplay" : "Ex.: Neon Steps";
  }));
  $("#signup").addEventListener("submit",(e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const person = $("#person-name").value.trim(), stage = $("#stage-name").value.trim();
    const email = $("#person-email").value.trim().toLowerCase();
    const performance = $("#performance").value.trim();
    const feedback = $("#form-feedback");
    if (!person || !stage || !performance || !/^[^\s@]+@example\.test$/.test(email)) {
      feedback.textContent = "Preencha os campos e use exclusivamente um e-mail fictício terminado em @example.test.";
      if (!/^[^\s@]+@example\.test$/.test(email)) $("#person-email").focus();
      return;
    }
    entries.unshift({id:"nf-"+Date.now()+"-"+Math.floor(Math.random()*1000),person,stage,email,performance,kind:selectedKind,status:"novo"});
    save();form.reset();feedback.textContent="";
    $("#form-area").hidden=true;$("#form-success").hidden=false;$("#form-success").focus();
  });
  $("#again").addEventListener("click",() => {$("#form-success").hidden=true;$("#form-area").hidden=false;$("#person-name").focus();});
  const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function renderEntries() {
    $("#total-count").textContent = String(entries.length);
    $("#review-count").textContent = String(entries.filter(x=>x.status==="analise").length);
    $("#approved-count").textContent = String(entries.filter(x=>x.status==="aprovado").length);
    $("#checked-count").textContent = String(entries.filter(x=>x.status==="credenciado").length);
    const q=$("#search").value.toLocaleLowerCase("pt-BR").trim(), kind=$("#filter-kind").value, status=$("#filter-status").value;
    const found=entries.filter(x=>(kind==="all"||x.kind===kind)&&(status==="all"||x.status===status)&&([x.person,x.stage].some(s=>s.toLocaleLowerCase("pt-BR").includes(q))));
    const root=$("#entries");root.replaceChildren();
    if (!found.length) {
      const empty=document.createElement("p");empty.className="empty";empty.textContent="Nenhum exemplo corresponde aos filtros.";root.appendChild(empty);return;
    }
    found.forEach(x=>{
      const row=document.createElement("article");row.className="entry";
      row.innerHTML='<div class="entry-person"><strong>'+escapeHTML(x.stage)+'</strong><small>'+escapeHTML(x.person)+' · '+escapeHTML(x.email)+'</small></div><span class="entry-kind">'+escapeHTML(kinds[x.kind])+'</span><span class="entry-status">'+escapeHTML(statuses[x.status])+'</span>';
      const select=document.createElement("select");select.setAttribute("aria-label","Alterar status de "+x.stage);select.dataset.entryId=x.id;
      Object.entries(statuses).forEach(([key,value])=>{const o=document.createElement("option");o.value=key;o.textContent=value;o.selected=x.status===key;select.appendChild(o);});
      row.appendChild(select);root.appendChild(row);
    });
  }
  $("#entries").addEventListener("change",(e)=>{const select=e.target.closest("select[data-entry-id]");if(!select)return;const item=entries.find(x=>x.id===select.dataset.entryId);if(item&&statuses[select.value]){item.status=select.value;save();renderEntries();}});
  ["#search","#filter-kind","#filter-status"].forEach(selector => $(selector).addEventListener(selector==="#search"?"input":"change",renderEntries));
  $("#reset-demo").addEventListener("click",()=>{
    entries=seed.map(x=>({...x}));save();$("#search").value="";$("#filter-kind").value="all";$("#filter-status").value="all";renderEntries();
  });
  if (!storageUsable) $(".board-foot").textContent += " O armazenamento da sessão está indisponível neste navegador.";
  goto(new URL(location.href).searchParams.get("view")||"festival",true);
})();
