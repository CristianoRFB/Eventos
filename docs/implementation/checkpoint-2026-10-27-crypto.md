# Checkpoint — F6 AES-GCM keyring / 27-10-2026

**Origem:** branch `chat/eventos77-f6-retention-20261027` no
`CristianoRFB/Eventos`, PR #1, base `codex/eventos77-full-system`.

## Último SHA de código validado por CI completo

- **SHA:** `182163085d482229e37506e0baffdd678eaf8b04`.
- **CI:** https://github.com/CristianoRFB/Eventos/actions/runs/40564327280 — **SUCCESS**
- Gates: migrations D1 local, npm ci, lint, typecheck, npm test
  (**131 unit tests**), build, integração API, E2E e docs:check.
- Nenhuma alteração em `main`, deploy, Cloudflare hospedada, segredos
  reais ou dados de clientes.

## Implementação

1. `app/infrastructure/submission-crypto.server.ts` aceita envelopes
   `v1` legados e `v2.<keyId>.<iv>.<ciphertext>`; AES-GCM autenticado
   por escopo/tenant, HKDF com contexto versionado.
2. `submissionSecrets(env)` carrega keyring somente via segredos opcionais
   `SUBMISSION_ENCRYPTION_KEYRING`, ID ativo e segredo legado v1.
   Configuração parcial/inválida falha fechada; em ambiente sem keyring
   a compatibilidade v1 permanece.
3. `forms-public.server.ts` e `forms.server.ts` utilizam o helper
   em gravações/leitura de respostas, perfis e solicitações complementares.
4. `submission-key-audit.server.ts` faz auditoria **read-only** de
   quantidades por versão/ID em D1 sem retornar PII, e
   `assertKeyCanRetire` bloqueia retirada com registros dependentes ou
   envelopes desconhecidos.
5. Testes: `submission-key-rotation.test.ts` cobre v1/v2,
   rotacionar ID, recuperar chave anterior e A×B; `submission-key-audit.test.ts`
   cobre inventário e proteção contra aposentadoria prematura.
6. [ADR-010](../adr/ADR-010-submission-encryption-rotation.md) registra
   estados e procedimentos. Não existem chaves reais no repositório.

## Status rigoroso

- **F6: PARTIAL**, apesar de rotation-safe reads serem CODE_COMPLETE e
  LOCAL_TESTED nesse SHA. Rotação REAL hospedada não configurada nem autorizada.
- Re-encriptação em massa de dados v1/v2 antigos NÃO IMPLEMENTADA. As
  colunas antigas têm triggers de redaction-only, portanto uma migration
  que burle essas restrições está proibida sem projeto seguro/revisado.
- Uso do `BETTER_AUTH_SECRET` no HMAC de recibos e idempotência requer
  decisão específica antes de rotacionar autenticação.
- Backups de chave, controles do cofre, recuperação de dados reais e
  cron/retention hospedado são EXTERNAL_GATES.
- Política global de mídia (retenção/avisos/tolerância/reconciliação)
  continua tendo lacunas para anexos privados.

## NEXT_CODE_STEP — SEM RECOMEÇAR F6

1. Projetar e implementar **re-encriptação controlada/recovery** sem
   violar triggers de imutabilidade, usando estado versionado ou
   migration transacional segura, com testes A×B de crash/retry.
   Não alterar dados reais nesta fase.
2. Fechar o lifecycle de mídia (orphan cleanup, aviso, tolerância,
   DRY_RUN e política de retenção aprovada).
3. Avançar F7: provider fake de Custom Hostnames com estado
   pending/verified/SSL active/revoke e testes fail-closed, antes de DNS real.
4. Rastrear restantes F0–F12 em `MASTER_EXECUTION_STATUS.md` e matrizes
   de features/telas; não inventar 95% nem prometer produção.
