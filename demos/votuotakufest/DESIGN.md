# DESIGN — Votu Otaku Fest (2027, demonstração não oficial)
Verificação: 2026-11-01. Fonte: print @votuotakufest + https://www.votuotakufestoficial.com/ + https://www.votuotakufestoficial.com/event-details/votu-otaku-fest-edicao-10-anos-2-0

## Brief
- **Três palavras:** energético, underground, acolhedor.
- **Públicos:** visitantes da comunidade geek; lojistas/artistas/patrocinadores; organização do evento.
- **Proposta:** de um post de patrocínio no Instagram a uma experiência que gera interesse organizado e triagem pela equipe.
- **Ação principal:** preencher interesse fictício e mudar seu status no painel, na mesma sessão.
- **Real:** Instagram aponta VOF 2027 como em preparação, público cultura pop/anime/cosplay/K-pop/games, chama patrocinadores; site Wix já vendeu ingressos de 2026 (encerrados).
- **Desconhecido:** data/local/lotes/valores/programação/pacotes de patrocínio/limite de stands de 2027. Nunca afirmar conteúdo de 2026 como novo.
- **Natureza:** proposta de interface independente. Não copia logo, criativos, fotos ou marca oficial; wordmark e símbolo geométrico são autorais e fictícios.

## Direção
Editorial pop-japonês com tensão criativa: contraste entre superfícies quase brancas e palco roxo noturno, tipografia impactante, torii abstrato construído com CSS e cards de áreas culturais gerados por CSS. Zero imagens de terceiros ou fontes comerciais embutidas.

| Papel | Valor | Uso |
|---|---|---|
| canvas | #f7f5f2 | leitura |
| ink | #151322 | headings e botões |
| stage | #171127 | hero |
| primary | #5b26ec | títulos acentuados |
| magenta | #ff3388 | brilho ilustrativo |
| citrus | #d9fb58 | CTA e sinal de demo |
| muted | #6c6878 | descrições sobre branco |
| warning | #d12f4a | validação |
| hairline | #e7e4e0 | divisões |

- Tipografia: Arial/system UI para corpo e Impact/Arial Black, com fallback, para manchetes.
- Espaçamento: escala 4/8/12/16/24/32/48/64; viewport 320–1440px.
- Componentes: header de visões, hero editorial, cards de universo, aviso de programação, escolhas acessíveis, formulário com validação e confirmação, tabela de triagem com busca, filtro e estado vazio.
- Hero desktop: grande título à esquerda com composição CSS à direita; no mobile, foco no título/CTAs e textura discreta.
- Motion: hover sutil, ticker somente decorativo com opção reduzida.
- Não usar countdown ou mapa de local não confirmado, tabela de preços inventados, ingressos falsos ou métricas de público inferidas do site de 2026.
- Marca e autorais: texto/nome do evento só para contextualização do prospect; todo restante criado como conceito não oficial.

## Fluxos e wireframe
- **Visitante**: hero → áreas culturais → aviso oficial 2027 → participar.
- **Expositor/parceiro**: selecionar modalidade → formulário de exemplo com email @example.test → recibo local → abrir gestão.
- **Gestão**: estatísticas de fixtures → busca/filtragem → atualização de status → reset com confirmação → ver portal.
- Navegação por query string ?view=visitar|participar|gestao e Histórico do navegador; barra móvel com três ações persistentes.
- Teste de promessa em 5s: 'multiverso VOF 2027 + demonstração conceitual' e CTA de participação visíveis; no painel nunca misturar dados fictícios com clientes reais.

## Portabilidade
- GLOBAL: padrão de sinalização DEMO, estados acessíveis, componentes de formulário.
- VERTICAL Eventos: inscrição expositores/artistas, candidatura parceria, triagem por organizadora.
- LOCAL VOF: narrativa da edição, categorias, cores do conceito, preferência de comunicação.
- Future: modelos parametrizados por organization/edition, RBAC server-side e consentimento antes de qualquer produção. Não integrar dados de produção até contrato.

## Aceite
Abre no celular/desktop; navega sem login; não envia dados; só aceita email exemplo; cria registro local; atualiza painel; busca/filtro/status/reset funcionam; avisos de demo visíveis em todas as visões; sem segredos, marca/imagens de terceiros nem integração paga.
