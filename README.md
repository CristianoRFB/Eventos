# Eventos 77 — implementação em andamento

Aplicação TypeScript + React Router SSR em Cloudflare Workers, D1/Drizzle e Better Auth.
Uma organizadora é um tenant; eventos e edições permanecem separados. A branch de trabalho
é `codex/eventos77-full-system` no repositório autorizado `CristianoRFB/Eventos`.

## Desenvolvimento local

Requer Node 24.11.1. Nenhuma conta cloud é necessária.

```sh
npm ci
npm run setup:local
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

Abra `http://localhost:5173` (o host administrativo local é exato).
As fixtures são fictícias: `owner-a@example.test`, `owner-b@example.test`,
`editor-a@example.test`, `reviewer-a@example.test`, `shared@example.test` e
`plataforma@example.test`, `invitee@example.test`, senha `TEST_ONLY-Local-2026!`. Estes acessos existem
exclusivamente no banco local. O cadastro público permanece fechado.

```sh
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
npm run docs:check
```

O estado comprovado e as pendências de F0–F12 estão em
[MASTER_EXECUTION_STATUS](docs/implementation/MASTER_EXECUTION_STATUS.md).
CMS, agenda, formulários e domínios reais ainda dependem de implementação e validação.
O pedido de subdomínio `workers.dev` está registrado para uma versão verificável;
não há deploy nesta etapa. Secrets locais, banco e builds não entram no Git.

## Pacote histórico de concepção v0.1.0

**Status:** `DESIGN_PROPOSED / NO_RUNTIME / NO_DEPLOY / NO_CUSTOMER_ONBOARDED`  
**Data:** 14 de outubro de 2026. **Não é código de aplicação.**

Este pacote é o primeiro entregável do chat especialista Eventos 77: especificações, referências atuais, 16 diagramas em Mermaid, 16 SVG auxiliares de Graphviz, matrizes e um GOAL MASTER para futura execução separada no Codex.

## Arquivos de entrada
- [Fontes da arquitetura e decisões](docs/versions/v0.1.0-architecture/ARCHITECTURE.md)
- [Dados e relações](docs/versions/v0.1.0-architecture/DATA_MODEL.md)
- [Telas](docs/versions/v0.1.0-architecture/UX_SCREENS.md)
- [Diagrama fonte e visualização](docs/versions/v0.1.0-architecture/diagrams/DIAGRAMS_MANIFEST.md)
- [GOAL MASTER de implementação](codex/CODEX_GOAL_MASTER_EVENTOS_77_FULL_SYSTEM.txt)
- [Mensagem de início para Codex](codex/CODEX_START_EVENTOS_77.txt)
- [Handoff](EVENTOS_77_HANDOFF.md)

## Decisão central
Organizadora = tenant; evento e edição são entidades distintas; domínio customizado é um alias verificado que aponta para um destino explícito. Tudo roda numa codebase por vertical, com autorização server-side; nenhuma URL ou publicação é prova de implementação neste pacote.

## Limitações da primeira entrega
- **Nenhuma** conta Cloudflare/GitHub/Firebase alterada; nenhum site ou Worker implantado.
- Autenticação indicada como proposta de library; compatibility gate de runtime obrigatório no GOAL.
- Mermaid CLI não disponível no ambiente de geração. Os SVGs anexos são diagramas auxiliares renderizados de DOT, não rendições fiéis dos `.mmd`.
- Não há screenshots reais, pois o software ainda não foi implementado. As pastas de imagens conceituais estão preparadas para o futuro, mas sem imagens inventadas.
