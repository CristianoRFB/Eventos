# Eventos 77 — checkpoint de implementação rewrap F6

Data: 27/10/2026
Branch: `chat/eventos77-f6-retention-20261027`
PR: https://github.com/CristianoRFB/Eventos/pull/1
**Último SHA de código verificado pelo CI completo:**
`08ae62a11d56bda1bc3ab6101ec0af42b7551f3a`
CI: https://github.com/CristianoRFB/Eventos/actions/runs/40577852115 — `success`.

## Código entregue nesta rodada

- Migration aditiva `0008_private_cipher_rewraps.sql`:
  sobreposição cifrada tenant-scoped, CAS, guarda de estado ativo,
  exclusão automática após revogação/expiração ou nulificação das respostas.
- Schema Drizzle para sobreposição, sem alterar históricos.
- `app/services/submission-rewrap.server.ts`: rewrap v1/v2 em lotes
  de até 20, modo DRY_RUN por padrão, explicit organizationId, retomada
  e contagem de conflitos sem expor dados pessoais.
- Leitura das sobreposições integrada em `forms.server.ts`:
  tela privada do revisor, CSV auditado, perfil/consentimento e respostas
  do candidato; acesso normal RBAC preservado.
- Guard adicional de leitura contra fontes que deixaram de estar ativas.
- Inventário de dependências de chaves inclui os registros-base E
  sobreposições. Key retirement só passa quando ambos deixam de precisar
  daquela chave.
- Testes `submission-rewrap.test.ts` com banco SQLite real e aplicação
  da migration real: DRY_RUN, rewrap, lotes interrompidos, retomada,
  rollback sem mutação da origem, A×B e retirada.
- Correção do fixture anterior de audit após introduzir nova tabela.
- Decisão canônica [ADR-011](../adr/ADR-011-private-cipher-rewrap.md).

## Qualidade

O CI do SHA informado passou: migrations locais, lint, typecheck,
testes unitários, build, integração API, E2E e docs:check.
NÃO equivale a cloud staging/produção, nem a verificação de backup
operacional ou do secret vault. Nenhum segredo real foi enviado ao GitHub.

## Estado e próximos passos, sem retrabalho

**F6 ainda PARTIAL**, porque não existe execução operacional aprovada do
rewrap em cloud e porque os ciphertexts originais preservados ainda
dependem da chave antiga. É proibido apagar a chave antiga só porque
uma sombra v2 passou a ser usada. Não desligar triggers originais.
Rotação do segredo Better Auth/idempotência/recibos continua pendente.

**NEXT_IMPLEMENTABLE:** avançar F7 provider fake (lifecycle domínio:
ownership -> TLS -> DNS -> active/suspend/release), guardas de idempotência
e isolamento tenant A/B. Manter Cloudflare for SaaS e DNS reais
EXTERNAL_GATE_PENDING. Depois reconciliar política global de retenção
de mídia (avisos, tolerância, orphan scanning, dry-run), fechar outras
features NOW e melhorar UX/homologação. Nenhuma alegação de 95% concluído.
