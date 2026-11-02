# VOF 2027 — DEMO SUPREMA (não oficial)

Prévia: https://77-votuotakufest-piloto.on7.workers.dev/?view=home

## Rotas de demonstração
- /?view=home — landing e acervo fotográfico público do VOF no FLIV 2026.
- /?view=tickets — bilheteria de quatro etapas, Pix/cartão falsos, ingresso fictício e impressão/PDF pelo navegador.
- /?view=contests — inscrição cosplay/K-pop e protocolo.
- /?view=gallery — fotos de arquivo e filtros.
- /?view=admin — gestão com visão geral, bilheteria e CSV, check-in único, concursos e impressão de fichas, parceiros, mídia, e-mails e configuração.

> Toda informação e preço de 2027 não confirmados são explicitamente demonstrativos. Não aceitar dados pessoais reais nesta prévia. Não vende, não emite ingresso oficial, não conecta Mercado Pago/Firebase e não autentica administradores reais.

## Workflow seguro de e-mail
A Brevo foi configurada pelo proprietário com um remetente pessoal verificado, mas aviso de DKIM. O Worker possui BREVO_API_KEY como Secret. O envio de teste só fica liberado após adicionar Secret VOF_DEMO_EMAIL_TOKEN (mínimo 16 caracteres aleatórios) no mesmo Worker. Na área administrativa de e-mails o proprietário digita esse código; o backend valida e só envia um e-mail demonstrativo ao endereço pessoal autorizado; não aceita destinatário arbitrário. Não inserir o código no GitHub ou em prints. Se o remetente Gmail for rejeitado pela Brevo, autenticar domínio próprio. Chave Brevo anteriormente compartilhada em conversa: recomenda-se revogar/rotacionar antes de produção.

## Verificação
No repositório, `node demos/votuotakufest/suprema/smoke.mjs` após iniciar `python3 -m http.server 4179 --directory demos/votuotakufest`, com Playwright instalado. As assets são relativos (`./style.css`, `./app.js`) para permitir preview isolado e teste de localhost.

## Produção (não incluída)
Firebase Auth/Firestore + Rules, backend com dados bancários restritos, integração Mercado Pago com idempotência e webhooks assinados/verificados, QR de entrada assinado, e-mails com SPF/DKIM/DMARC, entrega de PDF e check-in atômico, controle de lotes/estorno, LGPD e teste de carga. Negociar escopo e autorização com Daniel antes de qualquer ativação.
