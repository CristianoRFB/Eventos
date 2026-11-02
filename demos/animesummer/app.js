/* global document, sessionStorage, window, location, URLSearchParams, URL, history */
/* Anime Summer RP — standalone, non-official, browser-only concept.
   Nothing reaches real organizer, database, analytics, payment or messaging services. */
(() => {
  "use strict";
  const KEY = "eventos77-animesummer-2027-demo-v1";
  const VIEWS = ["publico", "inscricoes", "gestao"];
  const LABELS = {
    caravana: "Caravana",
    cosplay: "Concurso cosplay",
    kpop: "Mostra K-pop",
    imprensa: "Imprensa"
  };
  const DESCRIPTIONS = {
    caravana: "Exemplo de cadastro para quem organiza uma caravana.",
    cosplay: "Exemplo de inscrição fictícia para concurso cosplay.",
    kpop: "Exemplo de inscrição fictícia para apresentação solo ou em grupo.",
    imprensa: "Exemplo de solicitação fictícia de credenciamento de imprensa."
  };
  const STATUSES = {
    nova: "Aguardando análise",
    analise: "Em análise",
    aprovada: "Aprovada (demo)",
    ajustes: "Solicitar ajustes"
  };
  const SEED = [
    { id: "AS-001", kind: "caravana", name: "Caravana Aurora (exemplo)", email: "aurora@example.test", city: "Cidade Exemplo", details: "Grupo fictício para demonstrar a organização de caravanas.", status: "nova" },
    { id: "AS-002", kind: "cosplay", name: "Cosplayer Cometa (exemplo)", email: "cometa@example.test", city: "Cidade Ilustrativa", details: "Participação fictícia no concurso de cosplay.", status: "analise" },
    { id: "AS-003", kind: "kpop", name: "Grupo Neon (exemplo)", email: "neon@example.test", city: "Município Demo", details: "Inscrição fictícia de apresentação em grupo.", status: "aprovada" },
    { id: "AS-004", kind: "imprensa", name: "Portal Pixel (exemplo)", email: "pixel@example.test", city: "Cidade Exemplo", details: "Credenciamento fictício de cobertura do evento.", status: "nova" }
  ];
  const AGENDA_SEED = [
    { id: "a1", time: "12:00", title: "Abertura do palco (exemplo)" },
    { id: "a2", time: "13:30", title: "Mostra K-pop (exemplo)" },
    { id: "a3", time: "15:00", title: "Desfile cosplay (exemplo)" }
  ];
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const defaultData = () => ({ applications: SEED.map(x => ({ ...x })), agenda: AGENDA_SEED.map(x => ({ ...x })) });
  function validApplication(x) {
    return x && typeof x.id === "string" && typeof x.name === "string" && typeof x.email === "string" &&
      x.email.endsWith("@example.test") && Object.hasOwn(LABELS, x.kind) && Object.hasOwn(STATUSES, x.status) &&
      typeof x.details === "string" && typeof x.city === "string";
  }
  function validAgenda(x) {
    return x && typeof x.id === "string" && typeof x.title === "string" && x.title.length <= 80 &&
      typeof x.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time);
  }
  function load() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.applications) || !Array.isArray(parsed.agenda)) return defaultData();
      return { applications: parsed.applications.filter(validApplication).slice(0, 100), agenda: parsed.agenda.filter(validAgenda).slice(0, 30) };
    } catch { return defaultData(); }
  }
  let data = load();
  let activeKind = "caravana";
  let messageTimer;
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(data)); }
    catch { toast("O armazenamento local não está disponível. Os dados só durarão nesta página."); }
  }
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.hidden = false;
    window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => { el.hidden = true; }, 4200);
  }
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = String(text);
    return el;
  }
  function viewFromUrl() {
    const view = new URLSearchParams(location.search).get("view");
    return VIEWS.includes(view) ? view : "publico";
  }
  function go(view, historyEntry = true) {
    if (!VIEWS.includes(view)) view = "publico";
    $$(".view").forEach(el => { el.hidden = el.id !== view; });
    $$("[data-view-link]").forEach(el => {
      if (el.dataset.viewLink === view) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    if (historyEntry) {
      const url = new URL(location.href);
      url.searchParams.set("view", view);
      history.pushState({ view }, "", url);
    }
    if (view === "publico") renderAgenda();
    if (view === "gestao") renderAdmin();
    window.scrollTo({ top: 0, behavior: "instant" });
    const heading = $("#" + view + " h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
    }
  }
  function choose(kind) {
    if (!Object.hasOwn(LABELS, kind)) return;
    activeKind = kind;
    $$("[data-kind]").forEach(el => {
      const selected = el.dataset.kind === kind;
      el.classList.toggle("selected", selected);
      el.setAttribute("aria-pressed", String(selected));
    });
    $("#selected-kind-title").textContent = "Cadastro de " + LABELS[kind].toLowerCase();
    $("#selected-kind-text").textContent = DESCRIPTIONS[kind];
    $("#signup-error").hidden = true;
  }
  function setError(message) {
    const el = $("#signup-error");
    el.textContent = message;
    el.hidden = false;
  }
  function submitExample(event) {
    event.preventDefault();
    const name = $("#entry-name").value.trim();
    const email = $("#entry-email").value.trim().toLowerCase();
    const city = $("#entry-city").value.trim();
    const details = $("#entry-details").value.trim();
    const agreement = $("#fake-agreement").checked;
    if (name.length < 2 || name.length > 60) return setError("Use um nome fictício entre 2 e 60 caracteres.");
    if (!/^[a-z0-9._+-]+@example\.test$/i.test(email)) return setError("Utilize apenas um e-mail fictício terminado em @example.test.");
    if (details.length < 10 || details.length > 280) return setError("Descreva a participação fictícia em pelo menos 10 caracteres.");
    if (!agreement) return setError("Confirme que está usando apenas dados inventados.");
    const id = "AS-" + String(Date.now()).slice(-7);
    data.applications.unshift({ id, kind: activeKind, name, email, city, details, status: "nova" });
    save();
    $("#signup-form").hidden = true;
    $("#signup-success").hidden = false;
    $("#receipt-number").textContent = "RECIBO FICTÍCIO · " + id;
    $("#signup-success").focus();
    toast("Exemplo salvo somente nesta sessão.");
  }
  function renderAgenda() {
    const list = $("#agenda-list");
    const admin = $("#agenda-admin-list");
    list.replaceChildren();
    admin.replaceChildren();
    const ordered = [...data.agenda].sort((a, b) => a.time.localeCompare(b.time));
    if (!ordered.length) {
      list.append(node("p", "agenda-item", "Ainda não há atividades ilustrativas nesta sessão."));
    }
    ordered.forEach(item => {
      const row = node("div", "agenda-item");
      const time = node("time", null, item.time);
      time.setAttribute("datetime", item.time);
      row.append(time, node("strong", null, item.title));
      list.append(row);
      const adminRow = node("div", "admin-agenda-row");
      const txt = node("span");
      txt.append(node("b", null, item.time), document.createTextNode(item.title));
      const remove = node("button", null, "Remover");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remover atividade de exemplo: " + item.title);
      remove.addEventListener("click", () => {
        data.agenda = data.agenda.filter(x => x.id !== item.id);
        save();
        renderAgenda();
        toast("Atividade ilustrativa removida.");
      });
      adminRow.append(txt, remove);
      admin.append(adminRow);
    });
  }
  function renderAdmin() {
    $("#metric-total").textContent = data.applications.length;
    $("#metric-new").textContent = data.applications.filter(x => x.status === "nova").length;
    $("#metric-review").textContent = data.applications.filter(x => x.status === "analise").length;
    $("#metric-approved").textContent = data.applications.filter(x => x.status === "aprovada").length;
    const term = $("#admin-search").value.trim().toLocaleLowerCase("pt-BR");
    const filter = $("#admin-kind").value;
    const results = data.applications.filter(x =>
      (filter === "todos" || x.kind === filter) &&
      (x.name.toLocaleLowerCase("pt-BR").includes(term) || x.city.toLocaleLowerCase("pt-BR").includes(term) || x.id.toLocaleLowerCase("pt-BR").includes(term))
    );
    const list = $("#application-list");
    list.replaceChildren();
    $("#admin-empty").hidden = results.length > 0;
    results.forEach(item => {
      const card = node("article", "application-card");
      const top = node("div", "application-top");
      const identity = node("div");
      identity.append(node("strong", null, item.name), node("small", null, LABELS[item.kind] + " · " + (item.city || "Cidade não informada") + " · " + item.email));
      top.append(identity, node("span", "application-id", item.id));
      const summary = node("p", "application-summary", item.details);
      const lower = node("div", "application-lower");
      lower.append(node("span", null, "STATUS DA DEMO"));
      const selector = node("select");
      selector.setAttribute("aria-label", "Status do registro " + item.id);
      Object.entries(STATUSES).forEach(([value, label]) => {
        const option = node("option", null, label);
        option.value = value;
        selector.append(option);
      });
      selector.value = item.status;
      selector.addEventListener("change", () => {
        item.status = selector.value;
        save();
        renderAdmin();
        toast("Status fictício atualizado para " + STATUSES[item.status] + ".");
      });
      lower.append(selector);
      card.append(top, summary, lower);
      list.append(card);
    });
    renderAgenda();
  }
  function addAgenda(event) {
    event.preventDefault();
    const title = $("#agenda-title").value.trim();
    const time = $("#agenda-time").value;
    if (title.length < 3 || title.length > 46) {
      toast("Use uma atividade fictícia entre 3 e 46 caracteres.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      toast("Selecione um horário ilustrativo válido.");
      return;
    }
    if (data.agenda.length >= 20) {
      toast("Limite demonstrativo de 20 atividades atingido.");
      return;
    }
    data.agenda.push({ id: "a" + Date.now(), time, title: title.includes("(exemplo)") ? title : title + " (exemplo)" });
    save();
    $("#agenda-form").reset();
    renderAgenda();
    toast("Programação fictícia atualizada no portal.");
  }
  $$("[data-go]").forEach(el => el.addEventListener("click", () => go(el.dataset.go)));
  $$("[data-view-link]").forEach(el => el.addEventListener("click", event => {
    event.preventDefault();
    go(el.dataset.viewLink);
  }));
  $$("[data-start]").forEach(el => el.addEventListener("click", () => {
    choose(el.dataset.start);
    $("#signup-form").hidden = false;
    $("#signup-success").hidden = true;
    go("inscricoes");
  }));
  $$("[data-kind]").forEach(el => el.addEventListener("click", () => choose(el.dataset.kind)));
  $("#signup-form").addEventListener("submit", submitExample);
  $("#new-example").addEventListener("click", () => {
    $("#signup-form").reset();
    $("#signup-form").hidden = false;
    $("#signup-success").hidden = true;
    $("#signup-error").hidden = true;
    $("#entry-name").focus();
  });
  $("#admin-search").addEventListener("input", renderAdmin);
  $("#admin-kind").addEventListener("change", renderAdmin);
  $("#agenda-form").addEventListener("submit", addAgenda);
  $("#reset-demo").addEventListener("click", () => {
    if (!window.confirm("Restaurar todos os dados fictícios desta sessão?")) return;
    data = defaultData();
    save();
    $("#admin-search").value = "";
    $("#admin-kind").value = "todos";
    renderAdmin();
    toast("Exemplos restaurados.");
  });
  window.addEventListener("popstate", () => go(viewFromUrl(), false));
  choose("caravana");
  go(viewFromUrl(), false);
})();
