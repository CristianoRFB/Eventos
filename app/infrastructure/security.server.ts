export function requireAdminHost(request: Request, origin: string) {
  if (new URL(request.url).origin !== new URL(origin).origin) {
    throw new Response("Página não encontrada", { status: 404 });
  }
}
export function requireSameOrigin(request: Request, origin: string) {
  if (
    request.headers.get("Origin") !== new URL(origin).origin ||
    request.headers.get("Sec-Fetch-Site") === "cross-site"
  ) {
    throw new Response("Origem não permitida", { status: 403 });
  }
}
export function privateHeaders() {
  return {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
}
