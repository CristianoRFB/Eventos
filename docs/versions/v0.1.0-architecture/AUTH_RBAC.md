# Autenticação / Memberships / RBAC

## Identidade
`users` representa usuário global; `memberships` `(organization_id,user_id)` representa vínculo ativo e papel. Um usuário pode participar de A e B, mas deve SELECIONAR o contexto no painel, com sessão e autorização refeitas a cada rota e mutação. A session não contém acesso permanente independente do DB.

Login por host fixo; sessão persistida e rotacionada no servidor; token opaco, cookie `HttpOnly`, `Secure`, `SameSite=Lax`, host-only. Recuperação e convite usam token de uso único hasheado em DB, validade curta e rate limiting. Um visitante público não precisa login para conteúdo público. Formulário de expositor usa recibo/link seguro e consentimento; nunca acesso via ID adivinhável.

## Papéis mínimos propostos
| Papel | Escopo | Pode | Não pode |
|---|---|---|---|
| platform_owner | global | provisionar/suspender org, status de plano, domínio, logs mínimos | ler submissões privadas livremente |
| organization_owner | sua org | membros, domínios solicitados, billing manual informativo, eventos e edições | operar org alheia ou criar platform_owner |
| organization_admin | sua org | controlar eventos e equipe operacional delegada | mexer em plano global |
| event_manager | eventos atribuídos | edição, agenda, convidados, expositores, publicação após permissão | equipe da org ou domínio |
| content_editor | eventos atribuídos | criar/editar draft, mídia e preview | publicar sem permissão específica |
| reviewer_staff | eventos atribuídos | analisar submissões, aplicar decisão e exportar quando permitido | alterar plano ou outros eventos |
| public_visitor | conteúdo publicado | ler site e enviar formulário limitado | CRUD administrativo |

`staff/checkin` é NEXT, condicionado a módulo concreto. Escopo por `event_assignments` quando pessoa não atua em todos os eventos.

## Regras adicionais
- `platform_owner` separado de memberships locais, provisionado por canal seguro fora do self-service e auditado.
- `organization_owner` não pode remover o último owner sem transferência confirmada.
- Escalada de role nunca aceita valor autoritativo do frontend.
- Atividades críticas registram quem/quando/tenant/escopo, sem segredos e dados desnecessários.
- Support access deve ser read-only por padrão; break-glass temporal com motivo e auditoria só se realmente necessário e aprovado.
- Revogação de membership deve invalidar autorização mesmo com cookie ainda válido (policy consulta DB) e rotação de sessão em alterações críticas.

## Matriz de permissões detalhada
Ver `RBAC_MATRIX.csv` e `UX_SCREENS.md` para telas. Cada API exige `requirePermission(user,organization,resource,action)`; read público via snapshot publicado não exige role, mas nunca concede escrita.
