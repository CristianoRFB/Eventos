# Checkpoint de retomada — 2026-10-19

- Branch: `codex/eventos77-full-system`; ponto de partida preservado local/remoto: `d5d5f0fa737be132fde7c4ff566ea8e0579c2952`.
- Preflight: raiz, origin, branch, status e sete commits conferidos; fetch e push sem alterações terminaram exit 0. Checkout inicialmente limpo.
- Autonomia e isolamento do push: [ADR-006](../adr/ADR-006-autonomous-development-checkpoints.md).
- `node node_modules/vitest/vitest.mjs run tests/unit/deployment-guard.test.ts`: exit 0, 3 PASS. Builds automáticos Cloudflare recusados por processo antes de instalação/build.
- `npm run test:integration`: exit 0, **20 PASS**, Worker local com D1/R2 sintéticos. Inclui v1 → draft v2 invisível → v2 → rollback, preview de mídia privada `no-store`, CAS, SSR/SEO, isolamento de hosts A/B. Log local descartável: `tmp/integration-2026-10-19.log`.
- F4 está implementado parcialmente no checkpoint preservado; não era correto o status documental anterior `NOT_STARTED`. Purge externo indisponível gera warning e TTL 60s. Páginas operacionais F5/F6, editor completo e demais aceites permanecem pendentes.
- Sem deploy, alterações de DNS, serviços pagos ou dados reais. Preços/quotas/trial permanecem sem aprovação. Goal integral `IN_PROGRESS`.

## Próximo passo

F5: persistir palcos/convidados/itens de programação com conflitos de horário protegidos no banco, APIs com escopo de edição e RBAC, painel acessível e incorporação explícita no snapshot publicado. Continuar F6 após comprovar isolamento e concorrência da agenda.

Rollback: preservar banco/objetos locais; usar nova publicação de rollback para conteúdo, sem apagar revisões. Migrations 0000–0003 aplicadas apenas localmente; novas migrations terão registro próprio.
