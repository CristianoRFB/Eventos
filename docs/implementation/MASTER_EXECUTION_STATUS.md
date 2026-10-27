# MASTER EXECUTION STATUS — Eventos 77

**Checkpoint:** 27/10/2026 na branch de chat — [evidências e código F6](checkpoint-2026-10-27-chat.md). Histórico de 20/10 e 14/10 preservado; não há merge/deploy.
**Resultado integral:** `IN_PROGRESS`; não é `CORE_READY`, `READY_FOR_STAGING`, `READY_FOR_PILOT` nem `PRODUCTION_VERIFIED`.  
**Checkout/origin:** `C:\OpenSSL\set\Eventos` / `https://github.com/CristianoRFB/Eventos.git`.  
**Branch:** `codex/eventos77-full-system`.  
**Baseline:** `b90ece62e0d3c893dc6e95d6643fa7505dd25602`; checkpoint funcional atual: `8ea34d960d487335c721c7bcbf9040897266dafb` (F6), após `a9beeac` (evidências F5). Base auth/tenant preservada: `21ce08b2a1c4a4389d5273e9bacec53ea027918f`; documentação F0 preservada: `a989a35c8b39c95f20ecf4155553b772f83e3f1e`. Evidências atuais no [checkpoint de fechamento](checkpoint-2026-10-20.md), com roteiro para terminar o goal; evidências F5 no [checkpoint de retomada](checkpoint-2026-10-19.md), anteriores no [checkpoint local](checkpoint-2026-10-14.md).

## Autorização e evidência inicial

O usuário escolheu expressamente este checkout/repositório/branch após a divergência com o nome Eventos-77 proposto no briefing. [ADR-005](../adr/ADR-005-authorized-repository-and-execution.md) registra essa escolha. O pedido posterior disponibilizou os consoles Cloudflare/Firebase, indicou subdomínio Workers futuro e priorizou desenvolvimento. Todos os checks deste checkpoint usaram recursos locais/sintéticos; nenhum recurso, banco, bucket, hostname, migration cloud, DNS ou deploy real foi criado ou alterado. O runtime Firebase ainda não está integrado.

O [pre-flight Git executado](preflight-git.txt) comprova raiz, remote, branch, status e HEAD no instante da captura. O código foi fixado no SHA acima. A arquitetura inicial e as 16 fontes Mermaid foram preservadas; os 16 diagramas de design foram renderizados. A matriz de requisitos separa progresso parcial das fases ainda não iniciadas.

## Status por fase

| Fase | Status | Evidência atual | Aceite/impedimento e NEXT_STEP |
|---|---|---|---|
| F0 | PARTIAL | ADR-005; preflight-git.txt; matrizes; `npm ci`; docs:check; versões no lockfile | Destino e branch autorizados; inventário e renders conferidos. Falta auditoria completa de licenças e fechamento documental. |
| F1 | PARTIAL | [checkpoint local](checkpoint-2026-10-14.md); commit `21ce08b`; migrations `0000`/`0001`; 98 unitários; 19 integração; 8 E2E | SSR e login passaram no Worker local com D1/R2 local. Falta teste de expiração, Worker sem D1, restart/persistência explícitos e execução hosted da CI. |
| F2 | PARTIAL | `tenant-schema.ts`; `tenant.server.ts`; `api.server.ts`; `invitations.server.ts`; integração A/B | Memberships, RBAC por evento, convite com token hash, Platform Owner, suspensão e audit passaram. Falta aceite de expiração do convite, gestão completa de papéis na UI e suporte operacional. |
| F3 | PARTIAL | `0000_same_tinkerer.sql`; `api.server.ts`; `media.server.ts`; formulários de eventos/edições; testes locais | Eventos, edições, clone API, CAS e mídia local passaram em parte. Falta editor de marca, clone comprovado sem PII, variantes e reconciliação de R2. R2 real não provisionado. |
| F4 | PARTIAL | Código preservado em `d5d5f0f`; 20 testes de API repetidos em 2026-10-19; `content.server.ts`; migrations 0002/0003 | CMS com revisão, prévia privada, publish CAS, SSR/SEO e rollback comprovados localmente. Purge indisponível com warning/TTL curto; páginas e aceites adicionais pendentes. |
| F5 | PARTIAL | Commit `d576541`; `operations.ts`; `operations.server.ts`; `operations-schema.ts`; migration 0004; 114 unitários, 21 API e 12 E2E PASS | Agenda/cadastros em revisões imutáveis; conflitos/escopo/consentimento, filtros e navegação pública. Locais completos e ensaio público de dois dias ainda pendentes. |
| F6 | PARTIAL | Histórico `8ea34d9`; migrations 0005–0007; serviço de anexos R2 privado; [ADR-009](../adr/ADR-009-private-applicant-attachments.md); [CI local PASS em `84629bd6`](https://github.com/CristianoRFB/Eventos/actions/runs/40553072100) | Formulários, candidatura cifrada, upload privado 3×2MiB, read por RBAC, reply, exportação auditada e retirada/retention implementados. Faltam rotação/recovery AES, reconciliação de mídia/avisos/tolerância e aceites hospedados. |
| F7 | PARTIAL | `app/domain/host.ts`; testes unitários de host; flags custom-domain desligadas | Parser e elegibilidade fail-closed testados sem provedor; binding, ownership, DNS, SSL e host real pendentes. Sem PASS cloud. |
| F8 | NOT_STARTED | Catálogo produção NOT_APPROVED | Só iniciar após F2; mecânica TEST_ONLY pode ser provada sem inventar catálogo/preço/quotas/trial. Política permanece gate externo. |
| F9 | PARTIAL | 26 capturas anteriores e [10 F6](screenshots/2026-10-20/manifest.json); 14 E2E | CMS e operação da edição adicionados às jornadas anteriores; público agenda/convidados navega em desktop/mobile sem erro de hidratação. Demais telas NOW e estados continuam pendentes; NEXT fora da UI. |
| F10 | PARTIAL | 120 unitários; 22 integração; 14 E2E; lint/typecheck/build; logs no checkpoint 2026-10-20 | Isolamento, CAS, sessão, mídia, agenda e SSR hidratado passaram. Falta cobertura integral, falhas de provedores, backup/restore e medição. Audit de dependências anterior não substitui novo gate de release. |
| F11 | EXTERNAL_GATE_PENDING | Consoles disponibilizados; nenhum recurso real é prova de aceite | Preparar templates locais. Staging/recursos/custos exigem escopo autorizado; produção tem autorização e homologação próprias. |
| F12 | PARTIAL | Matrizes; 16 fontes e renders Mermaid; [16 screenshots locais](screenshots/manifest.json); [checkpoint](checkpoint-2026-10-14.md) | Docs e capturas das jornadas existentes foram atualizadas; runbooks, CMS, agenda, domínio e aceite completo ainda faltam. |

Cada linha exige SHA de implementação, comando e código de saída, log/cenário, migrations, screenshot quando aplicável e rollback antes de promover PASS. Estados intermediários não reduzem o escopo original. O status da fase externa não impede desenvolvimento local independente.

## Rastreabilidade preservada

- [172 cláusulas F0–F12](REQUIREMENTS_TRACEABILITY.csv): texto original, intervalo de linhas e hash SHA-256 da fonte; destinos/testes são **planejados**, não arquivos existentes certificados.
- [65 cláusulas transversais](GLOBAL_REQUIREMENTS_TRACEABILITY.csv): invariantes, autorização, G0–G8, contratos, matriz de permissões e exit report, com a mesma proveniência.
- [38 features](FEATURE_TRACEABILITY.csv): todos os campos do CSV original preservados; 28 NOW, 7 NEXT e 3 DEFERRED. [Estado legível](../../FEATURE_STATES.md).
- [60 telas](SCREEN_TRACEABILITY.csv): todos os campos originais preservados; 51 NOW e 9 NEXT, incluindo rotas de detalhe e estados.
- [16 diagramas](DIAGRAM_STATUS.csv): fontes originais e hashes preservados; SVG histórico é auxiliar de Graphviz. [16 SVGs Mermaid de design](diagrams/README.md) renderizados com versão fixada; reconciliação runtime não iniciada.

Fonte: [GOAL MASTER](../../codex/CODEX_GOAL_MASTER_EVENTOS_77_FULL_SYSTEM.txt), SHA-256 `c61531b24532c3a5b1bb615fc0158b99b9a334ed32346e57c50937654fa0cbd1`. Esse hash de arquivo é distinto do SHA Git acima.

## Comandos e resultados

`node scripts/render-diagrams.mjs` terminou exit 0 no checkpoint F0, com 16 PASS e [manifesto/logs por diagrama](diagrams/manifest.json). No checkpoint atual, `npm ci`, lint, typecheck, 98 testes unitários, build, 19 testes de API no Worker local, 8 testes E2E, `docs:check`, `npm audit` e migration apply idempotente passaram; comandos e limites estão no [registro](checkpoint-2026-10-14.md). As dependências estão fixadas no `package-lock.json`; Better Auth + Drizzle + D1 passou no Worker local, sem alegar execução hosted da CI.

## Gates e recursos externos

| Gate | Estado comprovado | Próxima evidência necessária |
|---|---|---|
| G0 source/branch | PASS | Checkout/branch autorizados, pre-flight registrado e commits locais documentados. |
| G1 A/B | PARTIAL | Auth/RBAC/dados/mídia testados; forms A/B e revogação de perfil públicos testados localmente; anexos, domínios e superfícies futuras pendentes. |
| G2 schema/migrations | PARTIAL | SQL versionado, D1 local, FKs compostas e apply sem migrations pendentes; migrations 0002–0007 acrescentam CMS/operações/forms/replies/anexos; aceites completos e restore ainda faltam. |
| G3 CMS/publish/rollback | PARTIAL | Jornada v1 → draft v2 invisível → v2 → rollback testada; SSR/hosts A/B e preview privado locais. Cloud/purge real não verificados. |
| G4 domínio fail-closed | PARTIAL | Helpers/eligibilidade puros testados; provider fake completo e host real com ownership+hostname+SSL+DNS faltam. |
| G5 E2E desktop/mobile | PARTIAL | 7 jornadas por viewport, 14 E2E PASS; 36 capturas em três checkpoints. Demais telas/resoluções e estados ainda pendentes. |
| G6 checks/docs | PASS | `npm ci`, lint, typecheck, Vitest, integração, E2E, build, audit e docs:check registrados no checkpoint local. |
| G7 cloud autorizado | EXTERNAL_GATE_PENDING | Escopo e autorização das ações concretas; custo/plano validado no momento. |
| G8 staging/produção | NOT_STARTED | URL/release/logs/smoke/backup/rollback e homologação; produção separada de staging. |

Cloudflare D1/R2/custom hostnames reais: não provisionados. Firebase: console disponibilizado, integração de runtime não provada. Nenhum preço/quota comercial aprovado; nenhuma conta real, email ou lead incorporado. O futuro `workers.dev` não foi publicado.

## Rollback e próximo passo

As migrations `0000`–`0007` foram testadas somente no D1 local fictício; nenhuma migration cloud foi executada. Agenda/cadastros referenciam revisões imutáveis e o rollback editorial mantém o histórico. Retorno seguro: preservar os dados locais e reverter somente commits novos identificados depois do baseline, mantendo compatibilidade com as tabelas adicionais. Nenhum banco ou objeto real foi tocado.

**NEXT_STEP (27/10):** o código de purga, export CSV e resposta de candidato foi implementado e passou CI na revisão `3a0eadf2`. Continuar por **F6 rotação/recovery de chave**, reconciliação/aviso de retenção e aceites de privacidade; em seguida fechar aceites pendentes e F7 provider fake. Veja [checkpoint atual](checkpoint-2026-10-27-chat.md), inclusive limites e autorização externa. Resultado integral IN_PROGRESS, sem declaração de prontidão comercial.
