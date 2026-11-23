# RFB HANDOFF — Eventos MAP / 23-11-2026

**Estado:** DEPLOYED_VERIFIED em demonstração isolada; lead NÃO contatado por este chat.

## Descoberta e premissas
- Perfil apresentado: @eventosmapoficial. Bio e prints destacam fanmeetings, encontros e apoio a renda/atividades da comunidade ARMY.
- Referência pública histórica: Entre na Roda (edição 19-09-2026, conforme K-Pop Brasil). Não divulgar esse evento passado como agenda futura.
- O Linktree público inclui formulários de parceria/voluntariado; não presumir que estejam abertos hoje, e não substituir canais já existentes.
- A proposta é uma hipótese de produto independente, sem aprovação da organização.

## Iteração RFB
1. Antes de editar, reconciliado Worker Cloudflare `77-eventos-map-v7-demo`, existente e com subdomínio habilitado.
2. GitHub repo `CristianoRFB/Eventos` auditado (base main: somente documentação conceitual); nenhuma Issue ou PR aberto encontrado antes do trabalho.
3. Baseline do Worker salvo na branch `rfb/eventos-map-v7-20261123`; código implementado na mesma branch sem merge.
4. Nova camada de valor: mural de oportunidades ilustrativas para criadores, expositores e parcerias, com CRUD e visibilidade administrados no navegador, reflexo na área pública e na prévia da home. Consulta manual via Instagram oficial, sem enviar dados ou simular inscrições.
5. Publicado por Cloudflare API, Worker existente, sem bindings novos nem plano pago habilitado.

## Rotas reais
- Landing comercial: https://77-eventos-map-v7-demo.on7.workers.dev/
- Público: https://77-eventos-map-v7-demo.on7.workers.dev/publico
- Gestão demo: https://77-eventos-map-v7-demo.on7.workers.dev/gestao

## Aceite e QA
- Gate V7: slogan exato, dois CTAs e duas tabelas ✅/❌, preço literal + ressalvas verificados.
- Testes local/mock, navegador Playwright e Worker real no GitHub Actions: **11/11 PASS**.
- Teste remoto cobriu fluxo de consulta, edição de chamada e propagação gestão → público → landing na mesma origem.
- Responsividade automática sem overflow: 320, 360, 390, 430, 768, 1024, 1440 px.
- Screenshots do site real: home 390, público 390, gestão 390 e home 1440, arquivados no artifact **14830971706** do run **45199973733**.
- CI: https://github.com/CristianoRFB/Eventos/actions/runs/45199973733
- Cloudflare: deployment `13780f8d-bc1e-4114-8315-6918ee6812ac`; versão `2d7aa1dc-16a5-44fd-a1da-f19996ad3ba2`.
- PR draft: https://github.com/CristianoRFB/Eventos/pull/24

## Segurança e limites
LocalStorage funciona no navegador da pessoa que testa, sem autenticação, banco compartilhado, inscrições, pagamentos ou conversão financeira. Fotos ilustrativas de Unsplash, sem reprodução de logo oficial. Demo não é canal oficial nem parceria aprovada. Nenhuma mensagem foi enviada ao prospecto.

## Próximo passo
Entregar link e mensagem personalizada após o lead responder “tudo bem?”. Manter status DEMO_PRONTA até envio confirmado; não inferir resposta. No caso de interesse real, abrir proposta específica e novo escopo de contratação com segurança, dados, marca, hospedagem e preço acordados.
