/**
 * VOF 2027 — Brevo restricted test adapter, not an official event endpoint.
 * No production ticket issuance, no arbitrary recipient email, no public sender.
 *
 * Designed to be mounted only behind a secure admin Worker / route.
 * NEVER expose env.BREVO_API_KEY or env.BREVO_TEST_TOKEN to the browser.
 */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store", "x-content-type-options": "nosniff" }
});
const isEmail = (s) => typeof s === "string" &&
  /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s) && s.length <= 254;

function authorized(request, env) {
  const header = request.headers.get("authorization") || "";
  return typeof env.BREVO_TEST_TOKEN === "string" &&
    env.BREVO_TEST_TOKEN.length >= 24 &&
    header === `Bearer ${env.BREVO_TEST_TOKEN}`;
}
function messageFor(scenario) {
  const common = '<p><strong>DEMONSTRAÇÃO NÃO OFICIAL — VOF 2027</strong></p>' +
    '<p>Este e-mail é um teste técnico. Não é ingresso, inscrição ou confirmação válida.</p>';
  if (scenario === "ingresso") return {
    subject: "[TESTE DEMO] VOF 2027 — Exemplo de confirmação de ingresso",
    htmlContent: common + '<p>Seu pedido fictício foi registrado para demonstrar o fluxo de bilheteria.</p>'
  };
  if (scenario === "concurso") return {
    subject: "[TESTE DEMO] VOF 2027 — Exemplo de inscrição em concurso",
    htmlContent: common + '<p>Sua ficha fictícia do concurso foi registrada para demonstração.</p>'
  };
  return null;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/email/status" && request.method === "GET") {
      return json({ mode: "demo", realSendingEnabled: false,
        testSendingEnabled: Boolean(env.BREVO_SEND_ENABLED === "true" &&
          env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL &&
          env.BREVO_TEST_RECIPIENT && env.BREVO_TEST_TOKEN) });
    }
    if (url.pathname !== "/api/email/test") return json({ error: "not_found" }, 404);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);
    if (env.BREVO_SEND_ENABLED !== "true") return json({ error: "sending_disabled" }, 503);
    if (!env.BREVO_API_KEY || !isEmail(env.BREVO_SENDER_EMAIL) ||
        !isEmail(env.BREVO_TEST_RECIPIENT)) {
      return json({ error: "sender_or_test_recipient_not_configured" }, 503);
    }
    if ((request.headers.get("content-type") || "").split(";")[0] !== "application/json")
      return json({ error: "content_type_must_be_json" }, 415);
    let body;
    try {
      if (Number(request.headers.get("content-length")) > 1024) return json({ error: "too_large" }, 413);
      const raw = await request.text();
      if (raw.length > 1024) return json({ error: "too_large" }, 413);
      body = JSON.parse(raw);
    } catch { return json({ error: "invalid_json" }, 400); }
    const msg = messageFor(body && body.scenario);
    if (!msg) return json({ error: "invalid_scenario" }, 400);
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: { "api-key": env.BREVO_API_KEY,
          "accept": "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          sender: { name: "VOF 2027 — Demonstração", email: env.BREVO_SENDER_EMAIL },
          to: [{ email: env.BREVO_TEST_RECIPIENT }],
          subject: msg.subject, htmlContent: msg.htmlContent, tags: ["vof-2027-demo-test"]
        })
      });
      if (!res.ok) return json({ error: "email_provider_rejected_test", httpStatus: res.status }, 502);
      const response = await res.json();
      return json({ ok: true, mode: "test_only", providerMessageId: response.messageId || null });
    } catch { return json({ error: "email_provider_unreachable" }, 502); }
  }
};
