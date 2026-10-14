export async function readJsonBody(request: Request, maxBytes = 64_000) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    throw new Response("Envie JSON", { status: 415 });
  }
  const contentLength = request.headers.get("Content-Length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Response("Requisição muito grande", { status: 413 });
  }

  const reader = request.body?.getReader();
  let raw = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Response("Requisição muito grande", { status: 413 });
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Response("JSON inválido", { status: 400 });
  }
}
