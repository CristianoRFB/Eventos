# Modelo de dados relacional proposto — Eventos 77

**Design proposto, não D1 real.** Organização é boundary; evento ≠ edição; domínio é vínculo verificado para destino.

## Inventário das tabelas, chaves e invariantes

| Entidade | Escopo | Campos principais | Invariantes |
|---|---|---|---|
| `users` | global | `id`, `email`, `display_name`, `status`, `created_at` | unique email normalized; auth adapter may own schema |
| `sessions` | global | `id`, `user_id`, `expires_at`, `revoked_at`, `created_at` | opaque session hash; adapter-owned |
| `organizations` | global | `id`, `slug`, `name`, `status`, `timezone`, `created_at`, `updated_at` | unique slug; tenant root |
| `memberships` | org | `id`, `organization_id`, `user_id`, `role`, `status`, `created_at`, `updated_at` | unique(organization_id,user_id); no last-owner deletion |
| `invitations` | org | `id`, `organization_id`, `email_hash`, `role`, `token_hash`, `expires_at`, `accepted_at` | unique use token, cannot self promote |
| `event_assignments` | org | `id`, `organization_id`, `event_id`, `user_id`, `permissions_json` | scoped to event and owner org |
| `brand_profiles` | org | `id`, `organization_id`, `name`, `tokens_json`, `logo_asset_id`, `rev` | only allowed CSS tokens |
| `events` | org | `id`, `organization_id`, `slug`, `name`, `brand_profile_id`, `status` | unique(organization_id,slug) |
| `editions` | org | `id`, `organization_id`, `event_id`, `edition_key`, `city`, `time_zone`, `start_at`, `end_at`, `status`, `publish_revision` | unique(org,event,edition_key); enforce owner/event FK |
| `venues` | org | `id`, `organization_id`, `edition_id`, `name`, `address_public`, `geodata_json` | public address only and validation |
| `stages` | org | `id`, `organization_id`, `edition_id`, `venue_id`, `label`, `capacity`, `status` | unique stage within edition |
| `program_items` | org | `id`, `organization_id`, `edition_id`, `stage_id`, `guest_id`, `title`, `starts_at`, `ends_at`, `status` | interval conflict checks in transaction |
| `guests` | org | `id`, `organization_id`, `display_name`, `biography`, `photo_asset_id`, `consent_state` | profile public only with permission |
| `participations` | org | `id`, `organization_id`, `edition_id`, `guest_id`, `role`, `status` | unique guest x edition role as justified |
| `exhibitors` | org | `id`, `organization_id`, `name`, `profile`, `public_consent_state` | no publication without consent |
| `exhibitor_applications` | org | `id`, `organization_id`, `edition_id`, `form_id`, `submitter_contact_enc`, `status`, `reviewer_id`, `created_at` | minimize PII + state transitions |
| `form_definitions` | org | `id`, `organization_id`, `edition_id`, `name`, `status`, `version` | single active version policy |
| `form_fields` | org | `id`, `organization_id`, `form_id`, `field_key`, `kind`, `required`, `validation_json` | schema locked per published form version |
| `form_submissions` | org | `id`, `organization_id`, `form_id`, `application_id`, `answers_json`, `receipt_hash`, `created_at` | receipt token hashed, private |
| `sponsors` | org | `id`, `organization_id`, `name`, `logo_asset_id`, `website`, `placement`, `contract_state` | website host allow list / safe URL |
| `edition_sponsors` | org | `id`, `organization_id`, `edition_id`, `sponsor_id`, `sort_order`, `visibility` | public placement only if published |
| `faqs` | org | `id`, `organization_id`, `edition_id`, `question`, `answer`, `sort_order`, `status` | structured sanitized content |
| `announcements` | org | `id`, `organization_id`, `edition_id`, `slug`, `title`, `body_json`, `status` | publish through snapshot |
| `content_drafts` | org | `id`, `organization_id`, `edition_id`, `revision`, `content_json`, `created_by`, `created_at` | immutable revision insert, no direct public |
| `publications` | org | `id`, `organization_id`, `edition_id`, `revision`, `content_snapshot_json`, `created_by`, `published_at` | immutable, publish pointer transaction |
| `edition_publication_pointers` | org | `organization_id`, `edition_id`, `publication_id`, `updated_at` | unique(org,edition); atomic swap |
| `domains` | global-owned | `id`, `hostname`, `organization_id`, `destination_type`, `destination_id`, `status`, `provider_id`, `hostname_status`, `ssl_status`, `verified_at` | unique(hostname); never activate until all checks pass |
| `domain_audit` | org | `id`, `domain_id`, `organization_id`, `action`, `actor_id`, `created_at`, `metadata_json` | token free event log |
| `media_assets` | org | `id`, `organization_id`, `owner_type`, `owner_id`, `visibility`, `r2_key`, `mime`, `size`, `license_status`, `created_at` | R2 private/public namespace; no public raw upload |
| `tenant_commercial_states` | org | `organization_id`, `plan_id`, `subscription_status`, `trial_until`, `overrides_json`, `rev` | no invented plan price/quotas |
| `plan_definitions` | global | `id`, `name`, `rank`, `features_json`, `limits_json`, `monthly_price_cents`, `annual_price_cents` | draft commercial only until approved |
| `usage_counters` | org | `organization_id`, `resource_key`, `period`, `used`, `revision` | transactional increment under guard |
| `audit_events` | org | `id`, `organization_id`, `actor_id`, `action`, `resource_type`, `resource_id`, `diff_safe_json`, `created_at` | append-only logically |
| `integration_configs` | org | `id`, `organization_id`, `provider`, `state`, `secret_binding_ref`, `updated_at` | no token in DB payload |
| `outbox_messages` | org | `id`, `organization_id`, `kind`, `payload_minimal`, `status`, `attempt_count`, `created_at` | off by default until provider approved |
| `idempotency_records` | org | `organization_id`, `operation`, `key_hash`, `result_hash`, `expires_at` | unique per org+operation+key |
| `content_access_tokens` | org | `id`, `organization_id`, `edition_id`, `token_hash`, `expires_at`, `scope` | preview signed/revoked |

## Cardinalidades e índices
- organizations 1:N events; events 1:N editions; editions 1:N program_items e publications; organizations 1:N domains.
- users N:M organizations via memberships. Participação do convidado N:M via participations.
- índices únicos globais: `domains.hostname_normalized`, `organizations.slug`, `users.email_normalized` (auth adaptado).
- índices compostos: `events(organization_id,slug)`, `editions(organization_id,event_id,edition_key)`, `program_items(organization_id,edition_id,starts_at)`, `memberships(organization_id,user_id)`, `idempotency_records(organization_id,operation,key_hash)`.
- FK compostas recomendadas `(organization_id,event_id)` das edições para `(organization_id,id)` dos eventos, e `(organization_id,edition_id)` de programação/sponsors/forms para edição. Não confiar só em FK de ID global sem escopo.

## Exemplo de DDL crítico (ilustrativo; Drizzle gerará migrations na implementação)
```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','suspended','archived')),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TEXT NOT NULL
);
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, id)
);
CREATE TABLE editions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  edition_key TEXT NOT NULL,
  starts_at_utc TEXT,
  ends_at_utc TEXT,
  time_zone TEXT NOT NULL,
  publication_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  UNIQUE(organization_id,event_id,edition_key),
  UNIQUE(organization_id,id),
  FOREIGN KEY(organization_id,event_id) REFERENCES events(organization_id,id)
);
CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  destination_kind TEXT NOT NULL CHECK(destination_kind IN ('organization','event','edition','current_edition')),
  destination_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('requested','ownership_pending','tls_pending','dns_pending','active','failed','suspended','releasing','released')),
  cloudflare_hostname_status TEXT,
  cloudflare_ssl_status TEXT,
  CHECK ((destination_kind = 'organization' AND destination_id IS NULL) OR
         (destination_kind != 'organization' AND destination_id IS NOT NULL))
);
```

## Invariantes de dados
- Horas no banco: UTC ISO/RFC3339; timezone IANA explícita na edição; render no fuso do evento; testar DST e limites.
- Slugs públicos únicos por escopo e aliases antigos com redirect controlado. Domínio nunca é autorização.
- Erros de idempotência são org-scoped. Mudanças comerciais incrementam revision e audit log.
- Privacidade: `form_submissions`, `applications` e arquivos privados não entram no snapshot público.
- Exclusão: preferir archive/retention; não apagar edição publicada e conteúdo vinculado sem processo de despublicação/retirada de cache.
- A migração D1 deve possuir dry-run, checksum e rollback documentado; o SQLite da D1 não fornece RLS nativo por tenant.

## Plano de migração técnica
Criar tabelas globais/org, seed A×B, índices, composite FKs e constraints, popular sintéticos. Provar queries escopadas pelo `organization_id` e falhas cross-tenant em integração. Só depois permitir persistência de dados reais sob autorização.

## Garantia de concorrência no D1 (decisão de implementação)
A proposta usa `UPDATE ... WHERE revision = ?` e inspeciona `changes === 1` para compare-and-swap do ponteiro, combinado com prepared statements em `D1Database.batch()` para operações correlatas. A documentação Cloudflare descreve batch como transação com rollback em caso de falha; **não presumir suporte irrestrito a uma transação interativa entre round-trips**. Codex deve provar atomicidade, casos concorrentes e contadores em testes reais de D1 antes de marcar publish/quotas PASS. Se o fluxo exigir garantia superior, propor alternativa (ex.: Durable Object coordenador) por ADR, sem acionar produto pago sem aprovação. Fonte: https://developers.cloudflare.com/d1/worker-api/d1-database/ .
