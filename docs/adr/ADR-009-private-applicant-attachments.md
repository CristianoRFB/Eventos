# ADR-009 — Anexos privados de candidatura / F6

**Data:** 2026-10-27
**Estado:** Implementado e testado LOCALMENTE na branch de chat; produção NÃO AUTORIZADA.
**Código auditado:** `84629bd61342901024c328aa21c94c203f99bd74` — CI PASS:
https://github.com/CristianoRFB/Eventos/actions/runs/40553072100

## Escopo e classificação

Anexos são evidências privadas vinculadas ao fluxo de candidatura de expositor.
Classe local: `TEMP_WORKFLOW`, com finalidade e retenção herdadas da submissão
versionada. Isto NÃO é mídia de catálogo, banner/branding ou perfil público.
O usuário é orientado a não enviar RG, prontuário ou documentos regulados:
conteúdo `PROTECTED_REGULATED` requer projeto e retenção jurídica próprios.

Os parâmetros **operacionais de proteção contra abuso** são 3 imagens
PNG/JPEG/WebP por candidatura, até 2 MiB por imagem, sem exposição de PDF/HTML,
SVG ou URLs públicas. São limites técnicos desta superfície, NÃO preço,
quota de plano ou política comercial. A inspeção ocorre no servidor por
assinatura, estrutura e dimensões (não substitui antivírus ou decodificador
integral). SHA-256 dos bytes originais é registrado como metadado; futuras
políticas de verificação e reconstrução ficam abertas.

## Integridade / tenancy / RBAC

`application_attachments` em `migrations/0007_application_attachments.sql`
possui FK composta (organization,edition,application), índice de limpeza,
restrições de MIME/tamanho/hash, limite transacional de 3 e chave de objeto
EXATA `org/{organizationId}/applications/{applicationId}/{attachmentId}`.
Nenhum dos componentes é aceito da URL ou do browser sem escopo no banco.
O upload exige domínio público mapeado + recibo opaco válido, estado ativo,
prazo vigente e Origin mesmo site. Download exige host de painel autenticado,
`applications.review` no evento, candidato ativo e metadados R2 com
organizationId, applicationId e visibility=private. Downloads ficam auditados;
nome original nunca é reutilizado como caminho, cabeçalhos são
`Content-Disposition: attachment`, `nosniff` e `Cache-Control: no-store`.

R2 não provisionado => resposta 503, sem fallback que exponha arquivos.
Upload faz PUT privado seguido de gravação D1 condicionada. Se inserção D1
falhar, tenta compensar com DELETE do objeto. Falha da compensação é
registrada de forma genérica sem conteúdo sensível. A reconciliação completa
de órfãos R2 e cotas agregadas de storage está PENDENTE.

## Ciclo de vida

- `ready`: disponível exclusivamente ao revisor com candidatura ativa.
- `delete_pending`: marcação persistida quando há retirada ou expiração
  legítima. O nome original é imediatamente redigido e downloads são negados.
- `deleted`: após sucesso da API de exclusão do R2, grava `removed_at`.
  Repetição é idempotente, não ressuscita arquivos e suporta retry.
- Retirada tenta cleanup imediatamente; retenção marca objetos pendentes no
  job e processa fila via handler `scheduled`.
- Nenhum cron hospedado foi configurado; portabilidade e existência do bucket
  hospedado não foram verificadas. A remoção automática por expiração é
  portanto **INATIVA EM PRODUÇÃO**.

**Atenção à governança global de mídia:** `77_SAAS_GLOBAL_MEDIA_LIFECYCLE_STANDARD_v01`
é contrato de política, com avisos, tolerância, DRY_RUN, reconciliação e
proteções contra exclusão precoce. As submissões têm finalidade/retentionDays
informados no formulário; antes de habilitar scheduler real, decidir e
aprovar prazos, avisos, tolerância, tombstones, exceções legais,
orphan scanning e prova de restauração dos bytes. O código atual não comprova
equivalência integral à política global. A retirada voluntária é uma
solicitação explícita separada da expiração temporal.

## Evidências e limites

- `tests/integration/forms.spec.ts` prova upload, MIME forjado, tenant B,
  auditoria, download privado, 4º arquivo bloqueado e retirada.
- `tests/unit/forms-retention.test.ts` prova integridade A/B, redaction,
  tentativa de vínculo falsificado e exclusão R2 idempotente.
- `tests/unit/media.test.ts` mantém validação de bytes e dimensão.
- CI `84629bd6` PASS local (migração D1 sintética, integração, E2E,
  docs, build, typecheck, lint); não comprova Cloudflare hospedada.
- Ainda pendente: key rotation/recovery F6, integração com provedores reais
  mediante autorização, segurança de PDF/antivírus se necessário,
  reconciliation de objetos órfãos, política de aviso e restauração.
