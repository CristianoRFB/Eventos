# Estratégia de teste e evidências

## Camadas
1. Unit: normalização hostname, destino de domínio, slug, permissão, status, limites, timezone e agenda/conflicts, pricing resolver.
2. DB: Drizzle schema+constraints+transações+backfill+migrations rollback, dois tenants reais fictícios no D1 local.
3. Integration: Auth session, memberships/roles, endpoints, upload e public snapshot, domínio activation provider fake, rate limit.
4. E2E browser: organizadora A/B, público, agenda e expositores em PC+mobile, navegação por host custom simulado, publish e rollback.
5. Security: A×B, IDOR, host injection/unknown host, cross-domain cookie/cache, CSRF/XSS, uploads priv/public, escalada de role, last owner, over limit.
6. Docs: Mermaid fontes, SVG render, manifests, screenshots reais após runtime e status/feature matrix.
7. Infra/staging: TLS real, CNAME, status Cloudflare hostname/SSL, storage real/rollback restore autorizados.

## Gates de aceite por cenário
Sem 403/404 consistente em tentativas A→B, NÃO passar F2. Sem foto privada protegida, NÃO passar F3. Sem publicação atômica + rollback, NÃO passar F4. Sem concorrência de agenda com proteção, NÃO passar F5. Sem domínio verificado + SSL ativo e DNS correto, NÃO passar F7/F11. Sem revisão humana, NÃO promover prod.

## Screenshots pós-implementação
Login, Platform Owner, onboarding, painel organizadora, CMS, programação, expositores, domínio, mobile site, mobile painel, estados de 403/404/pendente; arquivos reais com data, rota, estado, viewport, commit, executor. Antes disso, pasta vazia intencional.

## Garantia de concorrência no D1 (decisão de implementação)
A proposta usa `UPDATE ... WHERE revision = ?` e inspeciona `changes === 1` para compare-and-swap do ponteiro, combinado com prepared statements em `D1Database.batch()` para operações correlatas. A documentação Cloudflare descreve batch como transação com rollback em caso de falha; **não presumir suporte irrestrito a uma transação interativa entre round-trips**. Codex deve provar atomicidade, casos concorrentes e contadores em testes reais de D1 antes de marcar publish/quotas PASS. Se o fluxo exigir garantia superior, propor alternativa (ex.: Durable Object coordenador) por ADR, sem acionar produto pago sem aprovação. Fonte: https://developers.cloudflare.com/d1/worker-api/d1-database/ .
