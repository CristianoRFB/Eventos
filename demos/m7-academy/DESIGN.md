# DESIGN — M7 Academy / MatchOps (prévia independente)

## Verificação e hipóteses — 02/11/2026
CONFIRMADO NO PRINT: Instagram @m7academy_, campeonatos de League of Legends, publicações das Copas do Tesouro e do Kraken, comunicação visual preto/âmbar/roxo, premiação anunciada em publicação antiga (não reutilizada como anúncio vigente). URL Instagram: https://www.instagram.com/m7academy_/
CONFIRMADO NA WEB: https://m7arena.pro/ faz referência ao perfil @m7academy_ e **já apresenta** criação de equipes, torneios, ranking por PDL, premiação e links comunitários. Atribuição/gestão do domínio por parte do prospecto não foi verificada independentemente.
HIPÓTESES: dificuldade de check-in, envio de placar, contestação e validação pela staff. Não assumir que o site existente não tem essas funções.
DESCONHECIDO: backend atual, disponibilidade de integração, processo real de organização, autorização de uso de marca, calendário/preços/ regras atuais.
DEMO_FICTICIO: nomes dos times, horários, resultados e toda ação. Não há pessoas reais.

## Objetivo, público e tarefas
Complemento demonstrativo de `match operations`, não substituto de M7 Arena.
- Público: ver confrontos, status e resultados validados.
- Capitão: marcar check-in e enviar resultado hipotético.
- Staff: revisar placar / rejeitar solicitação com retorno para o capitão.
Experiência em ~90 s: abrir confronto, marcar presença, registrar resultado e aprovar na staff, vendo refletir no painel público.

## Direção de arte
Palavras: **competitivo, preciso, elétrico**. Proposta autoral, não identidade visual oficial.
- canvas #090b11; surface #121620; panel #1a2030; ink #f6f8fd; muted #aeb7c7; accent #ffb923; pulse #a68bff; success #5ee0ae; danger #ff879a; border #30394d.
- Fonte: system-ui e fallback nativo; headings em peso 800, body 400/600, números tabulares.
- Grid: mobile 320px+ em uma coluna, nav rolável, 2 colunas a partir de 760px, 12-col desktop até 1440px; spacing 4/8/12/16/24/32/48/64.
- Estilo: tipografia editorial, linhas técnicas, painel de confronto, números grandes, contraste alto. Sem imagens/ícones/logos oficiais do LoL, personagens Riot ou fotos copiadas.
- Motion: apenas microestados de 160ms. Respeito a prefers-reduced-motion; foco visível.

## Interação e critérios
- 3 visões por URL `?view=publico`, `?view=capitao`, `?view=staff`, com link entre elas.
- Estado em sessionStorage por navegador; sem rede, servidor, Pix ou contato real.
- Botões desabilitados/feedback; confirmação de resultado e reversão pela staff, filtros de status, reset.
- Textos e controles com acessibilidade básica; respeitar foco e teclado.
- Testes de 320, 360, 390, 430, 768, 1024, 1440px; sem overflow, com possibilidade de testar sem mouse.
- A identidade é apenas estudo de direção de arte. Marca presente exclusivamente como referência conceitual não oficial.

## White-label readiness
GLOBAL: componentes de feedback, armazenamento e status. VERTICAL EVENTOS: torneio, partida, check-in, resultado, revisão. LOCAL: cores, nome, formatos, prazos, regulamentos. Não há backend/tenant/auth neste protótipo; integrar no futuro exige tenant organizer, edition, RBAC server-side, antifraude, logs, consentimento e políticas aprovadas.
