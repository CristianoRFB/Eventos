# ADR-011 — Recriptografia controlada e retomável sem alterar a origem

Data: 2026-10-27
Estado: **CODE_COMPLETE + LOCAL_CI_PASS** no commit
`08ae62a11d56bda1bc3ab6101ec0af42b7551f3a`:
https://github.com/CristianoRFB/Eventos/actions/runs/40577852115
**Não habilitado no Cloudflare hospedado, sem dados pessoais reais.**

## Decisão

Os ciphertexts de `form_submissions` e `application_replies` são
protegidos pelos triggers `submissions_redaction_only` e
`application_reply_redaction_only` e não podem ser reescritos. **Não
desabilitamos, alteramos ou burlamos esses triggers.**

A migração aditiva `0008_private_cipher_rewraps.sql` cria um registro
privado escopado por `organization_id`, `source_kind`,
`source_id` e `field_name`:
- `source_hash`: SHA-256 do **ciphertext original**, não de dados pessoais;
- `rewrapped_ciphertext`: envelope `v2.<keyId>.<iv>.<cipher>`;
- timestamps de criação/atualização.
Não existe plaintext no banco ou nos logs de migração.

A atualização é uma gravação condicional com comparação do valor original
e CAS na versão de sombra anterior. Conflitos geram contador, sem sobrescrever
alterações concorrentes. As duas direções de privacidade são protegidas
por triggers: retirada/expiração remove a sombra da submissão e suas
respostas; nulificação do ciphertext de resposta remove a sombra daquela
resposta. A migration preserva o esquema original e os demais dados.

## Execução e segurança

`rewrapPrivateCiphers(env, organizationId, options)` é um serviço INTERNO
trusted-server, não uma rota HTTP, job público ou trigger de cron.
- `apply` omitido/false => **DRY_RUN** por padrão.
- `limit` padrão 20, máximo 20 por chamada para limitar uso de CPU/DB.
- `organizationId` explícito; nenhum lote atravessa tenants.
- Requer configuração de chave ativa v2 e keyring; falta => STOP.
- Busca registros ativos ainda dentro da retenção; revisa origem na
  inserção, preserva eventual sombra anterior em conflito e suporta
  repetição por lote após interrupção.
- Retorno: `{examined,rewrapped,conflicts,dryRun}`; sem PII, secrets,
  ciphertexts ou recibos.
- Depois de rewrap, leituras autenticadas e autorizadas de candidaturas,
  exportação CSV, perfis com consentimento e respostas do candidato
  preferem `effectiveSubmissionCipher` ao original. A função revalida
  estado/escopo antes da leitura; não usa a sombra quando os originais
  forem retirados ou expirados.

## Aviso crítico sobre aposentadoria de chaves

**A sombra não elimina o ciphertext original.** Portanto o v1 e a chave
antiga continuam necessários para rollback e recovery até a retenção
redigir fisicamente o original. O inventário
`auditSubmissionKeyUsage` foi alterado para contar tanto os
originais quanto as sombras, impedindo a retirada prematura da chave
antiga OU de uma nova ainda usada em sombra.

Não afirmar migração irreversível, destruição de chave, sucesso hospedado
ou zero downtime de produção com base nestes testes locais.

## Evidências

- `tests/unit/submission-rewrap.test.ts`: DRY_RUN, 3 superfícies,
  v1/v2, lote parcial, retomada, rotação v2 para nova chave, A×B,
  consentimento retirado, rollback da sombra e manutenção do original.
- `tests/unit/submission-key-audit.test.ts`: contagem de originais e
  sombras, falha fechada contra aposentadoria.
- CI no SHA mencionado: migrations, unit, integração, E2E, docs, build,
  lint e typecheck aprovados.
- Nenhum segredo, Worker remoto, D1 hospedado ou organização real foi
  modificado.

## Bloqueios restantes e roadmap

1. Aprovar operação de rewrap em ambiente hospedado, incluindo secret vault,
   backup D1, rollback, monitoramento de conflitos, política de suporte,
   orçamento e rotina interna autenticada/limitada. **Sem aprovação,
   serviço permanece somente disponível ao código e testes.**
2. Para realmente aposentar chaves legadas antes da retenção,
   será necessário um desenho separado de migração irreversível
   **preservando consentimento e garantindo atomicidade e recovery**;
   este ADR intencionalmente não o simula.
3. Resolver segredo do Better Auth para digest/idempotência;
   a separação do keyring não resolve rotação do segredo de sessão.
4. Prosseguir para F7 provider fake de Custom Hostnames e controles
   globais de mídia (DRY_RUN, tolerância e orphan scanning).
