# Fontes oficiais/técnicas consultadas — 14/10/2026

Fontes para arquitetura proposta, não comprovação de conta ativa. Datas indicam atualização vista ou data da consulta quando não fornecida. Preços e limites podem mudar.

| Assunto | Atualização vista | URL | Uso nesta proposta |
|---|---|---|---|
| Cloudflare React Router SSR Workers | 2026-06-19 | https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/ | Confirma React Router full stack SSR em Worker e C3; conferir versões ao implementar. |
| Cloudflare for SaaS - plans | 2026-08-14 | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/ | 100 hostnames incluídos Free/Pro/Business, adicionais USD 0.10; apex proxying add-on pago; não equivale a infra inteira grátis. |
| Enable Cloudflare for SaaS | 2026-04-29 | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/enable/ | Contas não Enterprise precisam inserir informação de pagamento para habilitar produto. |
| Cloudflare for SaaS - setup | 2026-06-19 | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/ | Fallback origin, ownership, SSL e DNS/hostname são gates distintos. |
| Cloudflare worker as origin | 2026-06-19 | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/ | Uma wildcard route na zona captura tráfego dos custom hostnames e chega a um Worker. |
| Custom hostname validation | 2026-06-19 | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/ | Propriedade de hostname e certificado usam tokens/estados diferentes. |
| Cloudflare for SaaS API | 2026-05-07 | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/common-api-calls/ | Ready exige status hostname active + ssl status active + DNS correto. |
| D1 pricing | 2026-04-21 | https://developers.cloudflare.com/d1/platform/pricing/ | Free 5 milhões rows read/dia, 100 mil writes/dia, 5GB armazenamento; planos e contas podem mudar. |
| D1 database API | 2026-10-14 consulta | https://developers.cloudflare.com/d1/worker-api/d1-database/ | D1 batch de statements preparado executa de modo transacional/rollback do batch; PoC de CAS antes do publish real. |
| D1 limits | 2026-10-14 consulta | https://developers.cloudflare.com/d1/platform/limits/ | Limites por base, single-threaded e desempenho dependente de query; checar antes de escala. |
| Workers Free limits | 2026-10-12 | https://developers.cloudflare.com/workers/platform/limits/ | Free até 100k requisições Worker por dia, CPU 10ms; pode não atender SSR real sem plano adequado. |
| R2 pricing | 2026-10-01 | https://developers.cloudflare.com/r2/pricing/ | Standard free 10GB-mês, 1M Class A, 10M Class B, sem egress; habilitação e cobrança variáveis. |
| Better Auth Drizzle adapter | 2026-10-14 consulta | https://better-auth.com/docs/adapters/drizzle | Compatível Drizzle/SQLite em conceito; Worker/D1 require PoC, não afirmada garantia. |
