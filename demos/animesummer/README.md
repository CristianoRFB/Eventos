# Anime Summer RP — conceito de demonstração, 2027

**Estado:** PROTÓTIPO INTERATIVO NÃO OFICIAL. Não representa o organizador, não vende ingresso nem recebe inscrições reais.

## Evidências e limitações
- Instagram fornecido: https://www.instagram.com/animesummer.rp/
- Link-in-bio fornecido: https://linktr.ee/animesummer.rp
- Edição 2026 em 19/04/2026 documentada em https://calendarionerd.com.br/evento/anime-summer-2026/
- Print indica 4ª edição em 2027. Não há data/local, ingresso/preço/lote ou agenda 2027 verificados.
- Direção visual e desenhos foram criados como uma proposta independente; nenhum logo, post ou foto oficial foi incorporado.

## Visões
- Portal público: /?view=publico
- Inscrições exemplo: /?view=inscricoes
- Organização DEMO: /?view=gestao

Servidor estático basta: python3 -m http.server 4184 --directory demos/animesummer.

## Mostrar em 90 segundos
1. Abrir portal e destacar banner de DEMO, atrações genéricas e links oficiais.
2. Escolher cosplay (ou caravana/K-pop/imprensa) e preencher **somente com dados inventados** e e-mail teste@example.test.
3. Enviar e mostrar recibo fictício. Não há transmissão de cadastro.
4. Abrir Gestão, filtrar pelo exemplo recém-criado e mudar seu status.
5. Adicionar uma atividade fictícia com horário e exibi-la no portal.
6. Restaurar dados demonstrativos com confirmação.

## Segurança e precisão
- Estado local de uma aba: sessionStorage. Não compartilha inscrições entre pessoas/dispositivos.
- Operação pública e sem senha é exclusivamente a simulação, sem backend nem dados reais.
- O campo de e-mail bloqueia domínios reais; não transmitir mensagens, não validar ingressos, não processar pagamentos.
- Textos dinâmicos entram por textContent, evitando interpretação HTML.
- Sem imagens oficiais. Google Fonts é serviço externo usado apenas para tipografia, com fallback sem fonte.
- Integração futura à vertical Eventos 77 deve preservar tenancy, RBAC, D1, log e consentimento reais.
- CI de PR valida em browser, mas aprovação comercial requer conferência de URL publicável.
