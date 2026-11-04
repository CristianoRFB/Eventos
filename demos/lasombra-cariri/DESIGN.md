# DESIGN — Prévia conceitual La’Sombra Cariri (04/11/2026)

**Status:** LEAD pesquisado; DEMO NÃO OFICIAL, sem contratação/cliente formal. O nome “Após o Crepúsculo” é um conceito visual editorial original, não marca da organização.

## Evidências e hipóteses
- Print público enviado: @lasombracariri, “La’Sombra — Subcultura Gótica”, encontros, música, terror e calendário com “Halloween”, “Encontros” e “Sorteio”.
- Evento real documentado: Halloween La’Sombra 2026 em 10/10/2026, 20h, Juazeiro do Norte/CE, ingressos por lotes via Sympla: https://www.sympla.com.br/evento/halloween-lasombra/3540428
- **Confirmado:** uso anterior da Sympla; evento realizado com música, ambientação e comunidade.
- **Hipótese a validar:** necessidade de um portal de agenda, cadastro/credenciamento próprio ou gestão centralizada.
- **Desconhecido:** volume financeiro, porte atual da equipe, frequência e próximos eventos.
- **DEMO FICTÍCIO:** três eventos futuros e todas as inscrições, capacidades, códigos e indicadores.

## Decisão de produto
Não reproduzir um checkout pago nem competir com a Sympla. Priorizar: (1) calendário cultural e organização da informação; (2) confirmação de participação em modo demo; (3) credenciamento de entrada; (4) painel de organizadora para lotação e atualização da programação.

## Direção visual
Três palavras: **ritualista, editorial, acolhedora**. Estética darkwave/gótica sem ícones de logo copiados; interface deliberadamente simples e utilitária nas telas operacionais.

| Token | Valor |
| --- | --- |
| Canvas | `#101014` |
| Surface | `#1d1b21` |
| Ink | `#f2eae4` |
| Muted | `#b7acb2` |
| CTA | `#db434f` |
| Light section | `#f2e8e1` |
| Border | `#383039` |
| Tipografia | Italiana (destaques), DM Sans (interface), fontes via Google Fonts com fallback Georgia/system |
| Composição | hero editorial com arco e lua em CSS, cards de eventos, modais evitados, forms claros, dashboard compacto |

Nenhuma fotografia, poster ou logo do prospect foi reutilizada. Ilustrações são construídas exclusivamente com CSS. O projeto utiliza tipografia Google Fonts pela API pública.

## Vistas e UX
- `/`: agenda, filtros e explicação da jornada.
- `/participante`: escolha de evento, apelido fictício e código de inscrição.
- `/equipe`: busca, código de entrada, status e reversão de check-in.
- `/gestao`: contagem de inscrições/entradas, abertura de inscrições, cadastro de novo evento e capacidade.

Sem autenticação nem backend: somente dados fictícios em localStorage por navegador, não compartilhados entre celulares. Não vender como emissão real de ingresso, venda, anti-fraude ou controle real de portaria.

## Segurança e acessibilidade
- Avisos de “demonstração não oficial” visíveis; sem autorização para usar identidade/fotos.
- Escape de conteúdo dinâmico antes de renderizar via HTML.
- Formulário sem e-mail, telefone, pagamento, documentos ou identificação real; orientação explícita para usar apelido fictício.
- Foco por teclado visível, labels e controles de pelo menos 40px; reduced motion.
- Layout 320–1440px com breakpoints 520/780/1050.
- Prévia não implica autorização de produção. Para implantação: autenticação/RBAC, banco persistente, validação server-side de entradas, prevenção de duplicatas, consentimento LGPD e integração oficial com ticketing, se aplicável.

## Publicação
- Repositório: `CristianoRFB/Eventos` branch `demo/lasombra-cariri-2026`
- Worker independente: `77-lasombra-cariri-demo`; URL: https://77-lasombra-cariri-demo.on7.workers.dev
- Worker entrega HTML fixado ao commit do GitHub usando `raw.githubusercontent.com`, cache de 300s. Depende do GitHub Raw disponível no momento da primeira requisição por borda.
- Verificação via fetch público: páginas `/`, `/participante`, `/equipe`, `/gestao` responderam com conteúdo renderizado (04/11/2026). Teste de formulários por automação não pôde ser realizado por indisponibilidade de créditos no serviço de browser conectado.

## Acompanhamento comercial
Prioridade **média-alta**: possui eventos comprovados e há valor potencial no branding da comunidade e atendimento de entrada; **não afirmar** ausência de tecnologia, problema financeiro ou dificuldade operacional. Primeiro contato pede permissão para enviar/mostrar a demonstração, sem dizer que já houve visita.