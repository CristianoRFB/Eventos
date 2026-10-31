# Feature states — Eventos 77

Data de checkpoint: 2026-10-20 (`America/Sao_Paulo`). Baseline: `b90ece62e0d3c893dc6e95d6643fa7505dd25602`; branch autorizada: `codex/eventos77-full-system`.

Esta tabela preserva o inventário original (38 features: 28 NOW, 7 NEXT, 3 DEFERRED). Neste checkpoint F0–F7, F9–F10 e F12 estão `PARTIAL`; a mecânica F8 ainda não começou. Um estado parcial representa só as rotas, dados e ações identificadas abaixo; não dá aceite à feature completa.

Fonte: [inventário histórico](docs/versions/v0.1.0-architecture/FEATURE_INVENTORY.csv). A [matriz de features](docs/implementation/FEATURE_TRACEABILITY.csv) conserva persona, dados, rota, permissão, dependência e aceite originais, acrescentando fase, arquivos/testes planejados e evidência real.

NOW integra o escopo solicitado no goal. NEXT continua separado; F8 permite mecânica e fixtures TEST_ONLY depois de F2 sem aprovar catálogo de produção. Não publicar menus/ações operacionais decorativas para NEXT/DEFERRED.

| ID | Recurso | Escopo | Fase | Estado do aceite | Evidência |
|---|---|---|---|---|---|
| F-01 | org provision e suspension | NOW | F2 | PARTIAL | API e painel de plataforma; 19 testes de integração |
| F-02 | invite owner | NOW | F2 | PARTIAL | Convite hashado/uso único no API e formulário da organizadora; expiração/revogação pendentes |
| F-03 | audit critical | NOW | F2 | PARTIAL | Auditoria append-only e API; cobertura de mutações ainda parcial |
| F-04 | memberships / roles | NOW | F2 | PARTIAL | Guard server-side, A/B, papéis e last-owner; tela completa de equipe pendente |
| F-05 | organization profile | NOW | F2 | PARTIAL | GET/PATCH e revisão concorrente; edição do perfil na UI pendente |
| F-06 | branding tokens | NOW | F3 | PARTIAL | Editor de tokens acessíveis, API tenant-scoped e testes no PR #6 (CI PASS); branding por evento/edição ainda pendente |
| F-07 | event CRUD | NOW | F3 | PARTIAL | Lista/criação e API PATCH; edição completa na UI pendente |
| F-08 | edition CRUD clone | NOW | F3 | PARTIAL | Criação/lista e clone via API; clone ainda sem teste de exclusão de PII e UI |
| F-09 | domain onboarding | NOW | F7 | PARTIAL | Solicitação D1 e revisão simulada nos PRs #4–#5; DNS/TLS/Cloudflare reais não homologados |
| F-10 | home by hostname | NOW | F4 | PARTIAL | CMS/SSR/preview/publish/rollback local; aceite integral pendente |
| F-11 | SEO meta/sitemap | NOW | F4 | PARTIAL | CMS/SSR/preview/publish/rollback local; aceite integral pendente |
| F-12 | editions history | NOW | F4 | PARTIAL | CMS/SSR/preview/publish/rollback local; aceite integral pendente |
| F-13 | page section editor | NOW | F4 | PARTIAL | CMS/SSR/preview/publish/rollback local; aceite integral pendente |
| F-14 | atomic publish/rollback | NOW | F4 | PARTIAL | CMS/SSR/preview/publish/rollback local; aceite integral pendente |
| F-15 | asset upload | NOW | F3 | PARTIAL | R2 local, validação, licença e ACL; R2 real, variantes e reconciliação pendentes |
| F-16 | stage/venue CRUD | NOW | F5 | PARTIAL | Cadastros versionados, conflito e diretórios do snapshot; locais e aceite integral pendentes |
| F-17 | program scheduling | NOW | F5 | PARTIAL | Cadastros versionados, conflito e diretórios do snapshot; locais e aceite integral pendentes |
| F-18 | agenda by day stage | NOW | F5 | PARTIAL | Cadastros versionados, conflito e diretórios do snapshot; locais e aceite integral pendentes |
| F-19 | guest profiles | NOW | F5 | PARTIAL | Cadastros versionados, conflito e diretórios do snapshot; locais e aceite integral pendentes |
| F-20 | guest catalog | NOW | F5 | PARTIAL | Cadastros versionados, conflito e diretórios do snapshot; locais e aceite integral pendentes |
| F-21 | application form builder | NOW | F6 | PARTIAL | Forms versionados, envio privado, revisão e publicação consentida locais; anexos/retenção/export e aceite integral pendentes |
| F-22 | submit application | NOW | F6 | PARTIAL | Forms versionados, envio privado, revisão e publicação consentida locais; anexos/retenção/export e aceite integral pendentes |
| F-23 | application review | NOW | F6 | PARTIAL | Forms versionados, envio privado, revisão e publicação consentida locais; anexos/retenção/export e aceite integral pendentes |
| F-24 | public exhibitor directory | NOW | F6 | PARTIAL | Forms versionados, envio privado, revisão e publicação consentida locais; anexos/retenção/export e aceite integral pendentes |
| F-25 | FAQ and regulatory pages | NOW | F4 | PARTIAL | CMS/SSR/preview/publish/rollback local; aceite integral pendente |
| F-26 | sponsors management | NOW | F5 | PARTIAL | Cadastros versionados, conflito e diretórios do snapshot; locais e aceite integral pendentes |
| F-27 | announcements | NEXT | F9 | NOT_STARTED | Não executada |
| F-28 | activity/audit reporting | NEXT | F9 | NOT_STARTED | Não executada |
| F-29 | analytics aggregates | NEXT | F9 | NOT_STARTED | Não executada |
| F-30 | CSV export submissions | NEXT | F9 | NOT_STARTED | Não executada |
| F-31 | manual plans | NEXT | F8 | PARTIAL | Atribuição manual sintética, owner-only, D1/CAS e auditoria em local; planos comerciais reais NÃO APROVADOS |
| F-32 | visible quota status | NEXT | F8 | NOT_STARTED | Não executada |
| F-33 | synthetic demo | NEXT | F8 | PARTIAL | Catalogo `internal-demo` em APP_ENV=local e controles administrativos somente teste; publicação comercial bloqueada |
| F-34 | external ticket link | NOW | F4 | PARTIAL | CMS/SSR/preview/publish/rollback local; aceite integral pendente |
| F-35 | ticket gateway native | DEFERRED | DEFERRED | DEFERRED | Fora do escopo atual |
| F-36 | whatsapp/SMS automation | DEFERRED | DEFERRED | DEFERRED | Fora do escopo atual |
| F-37 | cosplay marketplace | DEFERRED | DEFERRED | DEFERRED | Fora do escopo atual |
| F-38 | staging/domain provider monitor | NOW | F7 | PARTIAL | Status D1 e fake provider com downgrade fail-closed; monitoramento hosted/staging ausente |


As 60 telas (51 NOW, 9 NEXT) permanecem em [SCREEN_TRACEABILITY.csv](docs/implementation/SCREEN_TRACEABILITY.csv); os estados implementados têm prova desktop/mobile no [manifesto de screenshots](docs/implementation/screenshots/manifest.json). Exigir loader/action/persistência e estados de UX aplicáveis, com prova PC/mobile antes de PASS. Os 16 diagramas Mermaid representam o design renderizado e ainda não reconciliado integralmente com o runtime.

Nenhuma integração Firebase runtime, domínio próprio, plano comercial, staging, produção ou cliente real é declarada. O backend local usa Cloudflare Workers/D1/R2 em modo local. Veja [CURRENT](docs/CURRENT.md) e [MASTER_EXECUTION_STATUS](docs/implementation/MASTER_EXECUTION_STATUS.md) para evidências e próximo passo.
