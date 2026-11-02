# DESIGN — Anime Summer RP 2027 (proposta não oficial)

## Fontes, premissas e status
- 2026-11-02: screenshot fornecido do Instagram @animesummer.rp e da central linktr.ee/animesummer.rp. A descrição do perfil informa 4ª edição em 2027, em São José do Rio Preto/SP.
- Fonte secundária para a edição anterior: https://calendarionerd.com.br/evento/anime-summer-2026/ — 19/04/2026, Clube do Lago. **Não reutilizar essa data/local como 2027.**
- No print existem áreas de ingressos, caravanas, concursos cosplay e K-pop, imprensa, regulamentos, contatos e localização; não foi possível confirmar abertura de inscrições para 2027.
- A marca, imagens e o logo do evento não são copiados: apenas referência ao nome no contexto de uma prévia comercial não oficial. A direção visual é original e hipotética.
- Valores, lotes, data, local, convidados e cronograma 2027: **DESCONHECIDOS**. Os horários da agenda são **DEMO_FICTICIO**.

## 3 palavras e objetivo
Ensolarado, irreverente, comunitário. Público: visitantes jovens, cosplayers, dançarinos K-pop, caravanas, imprensa, organizadores. Tarefa principal: entrar na categoria de participação → enviar exemplo → equipe ver na mesma sessão → alterar status. Extra: organização editar uma programação ilustrativa e visitante ver refletida.

## Tokens
- Canvas #faf8ee; surface #fffdf5; ink #132d3a; stage #102c3a
- Primary/impact #ee428b; secondary #72e0d6; action #ffe342
- Muted #52656b; hairline #dbe3de; error #a52c42; success #14665c
- Tipografia: DM Sans e Space Grotesk (Google Fonts, OFL), com fallback Arial/system. Larguras 320/360/390/430/768/1024/1440.
- Espaços 4/8/12/16/24/32/48/64 e variações coerentes. Cards de festival deliberadamente quadrados com bordas; inputs/botões moderadamente arredondados. Sem gradiente genérico.
- Motion restrito a deslocamento de 2–6 px em hover, opcional; reduced-motion desliga.

## Composição e fluxos
1. Portal: banner de não oficialidade → hero editorial de verão com arte CSS → CTA → quatro categorias → agenda ilustrativa → canal oficial.
2. Inscrições: seletor de quatro participações → formulário exemplo com validação e e-mail obrigatório @example.test → recibo fictício → painel.
3. Gestão: contadores exclusivamente de fixtures, busca e filtro, alteração de status, restauração confirmada e editor de programação. Agenda sincroniza com portal **na mesma aba**.

## Princípios
- Não existem inscrições, pagamento, métricas reais, envio de e-mail ou WhatsApp, backend ou autenticação.
- Não inserir dados pessoais reais; aceitar apenas @example.test. Estado em sessionStorage para demonstração, nunca apresentado como cadastro válido.
- O painel admin é apenas playground público de demonstração sem dados reais, não uma rota protegida de gestão.
- Não duplicar links oficiais nem suprimir os canais existentes. Não afirmar parceria/contrato.
- Sem dependência de mídia de terceiros; arte construída por CSS com símbolos originais.

## Global/vertical/local
- GLOBAL: aviso demo, acessibilidade, estado/foco, navegação, ausência de segredos, saída limpa.
- VERTICAL Eventos: inscrições por modalidade, triagem de candidaturas, agenda pública/editável.
- LOCAL: vocabulário e categorias Anime Summer; paleta pop verão, referência ao anúncio 2027.
- Integração futura exige tenant organizadora, evento/edição separados, RBAC real, esquema versionado, consentimento LGPD, política de retenção, moderação e integração oficial.

## Critérios de aceite
- Sem overflow de 320 a 1440 px; navegação por toque/teclado, reduzido movimento.
- Cliente seleciona categoria, valida formulário fictício, vê recibo; admin recebe entrada na mesma aba.
- Filtro/status/reset funcionam; programação se atualiza e reflete na página pública.
- Sem rastreamento, banco, segredos, cobrança, mensagens, contatos ou dados reais.
- Link público, quando houver, exige publicação segura e verificação manual real; GitHub não equivale a preview.
