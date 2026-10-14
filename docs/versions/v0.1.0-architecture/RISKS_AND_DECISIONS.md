# Riscos principais e decisões futuras

| ID | Severidade | Risco | Mitigação | Gate |
|---|---|---|---|---|
| R-01 | severe | domain hijack | unique reservation + ownership + SSL + DNS + teardown | NO_LIVE_DOMAIN |
| R-02 | severe | cross tenant data access | central scope guard + A/B adversarial tests | BLOCK_IF_FAILED |
| R-03 | high | unsafe public asset | private/public separation + publication license | BLOCK_IF_FAILED |
| R-04 | high | stale cache | cache key with host+revision, purge | BLOCK_IF_FAILED |
| R-05 | high | auth incompatibility | PoC login logout refresh csrf session revoke | ADR_REQUIRED |
| R-06 | high | event seasonality | test annual vs per-edition pricing | MARKET_VALIDATION |
| R-07 | medium | D1 quota | usage forecast, reduce SSR lookups/cache | COST_APPROVAL |
| R-08 | high | double program | transaction + revision + consistency guard | BLOCK_IF_FAILED |
| R-09 | high | form PII breach | strict roles, R2 private, retention | BLOCK_IF_FAILED |
| R-10 | high | production rollout failure | staging/manual DNS prevalidation | HUMAN_GATE |
| R-11 | medium | copied branding without consent | synthetic demo, consent workflow | LEGAL_REVIEW |
| R-12 | medium | overscoped SaaS | defer, links only | NO_GO_NOW |

## Radar de 15 decisões futuras
1. **Domínio comercial** — registrar domínio da plataforma somente após escolher marca e custo anual
2. **Apex vs www** — validar necessidade e DNS do primeiro cliente antes de comprar add-on
3. **Fonte de login** — PoC de Better Auth Worker/D1, ADR fallback se falhar
4. **Template visual** — começar com 2–3 layouts, não um editor WYSIWYG genérico
5. **Papel publisher** — se cliente tiver equipe pequena, owner pode publicar; editor não
6. **Cidades e edições** — edição carrega data/local, evento carrega marca histórica
7. **Bilheteria** — apenas link externo até aparecer pedido de API pago e contratual
8. **Expositor** — definir finalidade e prazos de retenção por organizadora
9. **Brand multi-evento** — permitir perfil opcional e herança tokens da organizadora
10. **Preço/planos** — validar sazonalidade e implantação antes de fixar mensalidade
11. **Domínios por plano** — limite comercial depende da capacidade técnica já validada
12. **Trial** — não habilitar só porque global contém status trial
13. **Self-service** — assistido no MVP reduz risco de DNS/suporte e fraude
14. **Analytics** — agregado/consentimento, evitar cookie tracking no MVP
15. **Integração Cosmaker/Caravana** — somente links/parcerias, sem fusão DB/código

## Status
Todos os itens são RECOMENDAÇÕES, exceto as regras do escopo do projeto como tenant=organizadora e SaaS separado. Custos e políticas não aprovados.
