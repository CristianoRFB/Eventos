# Brevo (VOF 2027) — configuração segura de e-mails

## Situação em 02/11/2026
- A chave `BREVO_API_KEY` está presente como **Secret** no Worker Cloudflare `77-votuotakufest-piloto`; seu valor não foi lido nem versionado.
- **Nenhum e-mail real está sendo enviado**. O Worker publicado ainda serve uma demo estática com e-mails simulados.
- Fonte do adaptador: `brevo-test-adapter.mjs`. **Não está implantada**: integrações e destinatário de teste ainda dependem de verificação da Brevo e de autenticação administrativa.
- O usuário expôs a chave uma vez no chat; aconselha-se revogação/rotação antes de ligar o envio.

## O que falta configurar na Brevo
1. Brevo → Settings → Senders, Domains, IPs → Senders → Add a sender.
2. Criar remetente de testes em endereço sob controle do responsável. Se necessário, confirmar o código enviado para ele.
3. Para entregabilidade de produção, autenticar um domínio próprio no Brevo (DKIM/DMARC); nunca usar domínio de Daniel sem autorização.
4. O frontend ainda não terá botão público para disparar emails reais.

## Parâmetros futuros no Cloudflare
| Nome | Tipo | Valor |
|---|---|---|
| `BREVO_API_KEY` | **Secret**, já presente | não mostrar, não commitar |
| `BREVO_SENDER_EMAIL` | Variable | remetente verificado, autorizado |
| `BREVO_TEST_RECIPIENT` | Variable | endereço de teste do operador |
| `BREVO_TEST_TOKEN` | **Secret** | token forte aleatório, mínimo 24 caracteres |
| `BREVO_SEND_ENABLED` | Variable | `false` por padrão; `true` somente para testes aprovados |

## Adaptador de teste
O arquivo `brevo-test-adapter.mjs` é **módulo isolado**, ainda não montado na rota pública. Ele oferece `GET /api/email/status` e `POST /api/email/test` apenas depois de ser incorporado ao Worker de backend com integração de rotas.

Restrições: autorização bearer não exposta ao navegador, destinatário único configurado em servidor, cenários fixos `ingresso` e `concurso`, assunto e corpo rotulados **TESTE DEMO**, sem dados reais de compra, sem e-mail arbitrário. O envio real exige `BREVO_SEND_ENABLED=true`.

NÃO montar esse endpoint em página administrativa sem autenticação real de servidor. Token não deve ficar no JavaScript público, localStorage ou frontend. O plano futuro usa Firebase Auth + verificação de identidade/cargo no Worker.

## Referências
- https://developers.brevo.com/reference/send-transac-email
- https://help.brevo.com/hc/pt/articles/208836149-Criar-um-novo-remetente-nome-e-e-mail-do-remetente
- https://developers.cloudflare.com/workers/configuration/secrets/

## Gate de aceite de testes
- Remetente e domínio confirmados, teste exclusivamente com e-mail de operador consentido, token privado, envio rastreável com Message ID, sem volume alto.
- Depois de validar, integrar ao backend com autenticação, filas, retries, logs minimizados e fluxo idempotente de emissão de ingresso; só então liberar envios transacionais reais.
