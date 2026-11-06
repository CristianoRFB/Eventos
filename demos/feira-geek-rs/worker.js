// Deploy demonstrativo separado do produto Eventos 77.
// Fonte HTML imutável. Atualizar SHA neste arquivo e no Worker hospedado
// somente depois de validar as alterações. Sem acesso a dados de produção.
const SOURCE = 'https://raw.githubusercontent.com/CristianoRFB/Eventos/9f01bdf0668d1e26cdaf0a2c4943a8b0f163f3e8/demos/feira-geek-rs/index.html';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Método não permitido', { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (url.pathname === '/favicon.ico') return new Response(null, { status: 204 });
    if (!['/', '/index.html', '/__health'].includes(url.pathname))
      return new Response('Página não encontrada', { status: 404 });
    try {
      const page = await fetch(SOURCE, { cf: { cacheEverything: true, cacheTtl: 60 } });
      if (url.pathname === '/__health') {
        return Response.json(
          { service: '77-feira-geek-rs-conceito', origin_ok: page.ok, source_status: page.status, version: '9f01bdf0668d1' },
          { status: page.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      if (!page.ok) return new Response('Prévia temporariamente indisponível', { status: 503 });
      return new Response(request.method === 'HEAD' ? null : page.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-Robots-Tag': 'noindex, nofollow'
        }
      });
    } catch (err) {
      return new Response('Prévia temporariamente indisponível', { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }
};
