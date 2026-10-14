# Arquitetura proposta — ADR preferencial

## Escolha recomendada: Workers + React Router SSR + D1/Drizzle + R2

- **Web pública e painel:** TypeScript, React Router full stack SSR hospedado num Cloudflare Worker, Vite com plugin Workers. Escolha motivada por páginas rastreáveis/SEO, rotas por domínio, unificação de server loaders/actions e experiência compartilhada de desenvolvimento.
- **Dados:** um D1 por ambiente (dev/stage/prod), SQL SQLite relacional via Drizzle e migrations versionadas. Uma base compartilhada entre tenants, delimitada obrigatoriamente por `organization_id` no backend, com índices compostos e escopos explícitos; não vender D1 como Row Level Security nativo. Authorization no servidor é obrigatória.
- **Identidade:** Better Auth ou solução equivalente com adapter Drizzle/D1, session server-side em D1 e cookies `HttpOnly`, `Secure`, host-only no host fixo do painel. **GATE:** confirmar versão/compatibilidade exata de Better Auth com Cloudflare Worker + React Router e testes de sessão/CSRF antes de congelar dependência. Se falhar, adotar Auth.js / implementador comprovado com ADR e testes de segurança, nunca autenticação própria improvisada.
- **Objetos:** R2 por ambiente, namespace `org/<organizationId>/...`; uploads passam por autorização, validação e classificação pública/privada. Não publicar bucket privado aberto.
- **Domínios:** `domains` relaciona hostname EXATO verificado a destino organization/event/edition; Cloudflare for SaaS em fase externa autorizada; Worker fallback origin conforme docs oficiais. Não criar Worker/deploy por evento.
- **Plataforma vs public:** Painel num host controlado pelo SaaS; hosts white-label somente conteúdo público; cookies admin não compartilhados no domínio do cliente.
- **Operação:** GitHub Actions + wrangler dev/preview; deploy stage e prod são GATES humanos; backup D1 com Time Travel/export e inventário R2 com restore ensaiado; logs e monitoramento por ambiente sem PII.

## Comparativo de stacks
| Critério | A: Workers + D1 + R2 | B: Workers + Firebase Auth/Firestore + R2 | C: Workers + Postgres externo |
|---|---|---|---|
| Tenant, edição e publicação relacional | SQL, índices e transação local claros | subcoleções/Rules e denormalização cuidadosa | SQL robusto, maior infra |
| Familiaridade no ecossistema | Workers familiar, D1 novo | Firebase mais familiar | maior novidade |
| Domínios e SSR | nativo Worker | nativo Worker + integrações cross-cloud | nativo Worker + conexão externa |
| Permissões | backend obrigatório, sem RLS D1 | Firestore Rules + backend dependendo do caminho | possível RLS, exige infra |
| Operação solo | menos provedores | 2 provedores de identidade/dados | mais custo/rotina |
| Risco | dependência Cloudflare, limits D1 | duplicar configuração de auth e rules, custos de acesso | custo/latência/conexões |
| Decisão | **PREFERIDA** para novo greenfield | fallback se D1/BetterAuth bloquearem | só quando carga/necessidade justificar |

## Fronteiras de módulos
`web/public` SSR consome `publications`, `domains` e mídia pública. `web/admin` consome `domain/services` autenticados com `requireOrganizationPermission()`. `api` não confia em `organizationId` vindo da UI; valida associação, ownership, sessão e status a cada mutação. `platform` tem guard global e audit logs. `media` aplica quotas e licenças. `domains` integra Cloudflare via token privilegiado somente em backend e valida dois status distintos: hostname e certificado.

## Estratégia de rotas
- Reservado `app.<zona>` para `/login`, `/platform`, `/o/:orgSlug/...` painel autenticado.
- `preview.<zona>` só acessível com token curto/autorização, sem indexação.
- `www.<cliente>`/subdomínios white-label: site público; resolução por host antes de dados.
- `*.workers.dev`: DESABILITADO para conteúdo real ou responde 404/redirect controlado; não pode virar cópia indexável.
- Domínio institucional de produtora pode apontar à sua home; domínio do evento à edição atual/rota estável. Política de canônica e histórico por edição no SEO.

## Disponibilidade e caching
Cache de HTML estritamente público por hostname + destination + `publicationRevision`, nunca dados internos. Purge por host/revisão ao publish; caso falhe, TTL curto até invalidação. Sessões `Cache-Control: private, no-store`; drafts/preview `no-store`. Em erro de D1 ou domínio desconhecido, não usar tenant default.

## Contratos de API
API versionada `/api/v1/` com endpoints de sessão, organizations, memberships, events, editions, content/draft/revision/publish, stages, program-items, guests, exhibitors, forms/submissions, domains, assets e commercial state. Toda mutation com idempotência onde houver efeitos externos, `If-Match`/revision para concorrência editorial e validação Zod na boundary.

## ADRs externos e referências
Veja `../../adr/` e `reference/SOURCES_VERIFIED_2026-10-14.md`. Preços/quotas cloud são variáveis e dependem de conta. A ativação de Cloudflare for SaaS não é autorizada por este documento.

## Garantia de concorrência no D1 (decisão de implementação)
A proposta usa `UPDATE ... WHERE revision = ?` e inspeciona `changes === 1` para compare-and-swap do ponteiro, combinado com prepared statements em `D1Database.batch()` para operações correlatas. A documentação Cloudflare descreve batch como transação com rollback em caso de falha; **não presumir suporte irrestrito a uma transação interativa entre round-trips**. Codex deve provar atomicidade, casos concorrentes e contadores em testes reais de D1 antes de marcar publish/quotas PASS. Se o fluxo exigir garantia superior, propor alternativa (ex.: Durable Object coordenador) por ADR, sem acionar produto pago sem aprovação. Fonte: https://developers.cloudflare.com/d1/worker-api/d1-database/ .
