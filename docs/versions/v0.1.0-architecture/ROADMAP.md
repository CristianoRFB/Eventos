# Roadmap de entrega (proposta, sem datas inventadas)

| Fase | Objetivo | Gate | Estado |
|---|---|---|---|
| F0 | verificar fonte, ADR, repo isolado | confirmação usuário | NOT_STARTED |
| F1 | scaffold, migrations, CI | build/tests básicos | NOT_STARTED |
| F2 | session, tenants, RBAC, Platform Owner | isolamento A×B | NOT_STARTED |
| F3 | CRUD organizadora/evento/edição, R2 | persistência e upload | NOT_STARTED |
| F4 | template público SSR, CMS, snapshots | SEO/publicação/rollback | NOT_STARTED |
| F5 | agenda, atrações, convidados, expositores | conflitos e escopo | NOT_STARTED |
| F6 | submissions/approval com consentimento | testes antiabuso | NOT_STARTED |
| F7 | domínio custom provider e resolver | TLS+DNS gating em staging autorizado | NOT_STARTED |
| F8 | comercial global v01 local | aprovação de limites + server gating | NOT_STARTED |
| F9 | dashboards, export, a11y e controles | E2E jornadas completas | NOT_STARTED |
| F10 | hardening, restore, teste 360º | security/QA | NOT_STARTED |
| F11 | staging e PROD (externos) | autorização separada | BLOCKED_BY_APPROVAL |
| F12 | docs/screenshot real/diagrama render | docs:check e evidências | NOT_STARTED |

**MVP Vendável:** exige F0–F7 (custom hostname real conforme necessidade), F9/F10, staging e homologação; F8 somente após política comercial aprovada e gate de Core seguro. GOAL descreve F0–F12, mas seu progresso deve ser incremental e retomável.
