# Cross Guild / Cosparty — Demonstração conceitual 2026

## Proveniência e limite
- Fonte do lead: captura de Instagram @crossguildproducoes fornecida pelo usuário (03/11/2026).
- Referências públicas: Maringá Post (31/10/2026), Calendário Nerd e Linktree crossguildprod.
- Evento divulgado: Cosparty Halloween em 07/11/2026, a partir das 16h, Sociedade Rural de Maringá — Pavilhão Ovinomar.
- Venda de ingressos continua no canal oficial (Linktree → UTicket). Sem carrinho, cobrança, cadastro ou validação de QR real.
- Participantes e check-ins são sintéticos; a demo é independente, **sem uso de logotipo oficial nem alegação de parceria**.
- A demonstração é frontend servido por Worker e persiste **somente em localStorage do navegador**. Não há sincronização entre dispositivos.

## Diagnóstico / proposta de valor
O lead possui mais de um evento divulgado e já utiliza bilheteria terceirizada. Melhor oportunidade: site de evento com programação consultável e roteiro pessoal; operação de credenciamento otimizada; painel de produção para publicar alterações e acompanhar operações. Complementa o fornecedor de ingressos, não o substitui.

## DESIGN
- Personalidade: imersivo, autoral, expressivo.
- Público: visitantes de eventos geek/alternativos, equipe de credenciamento e organização.
- Tarefa principal: achar um momento da programação e adicioná-lo a um roteiro pessoal.
- Direção: composição editorial de cartaz de festival; tipografia Archivo Black + DM Sans; estética dark com marfim, laranja e verde-lima; arte abstrata CSS original.
- Tokens: canvas #0c0d0e, superfície #18191a, papel #f4f0e6, ink #141414, primary #d7ff62, accent #ff7045, hairline #353633.
- Layout: max-width 1190 px; grids adaptativos em 980/720/390 px; interações com botões de pelo menos 38–49 px e foco visível.
- Movimento: microinterações breves e preferência por movimento reduzido respeitada.
- Imagens: nenhuma imagem de terceiros ou do Instagram incorporada; círculos, padrões e ticket demonstrativo via CSS.
- Separação por visão: ?view=publico, ?view=equipe, ?view=gestao.
- Acessibilidade: idioma pt-BR, headings, nav, labels, foco, avisos live region, diálogos com Escape.

## Funcionalidade demonstrativa
- **Público:** programação, filtros, roteiro salvo, cópia de roteiro, FAQs, direção para ingresso **oficial**, comunicado fictício.
- **Equipe:** busca por nome/código, filtros por entrada pendente/concluída, simulação de credenciamento/reversão e contadores.
- **Gestão:** indicadores derivados dos próprios fixtures, adicionar/remover atrações, mudar comunicado e status demonstrativo, exportar CSV sintético, restauração.
- Fixture público baseada em programação divulgada; funcionalidades e qualquer edição feita no browser não constituem cadastro real.

## Testes/pendências
- Worker carregado na Cloudflare com endpoint /health validado externamente e URLs das visões alcançáveis.
- Sintaxe JS do app validada localmente no contexto de ferramenta JS. Não foi possível executar automação browser de cliques/responsividade porque o provedor de navegação de testes informou saldo insuficiente.
- Antes de oferta comercial: confirmar horários e termos com organizadora; testar no celular real; definir integração de ingressos com consentimento e segurança de papéis; implementar backend multi-tenant, autenticação e dados reais apenas após contratação.
