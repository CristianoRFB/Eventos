# Inventário das telas e UI states — 60 telas propostas

**Nenhuma tela está implementada.** Cada tela deve oferecer loading/empty/error/forbidden/404 quando aplicável; ser responsiva, acessível, e mostrar apenas dados autorizados.

## Orientações transversais
- Site público SSR mobile-first com tema da marca do evento; teclado/foco, contraste, WCAG 2.2 AA como objetivo verificável.
- Painel com filtros persistentes, feedback otimista somente com confirmação final do backend e mensagens específicas de permissão/limite.
- Preview não indexável; CTA de ingresso aponta claramente para fornecedor externo.
- Estados 403/404/suspenso não vazam nome ou objetos de outro tenant.

## Website público

| Tela | Rota-modelo | Pessoa | Conteúdo e ação | Prioridade |
|---|---|---|---|---|
| home-organizadora | `/` | Visitante | hero,events,branding; **event / edition links** | NOW |
| home-evento | `/` | Visitante | hero,dates,cta; **program; tickets** | NOW |
| edicoes | `/edicoes` | Visitante | timeline editions; **edition detail** | NOW |
| programacao | `/programacao` | Visitante | day/stage/category filter; **session detail** | NOW |
| detalhe-atracao | `/programacao/:slug` | Visitante | activity metadata; **back agenda** | NOW |
| convidados | `/convidados` | Visitante | consented profiles; **guest details** | NOW |
| convidado-detalhe | `/convidados/:slug` | Visitante | bio/media/sessions; **program** | NOW |
| expositores | `/expositores` | Visitante | approved public profiles; **exhibitor detail** | NOW |
| expositor-detalhe | `/expositores/:slug` | Visitante | allowed data; **return catalog** | NOW |
| inscricao-expositor | `/expositores/inscricao` | Candidato | form/privacy/attachments; **submit** | NOW |
| inscricao-confirmacao | `/inscricoes/confirmacao` | Candidato | receipt private token; **status** | NOW |
| ingressos-externos | `/ingressos` | Visitante | external provider CTA; **open official link** | NOW |
| faq | `/faq` | Visitante | accordion sections; **navigate** | NOW |
| como-chegar | `/local` | Visitante | address accessibility; **maps external** | NOW |
| patrocinadores | `/patrocinadores` | Visitante | public sponsors; **visit website** | NOW |
| regras | `/regulamento` | Visitante | regulations/privacy; **navigate** | NOW |
| avisos | `/noticias` | Visitante | published announcements; **detail** | NEXT |
| detalhe-aviso | `/noticias/:slug` | Visitante | published announcement; **back** | NEXT |
| 404 | `/*` | Visitante | unknown host/page; **safe home** | NOW |
| suspenso | `/*` | Visitante | suspended organization; **no data** | NOW |
| preview-protegido | `/preview/:token` | Editor | unpublished preview; **review** | NOW |

## Login/convites

| Tela | Rota-modelo | Pessoa | Conteúdo e ação | Prioridade |
|---|---|---|---|---|
| login | `/login` | Membro | email password/session; **choose organization** | NOW |
| aceitar-convite | `/invite/:token` | Convidado | one-time invite; **accept** | NOW |
| selecionar-organizacao | `/select-organization` | Membro | active memberships; **select** | NOW |
| sem-permissao | `/forbidden` | Membro | permission error; **back** | NOW |

## Painel organizadora

| Tela | Rota-modelo | Pessoa | Conteúdo e ação | Prioridade |
|---|---|---|---|---|
| dashboard | `/o/:org/` | Owner/admin | metrics/events/issues; **open event** | NOW |
| onboarding | `/o/:org/setup` | Owner | checklist to publish; **save** | NOW |
| perfil-organizadora | `/o/:org/settings` | Owner | contacts/branding/privacy; **save** | NOW |
| brand-editor | `/o/:org/branding` | Owner/admin | tokens/assets/theme preview; **apply** | NOW |
| eventos | `/o/:org/events` | Owner/admin | event list; **new/edit** | NOW |
| criar-evento | `/o/:org/events/new` | Owner/admin | name,slug,brand; **create** | NOW |
| editar-evento | `/o/:org/events/:id` | Manager | event details; **editions** | NOW |
| edicoes | `/o/:org/events/:id/editions` | Manager | versions/status; **clone/new** | NOW |
| editar-edicao | `/o/:org/editions/:id` | Manager | venue/dates/timezone; **save** | NOW |
| cms | `/o/:org/editions/:id/cms` | Editor | draft blocks/order; **preview** | NOW |
| preview-revisoes | `/o/:org/editions/:id/revisions` | Publisher | diff/revisions; **publish/rollback** | NOW |
| media | `/o/:org/media` | Editor | upload/licensing; **insert** | NOW |
| programacao | `/o/:org/editions/:id/program` | Manager | sessions/filter; **edit** | NOW |
| palcos | `/o/:org/editions/:id/stages` | Manager | stage/venue settings; **save** | NOW |
| convidados | `/o/:org/editions/:id/guests` | Manager | guests/profiles; **manage** | NOW |
| expositores | `/o/:org/editions/:id/exhibitors` | Manager | approved exhibitor list; **publish** | NOW |
| form-builder | `/o/:org/editions/:id/forms` | Manager | fields/version/consent; **publish form** | NOW |
| submissoes | `/o/:org/editions/:id/applications` | Reviewer | private application queue; **review** | NOW |
| detalhe-submissao | `/o/:org/applications/:id` | Reviewer | private answers/files; **approve/reject** | NOW |
| patrocinadores | `/o/:org/editions/:id/sponsors` | Editor | sponsors/placements; **save** | NOW |
| faq | `/o/:org/editions/:id/faq` | Editor | reorder faq; **save** | NOW |
| avisos | `/o/:org/editions/:id/news` | Editor | announcements; **publish** | NEXT |
| dominios | `/o/:org/domains` | Owner | ownership/DNS/SSL statuses; **request/remove** | NOW |
| equipe | `/o/:org/team` | Owner | members/invites/roles; **invite/revoke** | NOW |
| plano | `/o/:org/plan` | Owner | manual plan + limits; **view** | NEXT |
| relatorios | `/o/:org/reports` | Owner | aggregates; **export** | NEXT |
| auditoria | `/o/:org/audit` | Owner | recent changes; **filter** | NEXT |

## Admin plataforma

| Tela | Rota-modelo | Pessoa | Conteúdo e ação | Prioridade |
|---|---|---|---|---|
| dashboard | `/platform` | Platform owner | tenants/errors; **open tenant** | NOW |
| organizadoras | `/platform/organizations` | Platform owner | org list; **create/suspend** | NOW |
| organizadora-detalhe | `/platform/organizations/:id` | Platform owner | status/owner/domains; **manage** | NOW |
| dominios | `/platform/domains` | Platform owner | provider state and errors; **retry** | NOW |
| planos | `/platform/plans` | Platform owner | manual state/overrides; **assign** | NEXT |
| audit | `/platform/audit` | Platform owner | privileged mutations; **review** | NOW |

## Comercial da plataforma

| Tela | Rota-modelo | Pessoa | Conteúdo e ação | Prioridade |
|---|---|---|---|---|
| landing | `/product` | Lead | product description/demo CTA; **contact** | NEXT |
| demo | `/demo` | Lead | synthetic tenant; **view** | NEXT |

## Responsive / acessibilidade
Layouts principais: desktop 1440×900; mobile 390×844; mobile pequeno 320 px; tablet 768 px. Implementar nav com foco/foco visível, alterações com anúncios ARIA adequados, restrição de upload legível, labels e validação associada. Não depender de hover. Confirmações antes de publicar/desativar com indicação de efeito.

## Empty/error/permission estados que precisam de screenshot real quando existir app
Sem evento, edição draft, nenhuma atração, palco em conflito, formulário encerrado, domínio pendente e SSL ativo/inativo, usuário sem membership, tenant suspenso, sem plano aprovado, erro de R2 e Worker indisponível.
