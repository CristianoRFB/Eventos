/* VOF commercial concept. Browser-only fixtures; never contacts real event. */
(() => {
  "use strict";
  const STORAGE = "vof-concept-v1-inquiries";
  const VALID_VIEWS = new Set(["visitar", "participar", "gestao"]);
  const STATUS = {
    novo: "Novo",
    contato: "Em conversa",
    selecionado: "Selecionado",
    arquivado: "Arquivado"
  };
  const MODES = {
    expositor: "Expositor",
    artista: "Artist Alley",
    patrocinador: "Patrocinador"
  };
  const seed = [
    { id: "D-001", brand: "Órbita Geek Store", contact: "Pessoa Exemplo A", email: "orbita@example.test", idea: "Loja fictícia com acessórios e colecionáveis.", kind: "expositor", status: "novo", synthetic: true },
    { id: "D-002", brand: "Ateliê Lua Pixel", contact: "Pessoa Exemplo B", email: "lua@example.test", idea: "Ilustrações autorais e pequenos impressos fictícios.", kind: "artista", status: "contato", synthetic: true },
    { id: "D-003", brand: "Neon Next Studio", contact: "Pessoa Exemplo C", email: "neon@example.test", idea: "Parceria de marca para experiência temática de demonstração.", kind: "patrocinador", status: "novo", synthetic: true },
    { id: "D-004", brand: "Controle Cósmico", contact: "Pessoa Exemplo D", email: "controle@example.test", idea: "Exposição fictícia de produtos de jogos.", kind: "expositor", status: "selecionado", synthetic: true }
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let entries = load();
  let kind = "expositor";

  function load() {
    try {
      const raw = sessionStorage.getItem(STORAGE);
      if (raw === null) return seed.map((item) => ({ ...item }));
      const value = JSON.parse(raw);
      if (!Array.isArray(value)) throw new Error("Invalid session fixture");
      return value.filter((item) => item && typeof item.id === "string" && typeof item.brand === "string" && Object.hasOwn(STATUS, item.status) && Object.hasOwn(MODES, item.kind));
    } catch (_) {
      return seed.map((item) => ({ ...item }));
    }
  }
  function save() {
    try { sessionStorage.setItem(STORAGE, JSON.stringify(entries)); } catch (_) {
      notify("Armazenamento de sessão indisponível; alterações serão mantidas apenas nesta página.");
    }
  }
  function notify(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { toast.hidden = true; }, 4500);
  }
  function currentView() {
    const query = new URLSearchParams(window.location.search).get("view");
    return VALID_VIEWS.has(query) ? query : "visitar";
  }
  function showView(target, history = true, focus = false) {
    const view = VALID_VIEWS.has(target) ? target : "visitar";
    $$(".view").forEach((section) => { section.hidden = section.id !== view; });
    $$("[data-link]").forEach((a) => {
      const active = a.dataset.link === view;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.body.dataset.view = view;
    if (history) {
      const url = new URL(window.location.href);
      url.searchParams.set("view", view);
      window.history.pushState({ view }, "", url);
    }
    if (view === "gestao") render();
    window.scrollTo({ top: 0, behavior: "instant" });
    if (focus) {
      const heading = $("#" + view + " h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
      }
    }
  }
  function chooseMode(next) {
    if (!Object.hasOwn(MODES, next)) return;
    kind = next;
    $$(".choice").forEach((button) => {
      const active = button.dataset.kind === kind;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  function elt(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = String(content);
    return node;
  }
  function render() {
    const total = entries.length;
    $("#stat-total").textContent = String(total);
    $("#stat-new").textContent = String(entries.filter((x) => x.status === "novo").length);
    $("#stat-contact").textContent = String(entries.filter((x) => x.status === "contato").length);
    $("#stat-approved").textContent = String(entries.filter((x) => x.status === "selecionado").length);
    const search = $("#search-inquiries").value.trim().toLocaleLowerCase("pt-BR");
    const filter = $("#status-filter").value;
    const visible = entries.filter((x) => (filter === "todos" || x.status === filter) &&
      (x.brand + " " + x.idea + " " + MODES[x.kind]).toLocaleLowerCase("pt-BR").includes(search));
    $("#table-count").textContent = "(" + visible.length + ")";
    $("#table-empty").hidden = visible.length !== 0;
    const tbody = $("#inquiries-body");
    tbody.replaceChildren();
    for (const item of visible) {
      const tr = elt("tr");
      const info = elt("td");
      info.append(elt("strong", "", item.brand));
      info.append(elt("small", "", item.idea || "Sem descrição informada"));
      const category = elt("td");
      category.append(elt("span", "kind-pill", MODES[item.kind]));
      const status = elt("td");
      status.append(elt("span", "", STATUS[item.status]));
      const action = elt("td");
      const select = elt("select");
      select.setAttribute("aria-label", "Alterar status de " + item.brand);
      select.dataset.entryId = item.id;
      for (const [value, label] of Object.entries(STATUS)) {
        const option = elt("option", "", label);
        option.value = value;
        select.append(option);
      }
      select.value = item.status;
      action.append(select);
      tr.append(info, category, status, action);
      tbody.append(tr);
    }
  }
  function submitInterest(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const error = $("#form-error");
    error.hidden = true;
    if (!form.reportValidity()) return;
    const brand = $("#brand-name").value.trim();
    const contact = $("#contact-name").value.trim();
    const email = $("#contact-email").value.trim();
    const idea = $("#idea").value.trim();
    if (brand.length < 2 || contact.length < 2 || idea.length < 10) {
      error.textContent = "Preencha os campos com exemplos completos (descrição com pelo menos 10 caracteres).";
      error.hidden = false;
      error.focus();
      return;
    }
    if (!/^[^@\s]+@example\.test$/i.test(email)) {
      error.textContent = "Para proteger sua privacidade, use um endereço fictício terminado em @example.test.";
      error.hidden = false;
      $("#contact-email").focus();
      return;
    }
    if (!$("#demo-consent").checked) {
      error.textContent = "Confirme que compreendeu o caráter demonstrativo.";
      error.hidden = false;
      return;
    }
    const record = {
      id: "D-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
      brand, contact, email, idea, kind, status: "novo", synthetic: true
    };
    entries.unshift(record);
    save();
    form.hidden = true;
    $("#form-success").hidden = false;
    $("#form-success h3").focus();
    notify("Interesse fictício adicionado. Abra o painel para classificar.");
  }
  function resetForm() {
    const form = $("#interest-form");
    form.reset();
    form.hidden = false;
    $("#form-success").hidden = true;
    $("#form-error").hidden = true;
    chooseMode("expositor");
    $("#brand-name").focus();
  }
  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-go],[data-link]");
    if (nav) {
      event.preventDefault();
      showView(nav.dataset.go || nav.dataset.link, true, true);
      return;
    }
    const anchor = event.target.closest("[data-scroll]");
    if (anchor) {
      event.preventDefault();
      const target = $(anchor.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
  });
  $$(".choice").forEach((button) => button.addEventListener("click", () => chooseMode(button.dataset.kind)));
  $("#interest-form").addEventListener("submit", submitInterest);
  $("#another-application").addEventListener("click", resetForm);
  $("#search-inquiries").addEventListener("input", render);
  $("#status-filter").addEventListener("change", render);
  $("#inquiries-body").addEventListener("change", (event) => {
    const select = event.target.closest("select[data-entry-id]");
    if (!select) return;
    const item = entries.find((x) => x.id === select.dataset.entryId);
    if (!item || !Object.hasOwn(STATUS, select.value)) return;
    item.status = select.value;
    save();
    render();
    notify("Status fictício atualizado para “" + STATUS[item.status] + "”.");
  });
  $("#reset-demo").addEventListener("click", () => {
    if (!window.confirm("Restaurar os quatro registros fictícios? Todas as alterações desta sessão serão descartadas.")) return;
    entries = seed.map((item) => ({ ...item }));
    save();
    $("#search-inquiries").value = "";
    $("#status-filter").value = "todos";
    render();
    notify("Demonstração restaurada.");
  });
  window.addEventListener("popstate", () => showView(currentView(), false));
  showView(currentView(), false);
})();