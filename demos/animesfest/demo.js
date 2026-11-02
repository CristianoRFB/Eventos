/* global sessionStorage, URL, window, history, document, clearTimeout, setTimeout, FormData, confirm */
/* AnimeSFest · protótipo comercial independente.
   Exclusivamente dados sintéticos e sessionStorage. Sem API, envio real ou login. */
(function () {
  "use strict";

  var KEY = "eventos77-animesfest-demo-v1";
  var VIEWS = ["inicio", "lojas", "inscricao", "admin"];
  var CATEGORIES = ["Geek", "Arte", "Moda", "Gastronomia"];
  var LABELS = { pending: "Pendente", approved: "Aprovada", adjustments: "Ajustes" };
  var SYMBOLS = { Geek: "✦", Arte: "✳", Moda: "✺", Gastronomia: "❋" };
  var seed = [
    { id: "demo-01", name: "Nebulosa Prints", category: "Arte", city: "Santa Fé do Sul · SP", description: "Ilustrações autorais, adesivos e prints criados para fãs de universos fantásticos.", instagram: "@nebulosa_exemplo", stand: "Espaço de artista", status: "approved", demo: true },
    { id: "demo-02", name: "Galáxia Geek", category: "Geek", city: "Jales · SP", description: "Colecionáveis ilustrativos, acessórios e presentes para pessoas apaixonadas por cultura pop.", instagram: "@galaxiageek_exemplo", stand: "Estande", status: "approved", demo: true },
    { id: "demo-03", name: "Mochi & Chá", category: "Gastronomia", city: "Santa Fé do Sul · SP", description: "Doces temáticos e bebidas criativas para compartilhar entre fãs.", instagram: "@mochicha_exemplo", stand: "Mesa simples", status: "approved", demo: true },
    { id: "demo-04", name: "Kitsune Atelier", category: "Moda", city: "Fernandópolis · SP", description: "Acessórios personalizados e moda alternativa com inspiração oriental.", instagram: "@kitsune_exemplo", stand: "Mesa simples", status: "pending", demo: true },
    { id: "demo-05", name: "Pixel Arcano", category: "Geek", city: "Jales · SP", description: "Bottons, chaveiros e objetos criativos de arte pixelada.", instagram: "@pixel_exemplo", stand: "Estande", status: "adjustments", demo: true }
  ];

  var state = {
    applications: load(),
    view: "inicio",
    filter: "Todos",
    search: "",
    adminFilter: "all",
    selected: null
  };

  function load() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (Array.isArray(saved) && saved.every(validApplication)) return saved;
    } catch { /* Restringido: usar apenas a semente local em memória. */ }
    return cloneSeed();
  }
  function cloneSeed() { return seed.map(function (x) { return Object.assign({}, x); }); }
  function validApplication(item) {
    return item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.name === "string" &&
      CATEGORIES.indexOf(item.category) >= 0 &&
      ["pending", "approved", "adjustments"].indexOf(item.status) >= 0 &&
      typeof item.city === "string" && typeof item.description === "string";
  }
  function persist() {
    try { sessionStorage.setItem(KEY, JSON.stringify(state.applications)); return true; }
    catch { return false; }
  }
  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function getView() {
    var url = new URL(window.location.href);
    var view = url.searchParams.get("view") || "inicio";
    return VIEWS.indexOf(view) >= 0 ? view : "inicio";
  }
  function navigate(nextView, push) {
    var view = VIEWS.indexOf(nextView) >= 0 ? nextView : "inicio";
    if (push) {
      var url = new URL(window.location.href);
      if (view === "inicio") url.searchParams.delete("view");
      else url.searchParams.set("view", view);
      history.pushState({ view: view }, "", url.pathname + url.search + url.hash);
    }
    state.view = view;
    document.querySelectorAll("[data-page]").forEach(function (section) {
      section.hidden = section.getAttribute("data-page") !== view;
    });
    document.querySelectorAll("a[data-view]").forEach(function (anchor) {
      if (anchor.closest(".site-nav")) {
        if (anchor.dataset.view === view) anchor.setAttribute("aria-current", "page");
        else anchor.removeAttribute("aria-current");
      }
    });
    var footer = document.getElementById("public-footer");
    if (footer) footer.hidden = view === "admin";
    document.getElementById("site-nav").classList.remove("open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
    if (view === "lojas") renderShops();
    if (view === "admin") renderAdmin();
    if (push) {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("conteudo").focus({ preventScroll: true });
    }
    document.title = ({ inicio: "O evento", lojas: "Vitrine de expositores", inscricao: "Quero expor · Demo", admin: "Painel de gestão · Demo" }[view]) + " | AnimeSFest — conceito não oficial";
  }
  function toast(message) {
    var node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { node.classList.remove("show"); }, 3500);
  }

  function shopCard(shop) {
    return '<article class="shop-card">' +
      '<div class="shop-art ' + escapeHTML(shop.category.toLowerCase()) + '"><span aria-hidden="true">' + (SYMBOLS[shop.category] || "✳") + '</span></div>' +
      '<div class="shop-body"><div class="shop-meta"><span class="shop-type">' + escapeHTML(shop.category) + '</span><span class="shop-demo">PERFIL FICTÍCIO</span></div>' +
      '<h3>' + escapeHTML(shop.name) + '</h3><p>' + escapeHTML(shop.description) + '</p>' +
      '<div class="shop-bottom"><span>⌖ ' + escapeHTML(shop.city) + '</span><span>↗</span></div></div></article>';
  }
  function renderShops() {
    var approved = state.applications.filter(function (x) { return x.status === "approved"; });
    var list = approved.filter(function (x) {
      var categoryMatch = state.filter === "Todos" || x.category === state.filter;
      var text = [x.name, x.category, x.city, x.description].join(" ").toLocaleLowerCase("pt-BR");
      return categoryMatch && text.includes(state.search.toLocaleLowerCase("pt-BR"));
    });
    document.getElementById("shops-grid").innerHTML = list.map(shopCard).join("");
    document.getElementById("shop-count").textContent = String(list.length);
    document.getElementById("shops-empty").hidden = list.length > 0;
    document.querySelectorAll("[data-filter]").forEach(function (button) {
      var on = button.dataset.filter === state.filter;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-pressed", String(on));
    });
  }
  function resetFilters() {
    state.filter = "Todos";
    state.search = "";
    document.getElementById("shop-search").value = "";
    renderShops();
  }

  function itemHTML(item) {
    var current = item.id === state.selected;
    return '<button type="button" class="application-item' + (current ? " selected" : "") + '" data-select="' + escapeHTML(item.id) + '" aria-pressed="' + String(current) + '">' +
      '<span class="item-logo">' + (SYMBOLS[item.category] || "✳") + '</span>' +
      '<span class="item-copy"><strong>' + escapeHTML(item.name) + '</strong><small>' + escapeHTML(item.category) + ' · ' + escapeHTML(item.city) + '</small></span>' +
      '<span class="state ' + escapeHTML(item.status) + '">' + LABELS[item.status] + '</span></button>';
  }
  function detailHTML(item) {
    if (!item) return '<div class="detail-placeholder"><span>✳</span><h3>Selecione uma candidatura</h3><p>Analise o perfil e simule a decisão da organização.</p></div>';
    return '<div class="detail-head"><h3>' + escapeHTML(item.name) + '</h3><span class="state ' + item.status + '">' + LABELS[item.status] + '</span></div>' +
      '<div class="detail-meta"><div><small>Categoria</small><strong>' + escapeHTML(item.category) + '</strong></div><div><small>Cidade</small><strong>' + escapeHTML(item.city) + '</strong></div><div><small>Estrutura</small><strong>' + escapeHTML(item.stand || "A definir") + '</strong></div><div><small>Instagram fictício</small><strong>' + escapeHTML(item.instagram || "Não informado") + '</strong></div></div>' +
      '<p class="detail-description">' + escapeHTML(item.description) + '</p><p class="detail-rules">' + (item.consentRecorded ? '✓ Aceite ilustrativo registrado nesta sessão' : '✳ Cadastro fictício de demonstração — sem aceite real') + '</p>' +
      '<div class="detail-actions"><button class="action-approve" data-action="approved" type="button">✓ Aprovar</button>' +
      '<button class="action-adjust" data-action="adjustments" type="button">↩ Pedir ajustes</button>' +
      '<button class="action-pending" data-action="pending" type="button">⟳ Deixar pendente</button></div>';
  }
  function renderAdmin() {
    var items = state.applications;
    document.getElementById("metric-total").textContent = String(items.length);
    document.getElementById("metric-pending").textContent = String(items.filter(function (x) { return x.status === "pending"; }).length);
    document.getElementById("metric-approved").textContent = String(items.filter(function (x) { return x.status === "approved"; }).length);
    var filtered = items.filter(function (x) { return state.adminFilter === "all" || state.adminFilter === x.status; });
    if (!state.selected || !items.some(function (x) { return x.id === state.selected; })) {
      state.selected = items.length ? items[0].id : null;
    }
    document.getElementById("application-list").innerHTML = filtered.length
      ? filtered.map(itemHTML).join("")
      : '<div class="application-empty">Não há candidaturas com este status.</div>';
    document.getElementById("application-detail").innerHTML = detailHTML(items.find(function (x) { return x.id === state.selected; }));
  }

  function handleRegistration(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var data = new FormData(form);
    var name = String(data.get("name") || "").trim().replace(/\s+/g, " ");
    var category = String(data.get("category") || "");
    var city = String(data.get("city") || "").trim().replace(/\s+/g, " ");
    var description = String(data.get("description") || "").trim();
    var instagram = String(data.get("instagram") || "").trim().replace(/\s+/g, "");
    var stand = String(data.get("stand") || "A definir");
    var error = "";
    if (name.length < 2 || name.length > 72) error = "Informe um nome fictício de loja com pelo menos 2 caracteres.";
    else if (CATEGORIES.indexOf(category) < 0) error = "Selecione a categoria da loja.";
    else if (city.length < 2 || city.length > 55) error = "Informe uma cidade fictícia de referência.";
    else if (description.length < 12 || description.length > 280) error = "Descreva sua loja fictícia com 12 a 280 caracteres.";
    else if (instagram.length > 50) error = "O Instagram demonstrativo deve ter no máximo 50 caracteres.";
    else if (!data.get("rules") || !data.get("privacy")) error = "Leia e marque as duas confirmações antes de enviar a simulação.";

    var errorBox = document.getElementById("form-errors");
    if (error) {
      errorBox.textContent = error;
      errorBox.hidden = false;
      errorBox.focus();
      return;
    }
    errorBox.textContent = "";
    errorBox.hidden = true;
    var item = { id: "demo-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      name: name, category: category, city: city, description: description,
      instagram: instagram, stand: stand, status: "pending", demo: true, consentRecorded: true };
    state.applications.unshift(item);
    persist();
    state.selected = item.id;
    document.getElementById("vendor-form").hidden = true;
    var receipt = document.getElementById("vendor-receipt");
    receipt.hidden = false;
    document.getElementById("receipt-summary").innerHTML = '<strong>' + escapeHTML(name) + '</strong><br>Protocolo ilustrativo: ' + escapeHTML(item.id) + '<br>Status: aguardando análise demonstrativa';
    receipt.setAttribute("tabindex", "-1");
    receipt.focus();
    toast("Candidatura simulada criada. Abra o painel demo para analisar.");
  }
  document.addEventListener("click", function (event) {
    var route = event.target.closest("a[data-view]");
    if (route) {
      event.preventDefault();
      navigate(route.dataset.view, true);
      return;
    }
    var filterButton = event.target.closest("button[data-filter]");
    if (filterButton) {
      state.filter = filterButton.dataset.filter;
      renderShops();
      return;
    }
    var selectButton = event.target.closest("button[data-select]");
    if (selectButton) {
      state.selected = selectButton.dataset.select;
      renderAdmin();
      return;
    }
    var action = event.target.closest("button[data-action]");
    if (action) {
      var candidate = state.applications.find(function (x) { return x.id === state.selected; });
      if (!candidate) return;
      candidate.status = action.dataset.action;
      persist();
      renderAdmin();
      toast("Status atualizado na demonstração: " + LABELS[candidate.status] + ".");
      return;
    }
  });
  document.getElementById("menu-toggle").addEventListener("click", function () {
    var open = document.getElementById("site-nav").classList.toggle("open");
    this.setAttribute("aria-expanded", String(open));
  });
  document.getElementById("shop-search").addEventListener("input", function (event) {
    state.search = event.target.value.trim().slice(0, 100);
    renderShops();
  });
  document.getElementById("clear-filters").addEventListener("click", resetFilters);
  document.getElementById("admin-status").addEventListener("change", function (event) {
    state.adminFilter = event.target.value;
    renderAdmin();
  });
  document.getElementById("vendor-form").addEventListener("submit", handleRegistration);
  document.getElementById("register-again").addEventListener("click", function () {
    document.getElementById("vendor-form").reset();
    document.getElementById("vendor-form").hidden = false;
    document.getElementById("vendor-receipt").hidden = true;
    document.getElementById("vendor-name").focus();
  });
  document.getElementById("reset-demo").addEventListener("click", function () {
    if (!confirm("Restaurar todas as informações fictícias? As alterações desta sessão serão apagadas.")) return;
    state.applications = cloneSeed();
    state.selected = null;
    state.adminFilter = "all";
    document.getElementById("admin-status").value = "all";
    persist();
    renderAdmin();
    toast("A demonstração voltou ao estado original.");
  });
  window.addEventListener("popstate", function () { navigate(getView(), false); });
  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      document.getElementById("site-nav").classList.remove("open");
      document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
    }
  });
  navigate(getView(), false);
})();