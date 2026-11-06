# Feira Geek RS — demonstração comercial independente

**Status:** DEMO INTERATIVA LOCAL / NÃO OFICIAL · 06/11/2026
**URL verificada:** https://77-feirageek-rs-conceito.on7.workers.dev/
**Worker:** `77-feirageek-rs-conceito` (conta Cloudflare conectada) · Fonte HTML: `index.html`

## Pesquisa e qualificação
- Identidade observada no print: Instagram `@feirageekrs`, feira geek itinerante.
- Fonte externa: Shopping TOTAL — parceria em maio de 2026, com programação de cosplay, K-pop, workshops e entrada gratuita: https://shoppingtotal.com.br/evento-geek-transforma-o-shopping-total-em-ponto-de-encontro-da-cultura-pop/
- Fonte externa: Giro de Cachoeirinha — edição no Shopping do Vale em abril de 2026, com expositores e atividades: https://girodecachoeirinha.com.br/cultura-geek-sera-destaque-em-cachoeirinha-neste-final-de-semana-em-mais-uma-feira-no-shopping-do-vale/
- **Não confirmado:** próxima data e local, sistema atual de inscrições, demanda por bilheteria, site oficial próprio e disposição de investimento.
- **Qualificação:** média-alta para uma abordagem humana e exploratória. Múltiplas edições e variedade de participantes sugerem utilidade na centralização de informações; não pressupor dor comprovada.

## DESIGN / direção de arte
- Personalidade: **energética, comunitária, organizada**.
- Público: visitante e fã, expositor e equipe organizadora.
- Ação principal: consultar programação e salvar atrações; secundárias: simular inscrição de expositor e administrar a programação.
- Arte: alto contraste, base noturna (#0d0f14), verde-lima (#c8ff63), coral (#ff816c), lavanda (#c3a8ff), papel-claro (#f6f4ee); tipografia sistema, ilustração geométrica 100% CSS, sem imagens externas nem logotipos.
- Grid: largura máxima 1180px; transições para tablet 950px e celular 700/365px; alvos tocáveis >= 42px; foco visível; redução de movimento respeitada.
- Conteúdo: programação, expositores, candidatura e indicadores **fictícios, explicitamente rotulados**.

## Três ambientes
1. **Visitante** — hero, agenda filtrável por dia, favoritos locais, catálogo fictício de expositores e CTA.
2. **Expositor** — formulário de candidatura ilustrativa, acompanhamento de status local e orientações.
3. **Organização** — editar local/data ilustrativos, criar/ocultar/excluir atrações, aprovar/reabrir candidaturas e restaurar o seed de exemplo.

## Limitações e segurança
- Front-end estático; `localStorage` por navegador. **Não há** backend, sincronização entre aparelhos, autenticação, pagamento, bilheteria, inscrições reais ou contato ao prospect.
- Painel administrativo sem senha **somente porque é simulado e não contém dados reais**. Não copiar essa arquitetura para produção.
- Não usar dados pessoais reais no formulário; sem fotos e marcas do negócio.
- Não afirmar datas da próxima edição, atrações ou expositores do prospect.
- Worker faz proxy de HTML imutável versionado por SHA no GitHub. Alterações na branch não afetam o deploy até republicar o Worker.

## Verificações realizadas
- Sintaxe JavaScript validada via `new Function` no código versionado.
- Teste funcional por simulação de DOM: seis atrações, formulário criando candidatura, nova atração publicada, alteração de dados e favoritos salvos; sem falha.
- GET público do Worker e `/__health` responderam corretamente; origem GitHub status 200 e título da página confirmado.
- **Não realizado:** Playwright real de celular/desktop, screenshot de browser e análise automatizada de contraste (automação de navegador indisponível no ambiente).
- Gate: **APRESENTÁVEL COM LIMITAÇÕES EXPLÍCITAS** para prospecção, NÃO pronto para operação real.

## Classificação
GLOBAL: rótulo DEMO e UX responsiva.
VERTICAL EVENTOS: programa/atração, expositores, edição, organização.
LOCAL: identidade conceitual, cor, textos, dataset. Este diretório não muda produto canônico nem o default branch.
