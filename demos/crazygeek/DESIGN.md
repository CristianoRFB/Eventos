# DESIGN — Crazy Geek Fest Mirassol (conceito não oficial)

## Fontes e limites — 02/11/2026
- Prints enviados pelo usuário: Instagram `@crazygeek_fest`; bio "Todos somos únicos, juntos somos Crazy Geek", nome "Crazy Geek Fest Mirassol", presença de destaques CG2024 e CG 2025 e álbum da edição Darkness 2025. Não assumir que toda publicação pertence à próxima edição.
- Linktree público `https://linktr.ee/crazygeekfest` anuncia "O maior evento Geek de Mirassol-SP" e lista galerias Drive/Google Fotos, grupo WhatsApp e Instagram. Consulta pública em 02/11/2026.
- Próxima edição, preço, bilheteria, patrocinadores, regulamentos, local e horários: **desconhecidos**. Todo horário mostrado é **DEMO_FICTICIO**.
- Branding é interpretação independente, não uso de logo oficial, fotografia não autorizada ou declaração de parceria.

## Tese e meta de UX
Um festival com múltiplos links e fotografias pode ganhar uma **entrada única que é mais que um agregador**: informação de edição, memória, participação e editor de programação visível no portal. Em 60–90 segundos: navegar no portal, criar participação fictícia, vê-la na equipe, adicionar atividade e voltar à agenda pública.

## Personalidade / mood
**Elétrico, comunitário, editorial.** Visual de cartaz geek/cultura pop com alto contraste e geometria gráfica original. Nada de imitar o Linktree com botões iguais nem transformar o festival em uma loja.

## Design tokens
- Canvas `#0c0b17`, superfície `#171624`, superfície elevada `#211e33`
- Ink `#fdf9f8`, muted `#c3bacf`, linha `rgba(251,242,255,.18)`
- CTA primário acid `#d8ff25` com texto `#171221`; destaque `#ff3dc1` e secundário `#42ccff`; purple `#7846e7`
- DM Sans 400/500/600/700/800 como corpo (fallback system-ui), Anton 400 para títulos (fallback Impact); Google Fonts para aperfeiçoamento não essencial
- Escala espaçamento 4/8/12/16/24/32/48/64, max-width 1230 px; 1 coluna mobile, até 3 colunas no desktop
- Raios controlados 4–8 px, sombra-offset de poster, grandes títulos condensados, links e cards com hierarquia diferente
- Imagens: ilustrações CSS originais e tipografia — sem reproduzir fotos/logo do Instagram; arquivos históricos via links oficiais.

## Fluxos concretos
1. **Festival:** proposta de valor, roteiros, programação **marcada como exemplo**, arquivo de edições que aponta para Instagram e Linktree reais.
2. **Participar:** simula a solicitação de artista/cosplayer/expositor com **somente dados fictícios** e e-mail obrigatório @example.test; validação nativa, mensagem de confirmação e vínculo à gestão.
3. **Organização DEMO:** pesquisa/filtra inscrições fictícias, altera seu status, cria/remove atividade de exemplo; portal reflete alterações na mesma sessão de navegador.

## Regras de interação, segurança e acessibilidade
- Estado em `sessionStorage` (se disponível); fallback em memória, nenhuma API, banco ou envio remoto. Não sincroniza dispositivos/abas.
- Sem login de admin **porque é apenas fixture local**; em produto real requer RBAC/tenant server-side.
- Toque 44+ px, foco visível, inputs com label e validação, aria-live nos estados, skip link, link oficial distinguível, [hidden], query `?view=` e history/popstate.
- Layout 320/360/390/430/768/1024/1440, sem overflow; reduced motion respeitado.
- Motion útil somente hover leve 180ms; zero background video e zero animações que ocultam informação.

## Gates de aceite
- Todos os links internos e externos existentes funcionam, nenhuma URL inventada.
- Programação editada aparece no Festival na mesma sessão.
- Inscrição fictícia aparece na gestão, filtro e status operam, reset funciona.
- Não há coleta real nem afirmação de próximas datas, parcerias ou ingressos.
- Screenshots devem vir do navegador executando a aplicação, nunca mockup fictício.
