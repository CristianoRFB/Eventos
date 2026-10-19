# ADR-007 — Operação da edição vinculada ao rascunho editorial

**Data:** 2026-10-19. **Status:** implementação local em validação.

Palcos, convidados, atividades, expositores e patrocinadores fazem parte de `ContentDocument.operations`. As APIs de cadastro modificam o agregado completo e gravam uma nova revisão imutável de `content_drafts`; os índices relacionais `stages`, `guests`, `program_items`, `participations`, `exhibitors` e `edition_sponsors` ficam vinculados à mesma organizadora/edição/rascunho. Isso mantém uma única fronteira de publicação e permite recuperar a agenda junto com o restante do site.

O CAS do rascunho e a normalização acontecem no mesmo `D1Database.batch()`. Falha de CAS não grava filhos nem auditoria. Inserts normalizados usam JSON1 em seis statements, sem crescer uma consulta por convidado/atividade. FKs compostas impedem referências a outro tenant/rascunho. Triggers bloqueiam sobreposição de palco/convidado e alteração/exclusão de índices históricos. A validação de servidor apresenta todos os conflitos detectados, verifica janela UTC da edição e escopo de locais/imagens. Fusos IANA são usados na exibição e nos filtros; datas são canonizadas em UTC, inclusive testes em transição DST.

Alterar uma coleção exige sua permissão específica mesmo quando o cliente envia o documento completo ao CMS. `content.write` não concede `program.write`, `guest.write`, `exhibitor.write` ou `sponsor.write`. Publicar continua exigindo `content.publish`, sem permitir ao cliente escolher status do ponteiro.

O snapshot público remove perfis em preparação e expositores sem opt-in de listagem. Atividades públicas exigem convidados públicos. Fotos precisam de escopo e licença pública no momento da publicação. Os campos dessas entidades são editoriais públicos; contatos/respostas privados de candidaturas não pertencem a este documento. F6 deverá derivar perfis por ação explícita, com consentimento separado.

Limites de tamanho/quantidade dos documentos são limites técnicos de validação, sem preço/plano comercial implícito. Não foram ativados serviços reais. Locais persistentes e integração de candidaturas ainda têm aceite próprio pendente.

Migration: `0004_lying_hammerhead.sql`, aplicada somente em D1 local. O gerador inicialmente recusou snapshots copiados com IDs repetidos em `0001`/`0003`; foram corrigidos apenas `id`/`prevId` dos metadados e sua cadeia, preservando schema histórico e SQL aplicado. O gerador então produziu 0004 normalmente.

Rollback: nova publicação a partir do snapshot anterior, com auditoria; conservar revisões e tabelas. Não executar DROP em banco com dados. Rollback de código deve manter leitura compatível com documentos antigos, que recebem `operations` vazio por default.
