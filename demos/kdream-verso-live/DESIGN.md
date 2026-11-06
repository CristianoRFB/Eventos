# Design Brief — K-Dream Entertainment · VERSO/LIVE

06/11/2026. Prospecto; não existe parceria/contrato identificado. Direção original, sem logos da K-Dream nem da 77.

## Dados confirmados
- Screenshot entregue pelo usuário: Instagram @kdreamentertainment, K-Dream Entertainment, promotora de eventos e cultura nerd/asiática, destaques K-Dream Experience, K-Sun Festival, K-Sun 2024 e posts de Festiva Nerd e eventos pop; 126 posts, 1.677 seguidores, 43 seguindo no instante do print.
- Fonte externa Doity: https://doity.com.br/k-dream-experience-1 — K-Dream Experience, domingo 29/11/2026, das 10h às 20h, Uninassau Maceió, Maceió, AL.
- Fonte externa Doity: https://doity.com.br/festiva-dream — evento anterior da K-Dream e K-pop/cosplay/games (página antiga sem usar preço como atual).
- Já existe bilheteria/inscrições na Doity. Nossa demo **complementa** e não substitui esse serviço.

## Diagnóstico 
- Confirmado: operação/eventos recorrentes e presença pública com link de eventos.
- Hipóteses: dispersão de agenda e regulamentos no Instagram; propostas de expositores e equipes em DMs; necessidade de visão operacional simplificada no credenciamento.
- Desconhecido: fluxo interno atual, existência de CRM, orçamento, permissão de uso de imagem/marca, equipe real, demandas de integração.

## Direção original
- Personalidade: expressiva, editorial, organizada.
- Públicos: fã/visitante, participante de concurso, equipe na entrada, gerente de produção, parceiro.
- Mensagem: **Onde o fandom ganha palco.** Principal tarefa: visualizar o evento e entender como participar.
- Aesthetic: festival zine, papel off-white #f8f6ee + tinta #171523 + acentos lima #cfff4b, rosa #ff68a4 e violeta #7b5bdf; superfícies de papel, cartazes CSS vetoriais, borda de 2px e sombras offset de impressão. Diferente da demo EAC.
- Tipografia: system-ui com pesos 400/750/900/950; títulos tight line-height e letter-spacing; corpo line-height 1.6.
- Grid: container 1230px; desktop hero 55/45; formulário e painel em duas colunas, 1 coluna abaixo de 830px; mobile 320–430px primeiro.
- Ícones/artes: formas CSS e símbolos tipográficos genéricos, nenhum asset de terceiro.
- Interações: programação filtrável e favoritos; inscrição em atividade ilustrativa e código DEMO; check-in na visão de equipe; editor de programação com rascunho/publicação fictícia; entrada de parcerias no painel; reset dos dados locais.
- Dark/light: hero e programação escuros, formulários e gestão claros para contraste e legibilidade.
- Estados: vazio para equipe e parceiros; feedback de submit, favoritos, reset; foco visível, labels, sem movimentos obrigatórios.
- Informação real: somente nome do evento, data, local/horário divulgados pela Doity e link real externo. Programação, inscrições, participantes, propostas e dados de painel NÃO são reais e são claramente identificados.

## Wireframe textual
- Mobile público: aviso conceito > logo original e nav rolável > headline + CTAs > poster CSS > evento Doity > diferenciais > programação ilustrativa.
- Desktop público: hero 55/45 com arte poster > faixa editorial > spotlight 45/55 > três cards > programação.
- Staff mobile: KPIs 3 colunas (2 em 320px) > busca > fila vertical > check-in.
- Gestor desktop: KPIs > editor e propostas à esquerda > operação/reset à direita.

## Migração futura
- GLOBAL: identidade dos membros, listas e permissões; VERTICAL: evento/edição, agenda, atividade/inscrição, equipe e parceiro; LOCAL: identidade de cliente, nome e conteúdo por configuração.
- Somente demonstração local; para produção: autorização, backend isolado, RBAC, LGPD, integração Doity se autorizada, antifraude e testes multi-tenant.
