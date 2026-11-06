# Entre Mundos — conceito independente para o FanDango (Ji-Paraná)
**Data:** 2026-11-06 · **Estado:** DEMO_INTERATIVA_PERSISTIDA_LOCAL · **Não oficial**

## Evidências e limites
- Print fornecido pelo usuário: perfil `@animefandango`, cultura geek e Ji-Paraná/RO; card de anúncio "evento anual" de 06/12/2026 às 10h. Local exato, programação, regras e inscrições **não confirmados**.
- Fonte histórica independente: https://noarportal.com.br/conheca-o-anime-fandango-evento-geek-que-acontece-anualmente-em-ji-parana/ — evento comunitário sem fins lucrativos, com gratuidade histórica e apoio local. **Não extrapolar para a edição de 2026.**
- Nenhuma marca, logomarca, foto, ilustração ou mascote do prospect foi utilizada.

## Design brief
- Conceito: "Entre Mundos" — direção visual autoral sem alegar identidade oficial.
- Personalidade: comunitária, vibrante, acolhedora.
- Público: visitantes de cultura pop/geek, equipe de recepção e organizadores.
- Ação principal: testar inscrição demonstrativa e ver o check-in refletido no painel.
- Tipografia: Space Grotesk e DM Sans (Google Fonts, open-source SIL OFL; fallback sistema).
- Tokens: noite #101223, creme #F5F0E8, lilás #B9A3FF, pêssego #FF917C, lima #D9F782.
- Layout: hero 2 colunas desktop, uma coluna até 720px; cards 3/2/1; painel lateral desktop e sem sidebar no mobile.
- Imagem: ilustração SVG original embutida no arquivo. Sem uso de terceiros.
- Animação: microinteração de botões e rolagem suave; reduzida via `prefers-reduced-motion`.
- Acessibilidade: foco visível, botões com alvo confortável, labels em formulários, regiões live, estados de erro/vazio, fechamento modal Escape, navegação por teclado, responsividade.
- Não há cobrança, venda, e-mail, integração WhatsApp, acesso a backend, QR válido, login de produção, cadastro do prospect ou transferência de dados.

## Experiências implementadas
- `?view=public`: convite, informações históricas/locais com ressalva, atividades propostas, programação com filtros, FAQ e inscrição fictícia.
- `?view=team`: busca por nome/código, check-in e reversão, contadores.
- `?view=admin`: indicadores sintéticos, programação mutável (adicionar/remover), contagem e restauração da demonstração.
- Interligação usando `localStorage` (mesmo navegador); não há sincronização entre dispositivos.

## Critérios de aceite
- Visualizar todas as três views em 320/360/390/430/768/1024/1440.
- Inscrever participante fictício → check-in pelo código → painel refletir a mudança.
- Adicionar uma atividade → ela aparecer no filtro da página pública.
- Não expor dados reais, segredos, logotipos, pagamento e informação não comprovada como oficial.
- Testar tela pequena, foco, legibilidade, modal e reset.

## Deploy e responsabilização
Worker: `77-animefandango-comunidade-demo`.
Host: `on7.workers.dev`.
Projeto independente isolado: publicação via Cloudflare Workers API.
A confirmação externa da URL e o teste visual em navegadores reais devem ser tratados separadamente da confirmação de deploy no Cloudflare.

## Caminho para integração futura (não contratado)
Organizadora como tenant; evento/edição independentes; persistência e identidades somente após contratação, decisão de infraestrutura e validação de LGPD.
