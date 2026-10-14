# Decisions pending — Eventos 77

| ID | Decisão | Default proposto | Status |
|---|---|---|---|
| EVT-01 | Nome/domínio oficial da plataforma | Eventos 77 de trabalho; domínio não registrado | PENDING_OWNER |
| EVT-02 | Banco físico | Workers + D1/Drizzle + R2 | RECOMMENDATION |
| EVT-03 | Biblioteca Auth | Better Auth D1/Drizzle compatível após PoC | COMPATIBILITY_GATE |
| EVT-04 | Forma de domínios | www/subdomínio primeiro; custom hostname auditado | RECOMMENDATION |
| EVT-05 | Configuração Cloudflare for SaaS / R2 | nenhum provedor ativado antes de aprovação de gasto | PENDING_OWNER |
| EVT-06 | Oferta/preço/limites/trial | Essencial/Pro/Premium apenas conceitual | PENDING_MARKET_VALIDATION |
| EVT-07 | Produtos no escopo NOW | site, CMS, multi-editions, programação, convidados, expositor | PROPOSAL |
| EVT-08 | Formulário exige PII? | mínimo por finalidade; sem documentos/CPF default | PRIVACY_REVIEW |
| EVT-09 | Política de domínio apex | `www` prioritário, apex depende do DNS/serviço | RECOMMENDATION |
| EVT-10 | Licenciamento de fotos de convidados | uploader deve comprovar direito de uso | CONTRACT_REVIEW |
| EVT-11 | Edição multi-cidade | edição tem local/cidade, múltiplas datas; evento guarda marca | PROPOSAL |
| EVT-12 | Event/edition sub-brand | herança tokens de org -> event -> edition | RECOMMENDATION |
| EVT-13 | Aprovação editorial obrigatória? | permitir owner publicar, editor só draft | RECOMMENDATION |
| EVT-14 | Plano de pagamento seasonal | comparar annual/por-edição/híbrido | MARKET_RESEARCH |
| EVT-15 | API de bilheteria / pagamento | link externo; API deferred | DEFERRED |


respostas:

faça o que for necessário para o sistema operar d amelhor maneira e para funcionar tanto com firebase tanto com o cloudlfare no plano gratuitio, mantendo a escalabilidade do projeto, poste me um subdominio do cloudlfare