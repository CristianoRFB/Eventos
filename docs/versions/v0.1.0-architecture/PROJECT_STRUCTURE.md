# Árvore proposta do futuro repositório Eventos-77

```text
Eventos-77/
  AGENTS.md
  README.md
  .env.example
  package.json
  package-lock.json
  wrangler.jsonc
  vite.config.ts
  react-router.config.ts
  drizzle.config.ts
  app/
    root.tsx
    routes.ts
    entry.server.tsx
    routes/{public,admin,platform,auth,api}/
    components/{layout,content,forms,admin,public}/
    styles/{tokens,global}.css
  workers/
    app.ts                # fetch handler / bindings
    middleware/{host,session,tenant,csrf,security}.ts
  src/
    domain/{organizations,events,editions,content,program,forms,domains,commercial}/
    services/{domain-resolver,publishing,authz,media,domain-provider}/
    repositories/{organizations,events,editions,publications,domains,memberships}/
    infrastructure/{db,auth,r2,cloudflare,queue,logger}/
    contracts/{schemas,api,rbac}.ts
  db/
    schema/{auth,tenants,events,cms,operations,domains,commercial}.ts
    migrations/
    seed/{tenant-a,tenant-b}/
  tests/
    unit/
    integration/
    security/
    e2e/
    fixtures/
  scripts/
    check-docs.mjs
    check-tenant-isolation.mjs
    seed-local.mjs
    render-diagrams.mjs
  docs/
    CURRENT.md
    DIAGRAMS_MANIFEST.md
    LEADS_MANIFEST.md
    implementation/MASTER_EXECUTION_STATUS.md
    versions/v0.1.0-architecture/...
  .github/workflows/ci.yml
```

**Atenção:** caminhos são recomendados para futuro código, nenhum deles significa arquivo existente no runtime atual. Adaptar aos templates oficiais de React Router/Cloudflare vigentes no momento do GOAL e não forçar duplicidade de server quando loaders/actions já cumprirem a função.
