# Diagramas renderizados do design preservado

**Classificação:** `PLANNED_DESIGN`. **Reconciliado com runtime:** `NOT_STARTED`.  
**Renderer executado:** `@mermaid-js/mermaid-cli` `12.0.0`. Os 16 SVGs deste diretório vieram diretamente das 16 fontes `.mmd` históricas, sem alterar os originais nem os SVGs auxiliares Graphviz do pacote arquitetural.

O [manifesto](manifest.json) contém fonte, SHA-256 de entrada/saída, versão, data UTC e código de saída por diagrama; os logs individuais registram o comando de renderização no contexto da versão. A execução de `node scripts/render-diagrams.mjs` terminou com exit code 0 e 16 PASS de renderização. A tentativa inicial usou `-w`, opção removida em Mermaid CLI 12; após conferir `--help` do executável instalado, foi corrigida para `--size 1800` e a execução completa passou. Esse ajuste de CLI não modificou o conteúdo de nenhum diagrama.

| ID | SVG Mermaid | Fonte histórica |
|---|---|---|
| 01 | [Contexto](01-system-context.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/01-system-context.mmd) |
| 02 | [Containers](02-system-container-deployment.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/02-system-container-deployment.mmd) |
| 03 | [Fronteiras multi-tenant](03-multitenant-boundaries.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/03-multitenant-boundaries.mmd) |
| 04 | [Organização, evento e edição](04-organization-event-edition.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/04-organization-event-edition.mmd) |
| 05 | [Resolução de domínio](05-domain-resolution.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/05-domain-resolution.mmd) |
| 06 | [Ciclo DNS/TLS](06-custom-domain-lifecycle.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/06-custom-domain-lifecycle.mmd) |
| 07 | [Auth e RBAC](07-auth-memberships-rbac.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/07-auth-memberships-rbac.mmd) |
| 08 | [Modelo de dados](08-data-model-erd.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/08-data-model-erd.mmd) |
| 09 | [SSR público](09-public-website-rendering.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/09-public-website-rendering.mmd) |
| 10 | [Publicação editorial](10-event-publishing-workflow.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/10-event-publishing-workflow.mmd) |
| 11 | [Programação](11-programming-schedule.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/11-programming-schedule.mmd) |
| 12 | [Inscrição expositor](12-exhibitor-application-workflow.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/12-exhibitor-application-workflow.mmd) |
| 13 | [Entitlements](13-commercial-entitlements.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/13-commercial-entitlements.mmd) |
| 14 | [CI/backup/rollback](14-cicd-backup-rollback.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/14-cicd-backup-rollback.mmd) |
| 15 | [Sequência de request](15-end-to-end-request-sequence.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/15-end-to-end-request-sequence.mmd) |
| 16 | [Onboarding SaaS](16-saas-onboarding.svg) | [Mermaid](../../versions/v0.1.0-architecture/diagrams/source/16-saas-onboarding.mmd) |

As [prévias PNG do ERD](08-data-model-erd.preview.png) e [da sequência](15-end-to-end-request-sequence.preview.png) foram abertas e inspecionadas visualmente: texto e relações legíveis, sem erro de sintaxe ou corte observado. São ilustrações do design, não screenshots de aplicação. O aceite F12 exige ainda reconciliar diagramas com o modelo/runtime realmente implementado, documentar a versão resultante e capturar telas reais.
