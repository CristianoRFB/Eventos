# ADR-001 — Workers SSR + D1/Drizzle + R2
**Status: PROPOSTA PARA APROVAÇÃO — 2026-10-14.**

Contexto: sistema novo, domínio/evento/edição relacional, necessidade Cloudflare, custo inicial enxuto e SEO por host. Alternativas: Firebase Auth/Firestore com Worker (familiar, porém mais provedores e rules) e Postgres externo (capacidade, porém operação extra). **Decisão proposta:** Workers React Router SSR, D1 Drizzle, R2; autenticação Better Auth sob prova de compatibilidade. Consequências: SQL com FK e migrações facilita relações, mas D1 não fornece RLS por tenant; autorização/scoping no backend deve ser intensa; divergência de documentação Cloudflare pode exigir ajustes. Se PoC falhar, registrar ADR de substituição antes de codificar auth. Nenhum provisionamento foi autorizado.
