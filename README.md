# Eventos 77 — pacote de concepção v0.1.0

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
