# Isolamento da organizadora — contrato obrigatório

**Chave de autorização interna:** `organizations.id` (UUID/ULID estável); slug e domínio NUNCA representam permissionamento. DomainResolver entrega `{organizationId, eventId?, editionId?, publicSnapshotId?, bindingVersion}` em contexto imutável. Authorization de sessão fica no host administrativo e não herda a autoridade da resolução pública.

## Regras de queries
- `organization_id` obrigatório em todas as entidades tenant-owned; `event_id` / `edition_id` devem validar ownership por FK composto quando possível.
- Repository `withOrgScope(context, operation)` força `WHERE organization_id = :ctx.organizationId`. Não permitir query genérica com id de recurso sem escopo.
- Uniques compostos: `(organization_id, event_slug)`, `(organization_id,event_id,edition_key)`, `(organization_id,user_id)` etc.
- R2 keys: `org/{orgId}/{public|private}/...` associadas a metadados D1 verificados no momento do GET. Evitar chaves inseridas livremente pelo browser.
- logs, jobs, idempotency keys, count limits e caches guardam org ID e hostname conforme natureza do recurso.

## Testes de não-isolamento
Owner A tentando edição B: 404 ou 403 sem vazamento; autor A tentando criar agenda com `editionId` B: falha; membro removido em A: sessão perde acesso; form de B não é editável por A; assinatura/plano não cria permissão administrativa; cache de B nunca aparece sob host A; URL R2 privada de B não fica acessível para A.

## Tenants de teste
`fictional-nova-con` e `fictional-otaku-club`: dados sintéticos em ambiente local/staging, com domínios reservados `.test`, branding diferente, owners e colaboradores separados. Não transformar empresas reais pesquisadas em fixtures de produção.
