/* Crazy Geek Fest — conceito NÃO OFICIAL. Todos os dados permanecem no navegador. */
(() => {
  "use strict";
  const KEY = "77-crazygeek-conceito-v1";
  const allowedViews = ["festival", "participar", "gestao"];
  const allowedStatus = ["novo", "analise", "concluido"];
  const initial = () => ({
    agenda: [
      { id: "ag-1", time: "13:00", category: "Comunidade", title: "Boas-vindas ao universo geek (exemplo)" },
      { id: "ag-2", time: "14:30", category: "Cosplay", title: "Encontro de cosplayers (exemplo)" },
      { id: "ag-3", time: "16:00", category: "Games", title: "Desafio gamer da comunidade (exemplo)" }
    ],
    entries: [
      { id: "pt-1", name: "Ateliê Nebulosa", email: "nebulosa@example.test", role: "Expositor", description: "Peças e acessórios imaginários.", status: "novo" },
      { id: "pt-2", name: "Luna Cosplay", email: "luna@example.test", role: "Cosplay", description: "Personagem original fictícia.", status: "analise" },
      { id: "pt-3", name: "Cometa Art", email: "cometa@example.test", role: "Artista", description: "Ilustrações conceituais.", status: "novo" }
    ]
  });
  const canUseStorage = (() => {
    try { sessionStorage.setItem("__77_test", "1"); sessionStorage.removeItem("__77_test"); return true; }
    catch { return false; }
  })();
  const validEntry = e => e && typeof e.id === "string" && typeof e.name === "string" && typeof e.role === "string" && allowedStatus.includes(e.status);
  const validAgenda = a => a && typeof a.id === "string" && typeof a.time === "string" && typeof a.title === "string" && typeof a.category === "string";
  const load = () => {
    if (!canUseStorage) return initial();
    try {
      const v = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (v && Array.isArray(v.agenda) && Array.isArray(v.entries) && v.agenda.every(validAgenda) && v.entries.every(validEntry)) return v;
    } catch { /* Corrupted/demo storage: reset fixtures. */ }
    return initial();
  };
  let data = load();
  let toastTimeout;
  const $ = selector => document.querySelector(selector);
  const el = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined && content !== null) node.textContent = String(content);
    return node;
  };
  function store() {
    if (!canUseStorage) return;
    try { sessionStorage.setItem(KEY, JSON.stringify(data)); }
    catch { toast("Armazenamento indisponível: alterações só valem até recarregar."); }
  }
  function toast(message) {
    const node = $("#toast");
    if (!node) return;
    window.clearTimeout(toastTimeout);
    node.textContent = message;
    node.hidden = false;
    toastTimeout = window.setTimeout(() => { node.hidden = true; }, 3400);
  }
  function currentView() {
    const value = new URLSearchParams(location.search).get("view") || "festival";
    return allowedViews.includes(value) ? value : "festival";
  }
  function setView(view, updateHistory = false) {
    if (!allowedViews.includes(view)) view = "festival";
    if (updateHistory) {
      const url = new URL(location.href);
      url.searchParams.set("view", view);
      url.hash = "";
      history.pushState({ view }, "", url);
    }
    for (const panel of document.querySelectorAll("[data-view-panel]")) {
      panel.hidden = panel.id !== view;
    }
    for (const link of document.querySelectorAll("[data-view-link]")) {
      if (link.dataset.viewLink === view) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    document.title = (view === "festival" ? "Festival" : view === "participar" ? "Participar" : "Organização demo") + " • Crazy Geek Fest — conceito não oficial";
    if (updateHistory) window.scrollTo({ top: 0, behavior: "instant" });
    if (view === "festival") renderPublicSchedule();
    if (view === "gestao") renderAdmin();
  }
  function navigate(event) {
    const button = event.target.closest("[data-go]");
    if (!button) return;
    event.preventDefault();
    setView(button.dataset.go, true);
  }
  const statusLabel = status => ({ novo: "Novo", analise: "Em análise", concluido: "Concluído" }[status] || "Novo");
  function renderPublicSchedule() {
    const host = $("#public-schedule");
    host.replaceChildren();
    const agenda = [...data.agenda].sort((a,b) => a.time.localeCompare(b.time));
    if (!agenda.length) {
      host.append(el("p", "empty-msg", "Nenhuma atividade de exemplo cadastrada. Abra Organização para adicionar uma."));
      return;
    }
    agenda.forEach(item => {
      const row = el("article", "schedule-row");
      row.append(el("strong", "schedule-time", item.time));
      const info = el("div", "schedule-event");
      info.append(el("h3", "", item.title));
      info.append(el("small", "", item.category + " · Demonstração"));
      row.append(info);
      row.append(el("span", "schedule-star", "✳"));
      host.append(row);
    });
  }
  function renderMetrics() {
    const count = status => data.entries.filter(item => item.status === status).length;
    $("#metric-total").textContent = String(data.entries.length);
    $("#metric-wait").textContent = String(count("novo"));
    $("#metric-review").textContent = String(count("analise"));
    $("#metric-agenda").textContent = String(data.agenda.length);
  }
  function renderEntries() {
    const host = $("#entries-list");
    host.replaceChildren();
    const q = $("#search-entries").value.trim().toLocaleLowerCase("pt-BR");
    const filter = $("#status-entries").value;
    const items = data.entries.filter(item => {
      const matchStatus = filter === "all" || item.status === filter;
      const matchName = (item.name + " " + item.role).toLocaleLowerCase("pt-BR").includes(q);
      return matchStatus && matchName;
    });
    if (!items.length) {
      host.append(el("p", "empty-msg", "Nenhum registro fictício corresponde à busca."));
      return;
    }
    items.forEach(item => {
      const row = el("article", "entry-item");
      const detail = el("div");
      detail.append(el("span", "entry-kind", item.role));
      detail.append(el("strong", "", item.name));
      detail.append(el("small", "", (item.email || "example.test") + " · exemplo"));
      row.append(detail);
      const select = el("select");
      select.setAttribute("aria-label", "Status do registro fictício " + item.name);
      allowedStatus.forEach(status => {
        const opt = el("option", "", statusLabel(status));
        opt.value = status;
        select.append(opt);
      });
      select.value = item.status;
      select.addEventListener("change", () => {
        item.status = select.value;
        store();
        renderMetrics();
        renderEntries();
        toast("Status alterado apenas nesta simulação.");
      });
      row.append(select);
      host.append(row);
    });
  }
  function renderAgendaAdmin() {
    const host = $("#admin-agenda-list");
    host.replaceChildren();
    if (!data.agenda.length) host.append(el("p", "empty-msg", "Adicione uma atividade de exemplo acima."));
    [...data.agenda].sort((a,b) => a.time.localeCompare(b.time)).forEach(item => {
      const row = el("div", "agenda-admin-item");
      const detail = el("div");
      detail.append(el("strong", "", item.time + " · " + item.title));
      detail.append(el("small", "", item.category + " — conteúdo inventado"));
      row.append(detail);
      const del = el("button", "", "Excluir");
      del.type = "button";
      del.setAttribute("aria-label", "Excluir atividade de exemplo " + item.title);
      del.addEventListener("click", () => {
        data.agenda = data.agenda.filter(a => a.id !== item.id);
        store(); renderAdmin(); renderPublicSchedule();
        toast("Atividade fictícia excluída.");
      });
      row.append(del);
      host.append(row);
    });
  }
  function renderAdmin() { renderMetrics(); renderEntries(); renderAgendaAdmin(); }
  function join(event) {
    event.preventDefault();
    const form = $("#join-form");
    if (!form.reportValidity()) return;
    const name = $("#join-name").value.trim();
    const email = $("#join-email").value.trim().toLowerCase();
    const description = $("#join-desc").value.trim();
    const role = form.querySelector('input[name="role"]:checked')?.value || "Expositor";
    const feedback = $("#join-feedback");
    if (!name || !description || !/^[a-z0-9.!#$%&'*+/=?^`{|}~-]+@example\.test$/i.test(email)) {
      feedback.textContent = "Preencha os campos com dados fictícios e use um e-mail @example.test.";
      return;
    }
    if (!$("#accept-demo").checked) {
      feedback.textContent = "Confirme que esta experiência não envia uma inscrição real.";
      return;
    }
    data.entries.unshift({ id: "pt-" + Date.now() + "-" + Math.floor(Math.random()*1000), name, email, description, role, status: "novo" });
    store();
    form.reset();
    feedback.textContent = "";
    $("#participation-form-area").hidden = true;
    $("#join-success").hidden = false;
    $("#join-success").focus();
    toast("Participação fictícia criada. Sem envio para o evento.");
  }
  function reset() {
    data = initial();
    if (canUseStorage) { try { sessionStorage.removeItem(KEY); } catch { /* no-op */ } }
    renderAdmin(); renderPublicSchedule();
    $("#join-form").reset();
    $("#participation-form-area").hidden = false;
    $("#join-success").hidden = true;
    $("#search-entries").value = "";
    $("#status-entries").value = "all";
    renderEntries();
    toast("Dados locais restaurados. Nada foi enviado.");
  }
  document.addEventListener("click", navigate);
  window.addEventListener("popstate", () => setView(currentView()));
  $("#join-form").addEventListener("submit", join);
  $("#join-again").addEventListener("click", () => {
    $("#participation-form-area").hidden = false;
    $("#join-success").hidden = true;
    $("#join-name").focus();
  });
  $("#fill-example").addEventListener("click", () => {
    $("#join-name").value = "Atelier Estrela Teste";
    $("#join-email").value = "estrela@example.test";
    $("#join-desc").value = "Exposição imaginária de artes e acessórios geek.";
    $("#accept-demo").checked = true;
    toast("Exemplo fictício preenchido. Confirme para simular.");
  });
  $("#agenda-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const title = $("#agenda-title").value.trim();
    const time = $("#agenda-time").value;
    const category = $("#agenda-category").value;
    if (!title || !/^\d{2}:\d{2}$/.test(time) || data.agenda.length >= 25) {
      toast("Informe título e horário válidos (máximo de 25 atividades)."); return;
    }
    data.agenda.push({ id:"ag-" + Date.now(), title, time, category });
    store(); renderAdmin(); renderPublicSchedule();
    $("#agenda-title").value = "";
    toast("Atividade fictícia publicada no portal desta sessão.");
  });
  $("#search-entries").addEventListener("input", renderEntries);
  $("#status-entries").addEventListener("change", renderEntries);
  $("#reset-demo").addEventListener("click", reset);
  $("#reset-from-footer").addEventListener("click", reset);
  setView(currentView());
})();
