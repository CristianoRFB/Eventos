# Piloto VOF 2027 — alinhamento comercial de 02/11/2026

## Contexto
Daniel, responsável pelo Votu Otaku Fest, confirmou que deseja testar uma proposta de site/sistema novo. O pedido validado em conversa: inscrições para concurso cosplay e K-pop, fichas prontas para imprimir, divulgação de patrocinadores e lojas, fotos organizadas no site, e manutenção ou substituição futura de bilheteria Wix (Mercado Pago Pix/cartão + PDF + e-mail automático).

**Estado do prospect:** interessado em testar, NÃO contratado. Preço discutido não constitui aceite, não cobrar.

## Prévia publicada
- URL de demonstração: https://77-votuotakufest-piloto.on7.workers.dev/
- Público: `?tab=publico` — conteúdo, patrocinadores fictícios, galeria conceitual e compra simulada.
- Concursos: `?tab=concurso` — formulário fictício de cosplay/K-pop, dados mínimos.
- Gestão: `?tab=gestao` — registros da sessão, impressão de fichas pelo navegador, reset.
- Publicação: Worker independente `77-votuotakufest-piloto` (não toca o worker antigo `77-votuotakufest-conceito`), código imutável do commit `5585319db9d314fca07b0f9ebff2ede7847062e4`, no GitHub `CristianoRFB/Eventos`.
- Código: `demos/votuotakufest/piloto.html` (HTML/CSS/JS inline, sem dependências).

## O que realmente funciona
- Escolha do tipo de ingresso, formulário com `@example.test`, registro de pedido **SIMULADO** via sessionStorage e comprovante DEMO imprimível.
- Inscrição cosplay/K-pop com nome/apresentação/quantidade fictícios e `@example.test`; registro na sessão.
- Painel exibindo registros, métricas (apenas valores fictícios), fichas para impressão por modalidade e reset.
- Estrutura visual responsiva; links para três visões em uma página.

## O que NÃO funciona nesta prévia
- Qualquer cobrança real Pix/cartão, confirmação Webhook, cartão, conta Mercado Pago, ingresso ou QR Code válido, e-mail, backup, persistência real, login admin, integração Firebase, galeria com upload, cadastro dinâmico de patrocinadores.
- Os preços de ingressos são apenas ilustrativos, não preços 2027 confirmados; os parceiros e capas são inventados.
- Dados guardados apenas na aba/sessão do navegador. Nunca usar nomes/e-mails reais.
- Impressão pelo navegador (inclusive salvar em PDF), sem geração de PDF no backend.

## Gates para futuro contratado
- Formalizar escopo/aceite/pagamentos/domínio/titularidade/licenças/imagens/LGPD antes de produção.
- Criar ambientes testes e produção isolados; Firestore Auth/regras, backend Worker com credenciais secretas, idempotência webhook MP, reconciliação e reembolsos, antifraude, rate limit, geração de QR Code **válido** e check-in atômico.
- Validar DNS do domínio de titularidade do evento; não mexer em Wix/domínio sem autorização.
- Configurar entrega por email transacional se opção contratada, bounce, limite e reenvio.
- Segurança e pico de acessos; backup; permissões; testes mobile/desktop reais.
- Revisar regulamento de concursos, regras para menores de idade e política de privacidade.

## QA
- GitHub: arquivo criado sem tocar main; JS inline parseado por `new Function` sem erro, todos os IDs de campos e painéis presentes.
- Cloudflare Worker publicado e as três URLs respondem com HTML e título esperado via extração remota.
- Teste interativo de ponta a ponta (navegador, formulário e impressão) ainda **não concluído**: serviço externo de automação bloqueou por saldo insuficiente. Realizar manualmente antes de apresentar como totalmente validado.
