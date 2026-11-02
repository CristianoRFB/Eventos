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
A Brevo foi configurada pelo proprietário com um remetente pessoal verificado, mas aviso de DKIM. O Worker possui BREVO_API_KEY como Secret. O envio de teste só fica liberado após adicionar Secret VOF_DEMO_MAIL_TOKEN (mínimo 32 caracteres aleatórios) no mesmo Worker. Na área administrativa de e-mails o proprietário digita esse código; o backend valida e só envia um e-mail demonstrativo ao endereço pessoal autorizado; não aceita destinatário arbitrário. Não inserir o código no GitHub ou em prints. Se o remetente Gmail for rejeitado pela Brevo, autenticar domínio próprio. Chave Brevo anteriormente compartilhada em conversa: recomenda-se revogar/rotacionar antes de produção.

## Verificação
No repositório, `node demos/votuotakufest/suprema/smoke.mjs` após iniciar `python3 -m http.server 4179 --directory demos/votuotakufest`, com Playwright instalado. As assets são relativos (`./style.css`, `./app.js`) para permitir preview isolado e teste de localhost.

## Produção (não incluída)
Firebase Auth/Firestore + Rules, backend com dados bancários restritos, integração Mercado Pago com idempotência e webhooks assinados/verificados, QR de entrada assinado, e-mails com SPF/DKIM/DMARC, entrega de PDF e check-in atômico, controle de lotes/estorno, LGPD e teste de carga. Negociar escopo e autorização com Daniel antes de qualquer ativação.

## Publicação verificada em 02/11/2026
- Endereço atual: https://77-votuotakufest-piloto.on7.workers.dev/
- Worker Cloudflare publica os arquivos index.html, app.js, style.css a partir de SHA imutável do repositório. 
- Chave de e-mail armazenada apenas como segredo `BREVO_API_KEY`; remetente e destinatário de testes `VOF_DEMO_EMAIL_FROM` e `VOF_DEMO_EMAIL_TO` são variáveis de produção do Worker, ambos limitados ao endereço pessoal verificado do operador. 
- Sem `VOF_DEMO_MAIL_TOKEN` configurado, o envio real permanece desabilitado; o painel apresenta fila de e-mails simulados. Para habilitar o teste privado, adicionar **Secret** com 32+ caracteres aleatórios e inserir o valor temporariamente no campo do painel. Não incluir esse valor no GitHub, em prints ou na conversa. Nunca usar mensagens reais de clientes neste piloto.
- O primeiro workflow de smoke da versão Suprema encontrou e permitiu corrigir a navegação inicial; a execução corrigida passou: https://github.com/CristianoRFB/Eventos/actions/runs/41486997014
- Os preços de 2027, ingressos, dados administrativos e emails públicos são fictícios, e o site ainda não é oficial.


## Brevo automática, sem código de acesso (02/11/2026)
**Esta é uma demonstração NÃO OFICIAL. Não existem vendas nem ingressos válidos.**
- **Conta:** VotuOtakuFest (Brevo) com remetente `crisf.bueno10@gmail.com`, verificado, porém sem domínio autenticado.
- **Segurança:** Turnstile Managed `0x4AAAAAAFw9XFnxPXNSv-_3` (sitekey pública) com validação obrigatória no servidor (`VOF_TURNSTILE_SECRET`, Secret Cloudflare) e rate limiter `VOF_MAIL_LIMIT`. Não há código administrativo a digitar.
- **Bilheteria:** depois de selecionar ingressos, marcar o opt-in e simular o pagamento (Pix ou cartão, nenhum pagamento real), a demo chama `POST /api/test-email`. O Worker valida o desafio Turnstile e os dados, calcula preços **fictícios** do catálogo e gera um **PDF anexo** com página individual por acesso, nome fictício do participante, ID do pedido, valor e meio de pagamento simulados, data, códigos individuais e grandes avisos de ausência de validade.
- **Painel E-mails:** pode enviar um e-mail de exemplo com PDF ilustrativo a um destinatário real informado e consentido.
- **Concursos:** inscrição simulada pode emitir e-mail com ficha de concurso em PDF.
- **Entrega:** envio via API transacional da Brevo com `attachment: [{content: <PDF-base64>,name: 'ingressos-....pdf'}]`. O Worker não armazena os PDFs e não inclui chaves no repositório.
- **Abuso:** challenge Turnstile por envio, checagem de hostname e action, limite por IP, destinatário e região. O código do site só envia depois de ação explícita; Brevo não é um relay público sem proteção.
- **Verificações:** `worker-mail-smoke.mjs` cobre base64 PDF de várias páginas, valores e conteúdo da mensagem, ficha concurso, destinatários inválidos e proteção contra requisições externas ou robôs. O smoke de Playwright cobre telas e fluxos de compra e painel.
- **Não confundir com produção:** somente integrar pagamentos reais após Mercado Pago com webhook idempotente validado, base de pedidos persistente, antifraude e autenticação de backoffice. Atualizar autenticação do domínio do remetente (SPF/DKIM/DMARC) para melhor entrega.
- **Configurado:** Worker `77-votuotakufest-piloto` com secret `BREVO_API_KEY` herdado e `VOF_TURNSTILE_SECRET` cadastrado. Não editar manualmente nem revelar.
