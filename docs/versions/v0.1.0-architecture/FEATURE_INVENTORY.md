# Inventário de 38 features — todas PLANEJADAS

| ID | Módulo | Recurso | Persona | NOW/NEXT/DEFERRED | Aceite principal |
|---|---|---|---|---|---|
| `F-01` | platform | org provision e suspension | Platform Owner | **NOW** | A+B ativas/inativas sem delete |
| `F-02` | platform | invite owner | Platform Owner | **NOW** | token one-time expiry |
| `F-03` | platform | audit critical | Platform Owner | **NOW** | immutable actor/resource |
| `F-04` | platform | memberships / roles | Org Owner | **NOW** | last owner guard |
| `F-05` | platform | organization profile | Org Owner | **NOW** | can edit own only |
| `F-06` | tenant | branding tokens | Org Owner | **NOW** | two distinct themes A/B |
| `F-07` | tenant | event CRUD | Event Manager | **NOW** | slug scoped unique |
| `F-08` | tenant | edition CRUD clone | Event Manager | **NOW** | clone excludes PII |
| `F-09` | tenant | domain onboarding | Org Owner | **NOW** | DNS SSL gating |
| `F-10` | public | home by hostname | Visitor | **NOW** | no fallback other tenant |
| `F-11` | public | SEO meta/sitemap | Visitor | **NOW** | host canonical only |
| `F-12` | public | editions history | Visitor | **NOW** | archive safe |
| `F-13` | content | page section editor | Content editor | **NOW** | preview + valid blocks |
| `F-14` | content | atomic publish/rollback | Publisher | **NOW** | snapshot versioned |
| `F-15` | content | asset upload | Content editor | **NOW** | mime size license validated |
| `F-16` | program | stage/venue CRUD | Event Manager | **NOW** | tenant scoped |
| `F-17` | program | program scheduling | Event Manager | **NOW** | conflict blocked |
| `F-18` | program | agenda by day stage | Visitor | **NOW** | filterable mobile |
| `F-19` | guests | guest profiles | Event Manager | **NOW** | private/public separated |
| `F-20` | guests | guest catalog | Visitor | **NOW** | approved only |
| `F-21` | expo | application form builder | Org Staff | **NOW** | fields versioned |
| `F-22` | expo | submit application | Public applicant | **NOW** | receipt token, PII safe |
| `F-23` | expo | application review | Reviewer | **NOW** | states and audit |
| `F-24` | expo | public exhibitor directory | Visitor | **NOW** | only opted in |
| `F-25` | content | FAQ and regulatory pages | Editor | **NOW** | published SSR |
| `F-26` | content | sponsors management | Editor | **NOW** | safe external links |
| `F-27` | content | announcements | Editor | **NEXT** | approval flow |
| `F-28` | ops | activity/audit reporting | Org Owner | **NEXT** | scope correct |
| `F-29` | ops | analytics aggregates | Org Owner | **NEXT** | no cross-tenant |
| `F-30` | ops | CSV export submissions | Staff | **NEXT** | audit and scrub |
| `F-31` | commercial | manual plans | Platform Owner | **NEXT** | audit plan changes |
| `F-32` | commercial | visible quota status | Tenant admin | **NEXT** | server enforced |
| `F-33` | commercial | synthetic demo | Visitor | **NEXT** | no external effects |
| `F-34` | integration | external ticket link | Org Owner | **NOW** | clear external CTA |
| `F-35` | integration | ticket gateway native | Org Owner | **DEFERRED** | not built now |
| `F-36` | integration | whatsapp/SMS automation | Org Owner | **DEFERRED** | explicit approval |
| `F-37` | marketplace | cosplay marketplace | all | **DEFERRED** | not built now |
| `F-38` | ops | staging/domain provider monitor | Platform Owner | **NOW** | SSL and host independent |

Nenhuma linha deve ser marcada IMPLEMENTED sem PR/commit, teste e evidência. O arquivo CSV contém telas, entidades, permissão e dependência por feature.
