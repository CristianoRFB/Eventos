# Feature states — Eventos 77

Data de checkpoint: 2026-10-14 (`America/Sao_Paulo`). Baseline: `b90ece62e0d3c893dc6e95d6643fa7505dd25602`; branch autorizada: `codex/eventos77-full-system`.

Esta tabela preserva o inventário original (38 features: 28 NOW, 7 NEXT, 3 DEFERRED). F0 está `PARTIAL`, F1 `IN_PROGRESS` e F12 `PARTIAL` pelos 16 renders Mermaid; nenhum módulo abaixo tem aceite funcional comprovado neste checkpoint. A existência de scaffold ou de um nome de rota não implementa uma feature. `NOT_STARTED` é o estado do aceite funcional, não uma afirmação de inexistência de qualquer arquivo em desenvolvimento.

Fonte: [inventário histórico](docs/versions/v0.1.0-architecture/FEATURE_INVENTORY.csv). A [matriz de features](docs/implementation/FEATURE_TRACEABILITY.csv) conserva persona, dados, rota, permissão, dependência e aceite originais, acrescentando fase, arquivos/testes planejados e evidência real.

NOW integra o escopo solicitado no goal. NEXT continua separado; F8 permite mecânica e fixtures TEST_ONLY depois de F2 sem aprovar catálogo de produção. Não publicar menus/ações operacionais decorativas para NEXT/DEFERRED.

| ID | Recurso | Escopo | Fase | Estado do aceite | Evidência |
|---|---|---|---|---|---|
| F-01 | org provision e suspension | NOW | F2 | NOT_STARTED | Não executada |
| F-02 | invite owner | NOW | F2 | NOT_STARTED | Não executada |
| F-03 | audit critical | NOW | F2 | NOT_STARTED | Não executada |
| F-04 | memberships / roles | NOW | F2 | NOT_STARTED | Não executada |
| F-05 | organization profile | NOW | F2 | NOT_STARTED | Não executada |
| F-06 | branding tokens | NOW | F3 | NOT_STARTED | Não executada |
| F-07 | event CRUD | NOW | F3 | NOT_STARTED | Não executada |
| F-08 | edition CRUD clone | NOW | F3 | NOT_STARTED | Não executada |
| F-09 | domain onboarding | NOW | F7 | NOT_STARTED | Não executada |
| F-10 | home by hostname | NOW | F4 | NOT_STARTED | Não executada |
| F-11 | SEO meta/sitemap | NOW | F4 | NOT_STARTED | Não executada |
| F-12 | editions history | NOW | F4 | NOT_STARTED | Não executada |
| F-13 | page section editor | NOW | F4 | NOT_STARTED | Não executada |
| F-14 | atomic publish/rollback | NOW | F4 | NOT_STARTED | Não executada |
| F-15 | asset upload | NOW | F3 | NOT_STARTED | Não executada |
| F-16 | stage/venue CRUD | NOW | F5 | NOT_STARTED | Não executada |
| F-17 | program scheduling | NOW | F5 | NOT_STARTED | Não executada |
| F-18 | agenda by day stage | NOW | F5 | NOT_STARTED | Não executada |
| F-19 | guest profiles | NOW | F5 | NOT_STARTED | Não executada |
| F-20 | guest catalog | NOW | F5 | NOT_STARTED | Não executada |
| F-21 | application form builder | NOW | F6 | NOT_STARTED | Não executada |
| F-22 | submit application | NOW | F6 | NOT_STARTED | Não executada |
| F-23 | application review | NOW | F6 | NOT_STARTED | Não executada |
| F-24 | public exhibitor directory | NOW | F6 | NOT_STARTED | Não executada |
| F-25 | FAQ and regulatory pages | NOW | F4 | NOT_STARTED | Não executada |
| F-26 | sponsors management | NOW | F5 | NOT_STARTED | Não executada |
| F-27 | announcements | NEXT | F9 | NOT_STARTED | Não executada |
| F-28 | activity/audit reporting | NEXT | F9 | NOT_STARTED | Não executada |
| F-29 | analytics aggregates | NEXT | F9 | NOT_STARTED | Não executada |
| F-30 | CSV export submissions | NEXT | F9 | NOT_STARTED | Não executada |
| F-31 | manual plans | NEXT | F8 | NOT_STARTED | Não executada |
| F-32 | visible quota status | NEXT | F8 | NOT_STARTED | Não executada |
| F-33 | synthetic demo | NEXT | F8 | NOT_STARTED | Não executada |
| F-34 | external ticket link | NOW | F4 | NOT_STARTED | Não executada |
| F-35 | ticket gateway native | DEFERRED | DEFERRED | DEFERRED | Fora do escopo atual |
| F-36 | whatsapp/SMS automation | DEFERRED | DEFERRED | DEFERRED | Fora do escopo atual |
| F-37 | cosplay marketplace | DEFERRED | DEFERRED | DEFERRED | Fora do escopo atual |
| F-38 | staging/domain provider monitor | NOW | F7 | NOT_STARTED | Não executada |


As 60 telas (51 NOW, 9 NEXT) permanecem em [SCREEN_TRACEABILITY.csv](docs/implementation/SCREEN_TRACEABILITY.csv); exigir loader/action/persistência e estados de UX aplicáveis, com prova PC/mobile antes de PASS. Os 16 diagramas Mermaid permanecem PLANNED em [DIAGRAM_STATUS.csv](docs/implementation/DIAGRAM_STATUS.csv).

Nenhuma integração Firebase/Cloudflare, domínio próprio, plano comercial, staging, produção, screenshot ou cliente real é declarada implementada por esta tabela. Veja [CURRENT](docs/CURRENT.md) e [MASTER_EXECUTION_STATUS](docs/implementation/MASTER_EXECUTION_STATUS.md) para evidências e próximo passo.
