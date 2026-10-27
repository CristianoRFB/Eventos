# ADR-010 — Versionamento de chaves AES-GCM para candidaturas

Data: 2026-10-27
Status: IMPLEMENTADO NA BRANCH DE CHAT, sujeito a CI; NÃO ativado na Cloudflare hospedada.

## Contexto e decisão

Até este ponto, as respostas e perfis de candidatos eram cifrados como
`v1.<iv>.<ciphertext>` por AES-256-GCM com chave HKDF baseada no segredo
`BETTER_AUTH_SECRET`. O contexto do tenant e da submissão é autenticado como
AAD e a chave é derivada com salt `organizationId`. Este formato NÃO muda:
nenhuma mudança de schema nem rewrite de ciphertexts legados.

Novo envelope é `v2.<keyId>.<iv>.<ciphertext>`. Um identificador público e
não sensível `keyId` aponta para a chave secreta correspondente no keyring,
que deve ser entregue ao Worker via secret, jamais em `wrangler vars`.
A derivação HKDF usa info versionada e o AAD inclui `v2`, `keyId` e o
escopo autenticado. A leitura de um envelope `v2` sem sua chave exata FALHA
FECHADA, nunca tenta v1 nem outra chave.

Inputs opcionais do runtime:

- `SUBMISSION_ENCRYPTION_ACTIVE_KEY_ID`: id da chave usada em novas gravações
  (somente `[a-z][a-z0-9_-]{0,31}`, por exemplo `oct26`).
- `SUBMISSION_ENCRYPTION_KEYRING`: segredo JSON com mapa `id -> material`,
  32+ caracteres por material, no máximo 8 IDs. Tratar cada chave como
  credencial privada e manter cópias seguras fora do Git.
- `SUBMISSION_ENCRYPTION_V1_SECRET`: segredo LEGADO que preserva a leitura
  dos ciphertexts v1 se `BETTER_AUTH_SECRET` mudar. Sem ele, v1 usa a
  mesma raiz de antes, preservando comportamento atual.

Ativar apenas um dos dois primeiros bindings gera erro de configuração
sem degradar para v1. Sem ambos, a escrita mantém v1 para compatibilidade
de fixtures e ambientes legados. **Isso não autoriza usar v1 indefinidamente
em produção**: v2 deve ser um gate de segurança para dados reais.

## Procedimento de rotação sem parada (ainda não executado em cloud)

1. Antes da rotação, obter backup verificável do KEYRING e `V1_SECRET`
   em cofre separado, controles de acesso duplo e recuperação documentada.
2. Pré-deploy: colocar chave nova no keyring JUNTO das antigas (nunca
   substituí-las), mantendo ativo o ID anterior.
3. Confirmar capacidade de DESCRIPTOGRAFAR dados sintéticos com IDs antigos
   em staging; não usar PII de clientes como fixture.
4. Trocar somente `ACTIVE_KEY_ID` e publicar uma revisão de aplicação
   aprovada; novas escritas passam a `v2.newKeyId`.
5. Confirmar escrita/consulta/retirada em tenants A e B; verificar
   que leitura dos registros legados continua funcionando.
6. Se houver erro, rollback troca o ativo de volta sem apagar chaves;
   novos dados escritos no intervalo continuam legíveis pois a nova
   chave permanece no keyring.
7. Retirada DEFINITIVA de uma chave só é permitida quando nenhum
   ciphertext ainda precisar dela (submissions.answers/profile e
   application_replies.reply), após auditoria do banco e retenção.
   Re-encriptação em massa NÃO foi implementada, pois o banco v1
   possui triggers de redaction-only e requer migration transacional
   especial, explícita e revisada. Não desabilitar triggers para contornar.

## Recuperação

Se a chave antiga foi removida dos bindings, restaurá-la do cofre COM
O MESMO ID e conteúdo; a AES-GCM valida autenticidade sem reescrever o
ciphertext. Sem backup daquela chave, registros v2 associados são
criptograficamente irrecuperáveis — NÃO prometer recuperação via suporte.

O `BETTER_AUTH_SECRET` também alimenta autenticação e alguns digests de
recibo/idempotência. A rotação desse segredo NÃO está resolvida por este
ADR e deve ser tratada por ADR específico e testes para sessões e tokens.
Não apagar `SUBMISSION_ENCRYPTION_V1_SECRET` com ciphertexts v1 ativos.

## Proteções e escopo

- Testes de v1 antes/depois de v2, rotação, retirada indevida, recuperação,
  tampering de key ID, isolamento tenant A/B, AAD e configuração incompleta.
- As respostas da API nunca revelam IDs de chave utilizados pelo operador,
  valores de chave ou dados privados.
- Configuração de secrets, custos, staging, produção, cloud encryption,
  e migração histórica permanecem **EXTERNAL_GATE_PENDING**.
- Testes locais de keyring demonstram apenas comportamento do código;
  não comprovam existência de backups externos, processo de rotação ou
  uptime hospedado.

Próxima etapa de código: inventário tenant-scoped de versões/keyIds usados
em D1 para bloquear aposentadoria precoce, seguido de política de rewrap
auditável sem violar os gatilhos de redaction-only.
