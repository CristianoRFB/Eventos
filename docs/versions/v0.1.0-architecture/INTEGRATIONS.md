# Integrações propostas

| Integração | Estado projetado | Observação |
|---|---|---|
| Links para Sympla/Articket/ingressos existentes | NOW | CTA externo com `rel="noopener"`, domínio permitido, aviso de redirecionamento; SEM API de cobrança |
| Cloudflare for SaaS custom hostname | F7/F11 | adapter + reconciliação, credenciais e host reais apenas com autorização |
| Cloudflare R2 | NOW | imagens públicas e privadas separadas por owner/política; URL assinada quando aplicável |
| Email transacional de convite/status | NEXT ou mínimo necessário ao onboarding | provider plugável; sem mensagem externa em teste por padrão |
| Turnstile / proteção antiabuso | NOW em formulários públicos | modo teste/local e external key por ambiente |
| Cosmaker OS e Caravana | DEFERRED | link/proposta de cross-sell; sem banco compartilhado |
| Google Sheets import de leads | DEFERRED/administrativo | nunca transformar lead em tenant público sem autorização |
| Bilheteria API, fiscal, WhatsApp, SMS | DEFERRED | custo, contrato e credenciais necessários |

Adapters têm interfaces versionadas, idempotência nas operações externas e storage de configuração restrita. Falha de integração opcional não compromete site SSR público.
