# Checkpoint local — 14/10/2026

Implementação em `codex/eventos77-full-system`, commit `21ce08b2a1c4a4389d5273e9bacec53ea027918f`. O checkout está baseado no repositório autorizado `CristianoRFB/Eventos`. O goal integral permanece `IN_PROGRESS`; este checkpoint cobre a base local F1 e partes de F2/F3, não um aceite integral.

## Verificações reproduzidas

| Comando | Resultado | Evidência |
|---|---|---|
| `npm ci` | exit 0; 462 pacotes instalados; 0 vulnerabilidades | instalação limpa do lockfile |
| `npm run lint` | exit 0 | ESLint global |
| `npm run typecheck` | exit 0 | Wrangler, React Router e TypeScript |
| `npm test` | exit 0; 98 testes em 4 arquivos | Vitest; isolamento, permissões, schema e mídia |
| `npm run build` | exit 0 | bundles de cliente e SSR Worker |
| `npm run test:integration` | exit 0; 19 testes | Playwright contra o Worker local, D1 e R2 locais |
| `npm run test:e2e` | exit 0; 8 testes | 4 jornadas em desktop `1440x1000` e mobile `390x844` |
| `npm run docs:check` | exit 0 | 13 fases, 172 cláusulas de fase, 65 globais, 38 features, 60 telas, 16 fontes e renders Mermaid |
| `npm audit` | exit 0; 0 vulnerabilidades | lockfile completo |
| `npm run db:migrate:local` | exit 0; nenhuma migração pendente | `0000_same_tinkerer.sql` e `0001_security_guards.sql` aplicadas localmente |

O lockfile precisou registrar a dependência opcional `@emnapi/wasi-threads` `1.2.3`, incluída em um pacote WASI agrupado. Com ela, `npm ci` passou. As contas `example.test`, senha `TEST_ONLY-Local-2026!`, dados dos dois tenants, segredo `.dev.vars`, banco local e builds são apenas de desenvolvimento; arquivos e bancos locais não foram adicionados ao Git.

## Sistema exercitado

- Login fechado por convite, cookie host-only, sessão revogada, origem CSRF e expiração são validados em parte; o teste explícito de expiração de sessão continua pendente.
- Tenants A/B, memberships, atribuições por evento, Platform Owner separado, suspensão, auditoria append-only e convite vinculado a e-mail/hash foram exercitados no Worker local.
- Eventos e edições são criados e editados com validação server-side. A clonagem tem endpoint, mas falta o aceite que prova exclusão de PII.
- A mídia local verifica assinatura, dimensões, limite de tamanho, licença para visibilidade pública, prefixo de tenant no R2 e autorização de leitura por evento/edição. R2 real não foi provisionado; variações e reconciliação de objetos ainda faltam.
- O host parser possui testes puros; resolução de host com provedor e custom domain não foi ligada.
- As 16 capturas reais das jornadas testadas estão em [screenshots](screenshots/manifest.json). São imagens do runtime local com dados fictícios, registradas no commit indicado; CMS, preview, agenda, expositores, patrocinadores e domínios ainda não aparecem como telas implementadas.

## Limites confirmados

Nenhum recurso Firebase ou Cloudflare real foi criado ou alterado. O projeto ainda não tem integração Firebase; o runtime local usa Cloudflare Workers, D1 e o binding R2 local. `workers_dev`, domínios customizados, mensagens de saída e controle comercial estão desativados. Não houve deploy, configuração DNS, uso de quotas/preços, staging, produção, envio de email nem cliente real. A solicitação de subdomínio `workers.dev` permanece para depois da validação e autorização operacional correspondente.

## Próxima etapa

Continuar a F4: editor de conteúdo estruturado, drafts imutáveis, preview privado, snapshots publicados e rollback concorrente com teste A → v1 → draft v2 → v2 → rollback v1. Depois ligar a página SSR pública ao host verificado. F5/F6, os gates externos F7/F8/F11 e a cobertura das 60 telas continuam pendentes.

Rollback desta entrega: preservar o commit F0 `a989a35c8b39c95f20ecf4155553b772f83e3f1e`; reverter somente `21ce08b2a1c4a4389d5273e9bacec53ea027918f` se necessário. Migrações e fixtures foram aplicadas somente ao D1 local sintético; nenhum banco ou objeto cloud precisa ser restaurado.
