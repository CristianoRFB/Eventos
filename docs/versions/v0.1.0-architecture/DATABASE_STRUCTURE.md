# Estrutura D1 proposta

**Escolha recomendada:** uma D1 por ambiente, com tabelas compartilhadas e `organization_id` em todos os recursos tenant-owned; migrations geradas pelo Drizzle, IDs estáveis, composite FK/unique, joins sempre no escopo da organização. Consulta pública usa `domain_bindings -> publication_snapshot`, sem acesso às tabelas privadas. D1 não fornece `ROW LEVEL SECURITY` de PostgreSQL; o backend é o guardião das queries e requer testes A×B com IDs adversariais.

## Conjuntos
Global: `users`, `sessions` (podem ser adapter-managed), `organizations`, `plan_definitions`, `domains` (hostname único). Por organização: memberships, events/editions, CMS, agenda, expositores, uploads, logs, commercial state, counters e integrações.

## D1/Drizzle checklist para implementação
1. Drizzle schema tipado e migrações SQL imutáveis; não criar tabela via dashboard manual. 2. Testes de composite FK e constraint de domínio. 3. Índices nos filtros de agenda, slug, membership e publicações. 4. Revisão de tamanho total e número de queries em endpoint público. 5. Backup/recovery seguro antes de migrations; time travel não substitui teste de restauração. 6. Nenhuma senha/token Cloudflare no banco como texto público. 7. `updated_at` transacional e CAS optimistic lock quando aplicável. 8. Separar storage R2 metadata dos objetos binários.

Ver `DATA_MODEL.md` e `DATA_DICTIONARY.csv` para as 37 entidades e suas relações. Os campos são proposta, não banco provisionado.

## Garantia de concorrência no D1 (decisão de implementação)
A proposta usa `UPDATE ... WHERE revision = ?` e inspeciona `changes === 1` para compare-and-swap do ponteiro, combinado com prepared statements em `D1Database.batch()` para operações correlatas. A documentação Cloudflare descreve batch como transação com rollback em caso de falha; **não presumir suporte irrestrito a uma transação interativa entre round-trips**. Codex deve provar atomicidade, casos concorrentes e contadores em testes reais de D1 antes de marcar publish/quotas PASS. Se o fluxo exigir garantia superior, propor alternativa (ex.: Durable Object coordenador) por ADR, sem acionar produto pago sem aprovação. Fonte: https://developers.cloudflare.com/d1/worker-api/d1-database/ .
