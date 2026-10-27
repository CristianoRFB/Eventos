# Eventos 77 — cobertura pré-PC (evidência, não estimativa comercial)

**Fonte:** `docs/implementation/MASTER_EXECUTION_STATUS.md`, `FEATURE_STATES.md`,
`docs/implementation/FEATURE_TRACEABILITY.csv` e PR da branch de chat.
**Referência inicial:** 20/10/2026. **Atualização funcional:** 27/10/2026.
**Branch:** `chat/eventos77-f6-retention-20261027`.

## Métrica honesta

O catálogo contém **38 features**: 28 NOW, 7 NEXT, 3 DEFERRED.
No checkpoint de 20/10, as 28 NOW estavam assim:
**0 PASS integral, 25 PARTIAL, 3 NOT_STARTED** (branding tokens,
domain onboarding, monitoramento real de hostnames).
Por critério estrito de aceite *integral* por feature, a cobertura formal
CODE_COMPLETE comprovada continua **0/28 = 0%**; este indicador NÃO significa
que não exista implementação funcional. A maioria dos módulos possui código
parcial e jornadas locais validadas, mas falta aceite do escopo inteiro.
Não registrar meta de 95% como cumprida sem reclassificar cada feature com
arquivo, teste, SHA e documentação de aceite.

## Progresso desta branch — especificamente F6

| Bloco | Código | Prova/estado |
|---|---|---|
| Formulários versionados, recibo, consentimento | `app/services/forms*.server.ts`, migrations 0005 | Parcial já documentado pelo Codex em 20/10 |
| Purga de retenção tenant-scoped e redaction | `app/services/forms-retention.server.ts`, `workers/app.ts` | Testes unitários A/B; cron real desligado |
| Exportação CSV privada em páginas de 100 | `app/domain/export-csv.ts`, `forms.server.ts`, `api.server.ts`, `applications.tsx` | Inclui permissão `applications.review`, auditoria e proteção contra formula injection |
| Resposta de candidato a solicitação | `migrations/0006_applicant_replies.sql`, `forms-public.server.ts`, `forms.server.ts`, `application-receipt.tsx`, `applications.tsx` | Criptografia, revisão única, same-origin, redaction e testes A/B; **ainda F6 PARTIAL** |
| Anexos privados de candidaturas | `migrations/0007_application_attachments.sql`, `application-attachments.server.ts`, painel e recibo | Upload/download local R2, guard A×B, 3×2MiB, hash, MIME, fila de exclusão; CI `84629bd6` PASS, CLOUD pendente |
| Correção de SSR/hydration e CI cross-platform | `operations.tsx`, `scripts/docs-check.mjs` | CI de `19f8c224` aprovado; alterações posteriores exigem CI no próprio SHA |

## Pendências não encerradas

- F0–F5: concluir cada item ainda aberto do `MASTER_EXECUTION_STATUS.md`.
- F6: chave/rotação/recuperação, política de anexos com aviso/tolerância e retenção hospedada
  condicionada a aprovação e confirmação do fluxo completo nos testes mais recentes.
- F7: provider fake lifecycle completo, DNS/SSL/ownership reais somente com autorização.
- F8: mecanismo TEST_ONLY; preços, quotas e trial continuam SEM APROVAÇÃO.
- F9–F10: 51 telas NOW, estados, navegadores/4 viewports, backup/restore, negativas e performance.
- F11: cloud/staging/produção são EXTERNAL_GATES distintos.
- F12: reconciliar os 16 diagramas com runtime, screenshots reais, runbooks e evidências.

Não chamar `LOCAL_TESTED` de `STAGING_DEPLOYED` ou `PRODUCTION_VERIFIED`.
Este documento é índice de evidência incremental; o percentual só muda após
aceites formais por feature no arquivo canônico.
