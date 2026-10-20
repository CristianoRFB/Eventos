import { createRequestHandler } from "react-router";
import { createAuth } from "../app/infrastructure/auth.server";
import { handleApi } from "../app/services/api.server";
import { requireAdminHost } from "../app/infrastructure/security.server";
import {
  resolvePublicSite,
  servePreviewAsset,
  servePublicAsset,
  servePublicMetadata,
} from "../app/services/content.server";
import { ZodError } from "zod";
import { handlePublicForms } from "../app/services/forms-public.server";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const requestId = crypto.randomUUID();
    let response: Response;
    let publicRevision: number | null = null;
    let publicCacheAllowed = true;
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
      } else if (url.pathname.startsWith("/api/v1/public/"))
        response = await handlePublicForms(request, env);
      else if (url.pathname.startsWith("/api/"))
        response = await handleApi(request, env);
      else if (
        url.origin === new URL(env.ADMIN_ORIGIN).origin &&
        url.pathname.match(/^\/preview\/([^/]+)\/assets\/([^/]+)$/u)
      ) {
        const match = url.pathname.match(
          /^\/preview\/([^/]+)\/assets\/([^/]+)$/u,
        )!;
        response = await servePreviewAsset(request, env, match[1]!, match[2]!);
      } else if (url.origin === new URL(env.ADMIN_ORIGIN).origin)
        response = await requestHandler(request);
      else if (url.pathname === "/robots.txt")
        response = await servePublicMetadata(request, env, "robots");
      else if (url.pathname === "/sitemap.xml")
        response = await servePublicMetadata(request, env, "sitemap");
      else if (url.pathname.startsWith("/assets/"))
        response = await servePublicAsset(
          request,
          env,
          decodeURIComponent(url.pathname.slice("/assets/".length)),
        );
      else if (/^\/candidatura\/[a-f0-9]{64}$/u.test(url.pathname)) {
        await resolvePublicSite(request, env);
        response = await requestHandler(request);
      } else if (/^\/(?:admin|login|platform|api)(?:\/|$)/u.test(url.pathname))
        response = new Response("Página não encontrada", { status: 404 });
      else {
        const requestedSegments = url.pathname.split("/").filter(Boolean);
        if (
          requestedSegments.length > 1 &&
          url.pathname !== "/expositores/inscricao"
        )
          throw new Response("Página não encontrada", { status: 404 });
        if (requestedSegments.length === 1) {
          try {
            decodeURIComponent(requestedSegments[0]!);
          } catch {
            throw new Response("Página não encontrada", { status: 404 });
          }
        }
        // The browser and SSR must match the same public route. Rewriting the
        // pathname to an internal route breaks hydration and client navigation.
        const publicSite = await resolvePublicSite(request, env);
        publicRevision = publicSite.publicationRevision;
        publicCacheAllowed = publicSite.publicCacheAllowed;
        if (env.APP_ENV !== "local" && url.protocol !== "https:") {
          response = Response.redirect(
            `https://${publicSite.hostname}${url.pathname}${url.search}`,
            308,
          );
        } else {
          response = await requestHandler(request);
        }
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
    headers.set(
      "Referrer-Policy",
      /^\/(?:candidatura\/|api\/v1\/public\/applications\/)/u.test(
        new URL(request.url).pathname,
      )
        ? "no-referrer"
        : "strict-origin-when-cross-origin",
    );
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-Request-Id", requestId);
    if (publicRevision !== null && response.status < 400) {
      headers.set(
        "Cache-Control",
        publicCacheAllowed
          ? "public, max-age=60, s-maxage=60, stale-while-revalidate=30"
          : "private, no-store",
      );
      headers.set("X-Robots-Tag", "index, follow");
      headers.set("X-Publication-Revision", String(publicRevision));
      headers.set("Vary", "Host");
    }
    if (!headers.has("Cache-Control"))
      headers.set("Cache-Control", "private, no-store");
    if (!headers.has("X-Robots-Tag"))
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
