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

## F5 — checkpoint funcional incremental

Código: `d5765415f094877920f25dd83906ffdd08c05994`, enviado ao origin; controles nativos de formulário estilizados no checkpoint seguinte `6f5c6ab`. Nenhuma publicação cloud foi acionada pela execução. A integração externa não foi presumida a partir do console.

| Comando | Resultado executado | Evidência |
|---|---|---|
| `npm run db:generate` | exit 0 após corrigir IDs de metadados; 30 tabelas, migration 0004 gerada | ADR-007; SQL e snapshots versionados |
| `npm run db:migrate:local` | exit 0; 0004 aplicada, 27 statements | [log](evidence/2026-10-19/migrate-f5.log.txt) |
| `npm run lint` | exit 0 | [log](evidence/2026-10-19/lint-f5.log.txt) |
| `npm run typecheck` | exit 0 | [log](evidence/2026-10-19/typecheck-f5.log.txt) |
| `npm test` | exit 0; 114 PASS em 8 arquivos | [log](evidence/2026-10-19/unit-f5.log.txt) |
| `npm run build` | exit 0; client e SSR compilados localmente | [log](evidence/2026-10-19/build-f5.log.txt) |
| `npm run test:integration` | exit 0; 21 PASS no Worker/D1/R2 local | [log](evidence/2026-10-19/integration-f5-full.log.txt) |
| `npm run test:e2e` | exit 0; 12 PASS, 6 jornadas por viewport 1440/390 | [log](evidence/2026-10-19/e2e-f5-full.log.txt) |
| `npm run docs:check` | exit 0; proveniência e cobertura documental verificadas | 172 cláusulas, 65 globais, 38 features, 60 telas, 16 fontes/renders preservados |

As falhas intermediárias foram corrigidas: seletores de formulário ganharam nomes explícitos; o teste de filtro diferencia HTML visível de dados públicos de hidratação; o rewrite `/_public` foi substituído por rotas públicas reais e índice compartilhado com landing administrativa. O teste E2E agora exige ausência de erros de navegador, navegação para home/convidados, filtro de agenda, cookie administrativo ausente no host público e painel bloqueado nesse host.

[Dez novas capturas reais](screenshots/2026-10-19/manifest.json) complementam as 16 históricas. Cada nova imagem possui SHA-256, dimensões, viewport, horário e commit. Programa mobile e editor desktop foram inspecionados visualmente; o ajuste posterior de select/textarea foi motivado por essa inspeção.

F4/F5 continuam `PARTIAL`: purge real indisponível, preservação de URL de edição arquivada, gestão completa de locais e ensaio público de dois dias ainda exigem fechamento. As novas revisões preservam o histórico, validam referências/horários e removem perfis em preparação ou sem opt-in do snapshot público. A abstração de formulários/submissões F6 é o próximo bloco independente.
