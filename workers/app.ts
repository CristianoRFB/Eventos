import { createRequestHandler } from "react-router";
import { createAuth } from "../app/infrastructure/auth.server";
import { handleApi } from "../app/services/api.server";
import { requireAdminHost } from "../app/infrastructure/security.server";
import { ZodError } from "zod";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const requestId = crypto.randomUUID();
    let response: Response;
    try {
      const url = new URL(request.url);
      if (url.pathname === "/healthz")
        response = Response.json({ status: "ok" });
      else if (url.pathname.startsWith("/api/auth/")) {
        requireAdminHost(request, env.ADMIN_ORIGIN);
        let authRequest: Request = request;
        if (env.APP_ENV === "local") {
          const localHeaders = new Headers(request.headers);
          localHeaders.set("cf-connecting-ip", "127.0.0.1");
          authRequest = new Request(request, { headers: localHeaders });
        }
        response = await createAuth(env).handler(authRequest);
      } else if (url.pathname.startsWith("/api/"))
        response = await handleApi(request, env);
      else {
        // No customer-domain fallback until a verified binding can resolve it.
        requireAdminHost(request, env.ADMIN_ORIGIN);
        response = await requestHandler(request);
      }
    } catch (error) {
      if (error instanceof Response) response = error;
      else if (error instanceof ZodError)
        response = Response.json(
          {
            error: "Dados inválidos",
            fields: error.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
          },
          { status: 400 },
        );
      else {
        const message = error instanceof Error ? error.message : "";
        const conflict = /UNIQUE constraint|last_owner/i.test(message);
        console.error(
          JSON.stringify({
            requestId,
            kind: conflict ? "conflict" : "internal_error",
          }),
        );
        response = Response.json(
          {
            error: conflict
              ? "Operação em conflito com os dados atuais"
              : "Serviço temporariamente indisponível",
          },
          { status: conflict ? 409 : 503 },
        );
      }
    }
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-Request-Id", requestId);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    if (new URL(request.url).protocol === "https:")
      headers.set("Strict-Transport-Security", "max-age=31536000");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
} satisfies ExportedHandler<Env>;
