# DIAGRAMS_MANIFEST — proposta v0.1.0

**Estado:** DESIGN PROPOSTO; não descreve código implementado.

16 fontes Mermaid editáveis e 16 SVGs esquemáticos de acompanhamento. Os SVGs foram renderizados de fontes Graphviz/DOT paralelas, NÃO são uma transpilação dos arquivos Mermaid (o ambiente não tinha Mermaid CLI). A fonte `.mmd` é a especificação rica/canônica; DOT/SVG são resumos visuais. O futuro Codex deve renderizar os `.mmd` com `mmdc`, rever a equivalência e substituir SVGs quando puder.

| Diagrama | Mermaid fonte | SVG auxiliar |
|---|---|---|
| 01-system-context | [`.mmd`](source/01-system-context.mmd) | [`.svg`](rendered/01-system-context.svg) |
| 02-system-container-deployment | [`.mmd`](source/02-system-container-deployment.mmd) | [`.svg`](rendered/02-system-container-deployment.svg) |
| 03-multitenant-boundaries | [`.mmd`](source/03-multitenant-boundaries.mmd) | [`.svg`](rendered/03-multitenant-boundaries.svg) |
| 04-organization-event-edition | [`.mmd`](source/04-organization-event-edition.mmd) | [`.svg`](rendered/04-organization-event-edition.svg) |
| 05-domain-resolution | [`.mmd`](source/05-domain-resolution.mmd) | [`.svg`](rendered/05-domain-resolution.svg) |
| 06-custom-domain-lifecycle | [`.mmd`](source/06-custom-domain-lifecycle.mmd) | [`.svg`](rendered/06-custom-domain-lifecycle.svg) |
| 07-auth-memberships-rbac | [`.mmd`](source/07-auth-memberships-rbac.mmd) | [`.svg`](rendered/07-auth-memberships-rbac.svg) |
| 08-data-model-erd | [`.mmd`](source/08-data-model-erd.mmd) | [`.svg`](rendered/08-data-model-erd.svg) |
| 09-public-website-rendering | [`.mmd`](source/09-public-website-rendering.mmd) | [`.svg`](rendered/09-public-website-rendering.svg) |
| 10-event-publishing-workflow | [`.mmd`](source/10-event-publishing-workflow.mmd) | [`.svg`](rendered/10-event-publishing-workflow.svg) |
| 11-programming-schedule | [`.mmd`](source/11-programming-schedule.mmd) | [`.svg`](rendered/11-programming-schedule.svg) |
| 12-exhibitor-application-workflow | [`.mmd`](source/12-exhibitor-application-workflow.mmd) | [`.svg`](rendered/12-exhibitor-application-workflow.svg) |
| 13-commercial-entitlements | [`.mmd`](source/13-commercial-entitlements.mmd) | [`.svg`](rendered/13-commercial-entitlements.svg) |
| 14-cicd-backup-rollback | [`.mmd`](source/14-cicd-backup-rollback.mmd) | [`.svg`](rendered/14-cicd-backup-rollback.svg) |
| 15-end-to-end-request-sequence | [`.mmd`](source/15-end-to-end-request-sequence.mmd) | [`.svg`](rendered/15-end-to-end-request-sequence.svg) |
| 16-saas-onboarding | [`.mmd`](source/16-saas-onboarding.mmd) | [`.svg`](rendered/16-saas-onboarding.svg) |

## Gerar SVG fiel do Mermaid no futuro
Instalar no repositório de implementação o pacote `@mermaid-js/mermaid-cli` (versão fixada e revisada). Então executar `npx mmdc -i docs/versions/v0.1.0-architecture/diagrams/source/01-system-context.mmd -o docs/versions/v0.1.0-architecture/diagrams/rendered/01-system-context.svg` e repetir para as 16 fontes. Não marcar como validado antes da execução.
