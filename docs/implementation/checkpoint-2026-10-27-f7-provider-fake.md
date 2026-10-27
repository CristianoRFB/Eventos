# Checkpoint F7 — fake de domínios personalizados — 27/10/2026

Estado: implementação **parcial**, sem integração com provedor externo, DNS, certificados,
domínio real ou provisionamento na Cloudflare.

Base de trabalho: SHA `0ba526fa5f01def4beb015fa982df29156c0f099`
na branch `chat/eventos77-f6-retention-20261027`, que possuía CI completo aprovado
em [40578735942](https://github.com/CristianoRFB/Eventos/actions/runs/40578735942).
Branch isolada de execução: `chat/eventos77-f7-provider-fake-20261027`.
A branch `codex/eventos77-full-system` não foi alterada, nem houve merge na main.

## Entregue no código

- `app/domain/custom-hostname-provider.ts`: contrato `CustomHostnameProvider` e
  implementação falsa/volátil com provisionamento idempotente para mesma organizadora,
  normalização estrita de host, reivindicação global exclusiva e tombstone após release.
- Sinais de ownership, hostname ativo, SSL e DNS são gates independentes. Sem todos eles
  a ativação é negada. Suspensão/falha são terminais até retry explícito com provas resetadas.
- Falhas simuladas de provedor não alteram estado persistente nem vazam identidade do
  proprietário de outro domínio.
- `tests/unit/custom-hostname-provider.test.ts`: provas A/B, DNS/TLS pendentes, falhas,
  retry, reversão, exclusividade, tombstone e idempotência.

## Limite expresso

`FakeCustomHostnameProvider` mantém dados apenas em memória: **não é** Cloudflare for SaaS,
não registra hostname/DNS, não altera `domain_bindings` no D1, não hospeda cliente
e não prova ativação real. O método `observe` só existe para cenários sintéticos
e jamais deve ser exposto ao browser/admin sem autorização e auditoria.

## Aceite e próxima implementação

A confirmação de testes desta branch depende de GitHub Actions na PR. Não promover
F7 a PASS apenas porque o fake compila ou a suíte unitária passa.
Próximo código: reconciliador D1 tenant-aware para persistir estados/versionamento
com CAS, regras de reserva de host, idempotência e API com RBAC; cobertura de
transição/ownership/DNS/SSL com provider fake. Depois: adapter real e hostnames
somente mediante autorização de Cloudflare, orçamento e prova de ownership.

Sem cron, deploy, DNS real ou qualquer cobrança.
