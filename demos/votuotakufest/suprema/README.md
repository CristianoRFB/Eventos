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

## Revisão Android / integração Brevo (02/11/2026)
- Layout administrativo adaptado para telas móveis: 1 coluna real, toolbar empilhada, navegação administrativa horizontal rolável, KPIs inteiros na largura do viewport; tabelas roláveis só dentro do painel.
- QR Code SVG real, conteúdo literal `testetesteteste` (`demo-qr.svg`). Não é QR de Pix, nem copia e cola Pix válido.
- Ficha de custos: adicionar e excluir custos fictícios, totalizador de receita de teste, despesas e saldo; imprimir e exportar CSV.
- Fichas de parceiros: imprimir registros de lojas, artistas, patrocinadores e apoios fictícios.
- Galeria: imagens de arquivo pelo site oficial e reportagens públicas do VOF, com créditos de edição, links de origem e fallback quando fotos de Drive falharem. Autorizações de reprodução continuam pendentes.
- E-mails de demonstração: em **Gestão → E-mails**, digitar endereço real autorizado, código privado e consentimento; no fluxo de ingressos ou concurso, marcar consentimento e digitar código. O formulário chama `POST /api/test-email` com `X-VOF-Demo-Token`, contendo destinatário e tipo `demo-confirmation`, `ticket-demo` ou `contest-demo`. O servidor nunca envia e-mail sem o segredo e limita chamadas por localidade da Cloudflare; o conteúdo inclui avisos claros de DEMO e não representa comprovante oficial.
- A conta Brevo conectada possui remetente verificado `crisf.bueno10@gmail.com`, mas **não possui domínio autenticado** no momento da consulta. A aceitação na API não garante chegada à caixa de entrada. Verificar spam e autenticação de domínio antes de qualquer produção.
- A API key Brevo fica unicamente em `BREVO_API_KEY` (Cloudflare Secret); **nunca colocar no GitHub nem em HTML**. A versão testada não executa envio real sem `VOF_DEMO_EMAIL_TOKEN` cadastrado manualmente como Secret no Worker. O código não é armazenado no navegador.

### Como habilitar e-mail real com segurança
1. No Cloudflare Dashboard, abra o Worker **77-votuotakufest-piloto** → **Settings** → **Variables and Secrets**.
2. Em **Production**, adicione o Secret `VOF_DEMO_EMAIL_TOKEN` com valor aleatório de no mínimo 16 caracteres. Guarde-o num gerenciador de senhas e não compartilhe publicamente.
3. Clique **Deploy**. Sem esse segredo, o backend responderá erro 503 (envio desativado).
4. Abra o painel de E-mails, informe seu e-mail real, o código privado e confirme o consentimento; clique para testar. O limite está configurado para até cinco pedidos por 60 segundos por localidade Cloudflare e chave; o código continua obrigatório.
5. **Não testar com e-mails de terceiros sem autorização.** Não usar produção enquanto a conta do remetente e dados do evento não forem validados.

**Nota técnica:** o antigo formato `@example.test` ainda é aceito para percursos puramente simulados. Agora um endereço real também é aceito, mas somente é enviado à Brevo com consentimento e código de teste. Nenhum pagamento ou inscrição real será ativado.
