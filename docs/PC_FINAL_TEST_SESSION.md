# Eventos 77 — sessão final de validação no PC (PLANO, não execução)

Não execute migração, DNS, Worker, buckets ou dados de produção apenas por seguir
este documento. O alvo aqui é **banco D1 local sintético**, sem recursos pagos.
Somente após os gates de código e aprovação humana considerar staging.

## Pré-requisitos

- Git com checkout da branch aprovada `chat/eventos77-f6-retention-20261027`
  ou commit integrado oficialmente na branch Codex; comparar HEAD com o PR.
- Node conforme `.node-version` (24.11.1), npm; Chromium instalado pelo Playwright.
- Sem tokens de cloud/segredos reais no shell ou logs.
- Ambiente e fixtures criados exclusivamente pelos scripts versionados; seeds
  `*.example.test` não correspondem a pessoas ou empresas.

## Ordem executável e critérios STOP

```powershell
git remote -v
git branch --show-current
git status -sb
git log -n 5 --oneline
npm ci
npm run setup:local
npm run db:migrate:local
npm run db:seed:local
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:integration
npm run test:e2e
npm run docs:check
```

PARAR e registrar saída sem prosseguir para ambiente real se: migração falhar,
um teste A/B falhar, uma candidatura privada for acessível em outro tenant,
um segredo aparecer no artefato, um status de CI não for PASS ou a branch
estiver divergente. Não use reset destrutivo para "limpar" resultados.

## Manual após checks automáticos

Executar `npm run dev` e acessar `http://localhost:5173` em outro terminal.
Utilizar apenas as contas sintéticas provisionadas pelo seed, documentadas
em `README.md`, conferindo role e estado após cada login; nunca copiar
credenciais de produção.

Verificar em **320, 375, 390, 768 e 1440px**:
1. Platform Owner opera organizadoras fictícias; suspensão e revogação de
   membership funcionam sem revelar dados entre A/B.
2. Organizador cria evento e edição, altera CMS, faz preview privado,
   publica, verifica SEO e rollback sem vazar draft.
3. Programação e palcos detectam conflitos, exibem calendário navegável,
   permanecem tenant-scoped.
4. Candidato envia inscrição, recebe recibo opaco, é revisado com
   `needs_info`, responde uma vez, e revisor visualiza só no seu tenant.
5. Exportação privada requer `applications.review`, responde como CSV
   sem cache e não inclui dados de outro tenant/retirados/vencidos.
6. Retirada revoga perfil público imediatamente (inclusive snapshots
   anteriores) e remove ciphertext do candidato.
7. Simular avanço controlado do relógio apenas no banco fictício e
   executar purga por teste `forms-retention.test.ts`. O cron cloud
   NÃO está configurado; não presumir execução em produção.
8. Testar teclado, foco visível, campos/erros, empty/loading e ausência
   de scroll horizontal; diferenças de fuso horário e URL canônica.
9. Simular Worker sem binding D1, host desconhecido e tenant suspenso;
   exigir falha fechada sem fallback para outro cliente.
10. Com dados sintéticos, testar backup/restauração de D1 local antes
    de qualquer proposta de deploy real.

## Gates externos NÃO autorizados por este guia

Custom hostnames, DNS/SSL, D1/R2 cloud, cron hosted, e-mail de saída,
preços/trial/billing, migrations hospedadas, staging, produção e clientes reais
exigem decisão humana, escopo de custo e comprovação específica por ambiente.
O projeto só será `READY_FOR_PILOT` após aceites explícitos documentados.
