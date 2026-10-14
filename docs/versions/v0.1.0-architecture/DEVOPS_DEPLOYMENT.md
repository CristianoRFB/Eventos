# Ambiente, CI/CD, deploy e suporte (proposta)

## Ambientes
`local` com Wrangler + D1 local + R2 test double; `staging` isolado com contas/domínios de teste autorizados; `production` Cloudflare zona controlada. D1 databases/buckets, secrets e cookies nunca se misturam entre ambientes. Deploy padrão é UMA aplicação por ambiente por vertical, não por tenant.

## Gates
- Pull Request: lint, format, typecheck, unit/integration, tests A×B, E2E, audit dependências, build, schemas/migration dry-run e docs:check.
- Staging: requer acesso autorizado, versão de migrations compatível, dados fictícios, DNS/SSL de subdomínio de teste, smoke de páginas públicas e admin.
- Produção: consentimento explícito, backup restaurável, janela de manutenção/rollback, prova de staging e pós-deploy smoke. Sem habilitar billing/messaging automáticos.
- Failure: atualizar `MASTER_EXECUTION_STATUS` com `BLOCKED_EXTERNAL` ou `FAIL`, não promover readiness.

## Backups
D1 Time Travel ajuda recuperação mas não substitui backup lógico e teste de restore. Export SQL versionado/seguro antes de migrations de alto risco; R2 inventário e estratégia de recuperação de objetos por bucket/permissão; explicitar RPO/RTO apenas após SLA real e teste. Secrets separados em Wrangler secrets, não `.env` versionado.

## Monitoramento
Métricas agregadas por organização e ambiente sem PII, logs com requestId, tenant ID técnico e erro sanitizado, alertas de 5xx, latência, falha de publicação e callback de domínios. Runbook: DNS pendente, erro 1016, quota D1, R2 e worker 429/5xx.

## Comandos propostos FUTUROS
`npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build` → `npm run docs:check`. Scripts e dependências serão definidos no repo real, sem alegar que já existem.
