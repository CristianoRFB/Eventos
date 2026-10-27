# Checkpoint do chat — Eventos 77 — 27/10/2026

**PR:** https://github.com/CristianoRFB/Eventos/pull/1
**Base segura:** `codex/eventos77-full-system@7c78add2c7abde8627f8255de856ed2a08811c09`
**Branch:** `chat/eventos77-f6-retention-20261027`
**Código de referência após implementação:** `3a0eadf26cd3b29306303f04529857b18470cbe5` (F6 code + ADR)
**CI desse código:** https://github.com/CristianoRFB/Eventos/actions/runs/40543979179 — `success`.
**HEAD mais recente:** conferir no remoto, pois documentação e workflow ganharam commits posteriores ao CI acima.

## Alterações reais nesta branch

1. Corrigido problema de hidratação SSR/React em `app/routes/operations.tsx`, que
   deixava o E2E desktop tentar preencher um campo ainda não montado.
2. Corrigido `docs:check` cross-platform: históricos CRLF preservam hash de
   origem mesmo quando Git normaliza checkout Linux para LF; nenhuma mudança
   semântica na fonte passa por essa tolerância.
3. Implementado `purgeExpiredSubmissions` com escopo organizadora, redaction
   de ciphertexts, perfis/consentimento, respostas complementares e mensagem
   de candidato, mantendo auditoria sem PII. `scheduled` existe mas
   **NÃO tem cron configurado**.
4. Exportação CSV de até 100 candidaturas por página, restrita à permissão
   `applications.review`, auditada e sem cache; dados expirados/retirados
   não são expostos. Proteção contra formula injection.
5. Candidato com recibo privado opaco pode responder a `needs_info`
   uma única vez por revisão. A resposta tem escopo org/edição,
   permanece AES-GCM privada e pode ser vista somente pelo staff autorizado.
   Revogação e retenção nulificam ciphertext. Migration aditiva `0006`
   sem D1 real.
6. Testes novos unitários e de API para A/B, idempotência, CSV, reply,
   origem forjada, dados secretos não públicos e retenção.
7. `docs/PRE_PC_COMPLETENESS.md` e `docs/PC_FINAL_TEST_SESSION.md`
   criados com escopo declarado e sem fingir produção.
8. CI configurado para cancelar runs antigas do PR, preservar orçamento
   de execução e acompanhar somente novo SHA.

## Gates (não confundir com produção)

F6 continua **PARTIAL**: anexos R2 privados não implementados; key rotation/recovery
integral e políticas legais/operacionais ainda precisam de aceite, assim como
cloud/cron reais. F0–F5, F7, F9, F10 e F12 têm outros requisitos parciais.
F8 preços/trial/quota não aprovados. F11 externo. 28 NOW / 7 NEXT / 3
DEFERRED preservados: nenhum total de 95% foi validado.

**NEXT_CODE_STEP:** F6 anexos privados com conteúdo validado por MIME/magic bytes,
binding R2 opcional, download autorizado, vínculo por tenant/candidatura,
retirada/retention purgando objetos derivados permitidos, testes A/B e URLs
sem exposição pública. Depois implementar a estratégia versionada de
rotação/recuperação AES (somente fixtures), fechar F6 e avançar F7 provider fake.
Não criar recurso cloud/cron nem ligar billing sem autorização.

## Continuação F6 — anexo privado e aceite local

Implementados `migrations/0007_application_attachments.sql`, tabela Drizzle,
serviço `application-attachments.server.ts`, rota pública de upload por recibo,
rota administrativa de download com RBAC por evento, UI de candidato e revisor,
redaction em retirada/expiração e limpeza física idempotente via R2
(apenas local). Limites técnicos: 3 imagens de até 2 MiB (PNG/JPEG/WebP),
metadados SHA-256 e validação de MIME/conteúdo. Corrigido o CHECK de chave
R2 no SQLite: igualdade exata em vez de LIKE dinâmico.

**CI de código:** SHA `84629bd61342901024c328aa21c94c203f99bd74`,
https://github.com/CristianoRFB/Eventos/actions/runs/40553072100 — `success`
(migração local, lint, tipos, unitários, integração, E2E, docs).
**Estado:** F6 continua PARTIAL. Nenhum cron, bucket hospedado, domínio ou
cliente real foi configurado. A política global de mídia exige verificação de
avisos, tolerância, reconciliação de órfãos e teste de backup/restauração de
bytes antes de cron de expiração. Ver `docs/adr/ADR-009-private-applicant-attachments.md`.

**NEXT_CODE_STEP:** rotação/recuperação de segredo AES-GCM com fixtures e
compatibilidade `v1`, seguida de lifecycle/domínios F7 fake e fechamento dos
aceites NOW existentes. Não reiniciar o trabalho de anexos.
