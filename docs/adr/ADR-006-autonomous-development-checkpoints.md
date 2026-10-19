# ADR-006 — Autonomia de desenvolvimento e checkpoints remotos

**Data:** 2026-10-19. **Status:** aceito conforme autorização expressa do usuário.

O usuário autorizou desenvolvimento integral F0–F12, dependências gratuitas, testes, migrations exclusivamente locais e commits/pushes seguros na branch `codex/eventos77-full-system`, sem confirmação por tarefa. Esta autorização atualiza o limite de GitHub remoto do ADR-005; não autoriza merge na main, produção, dados reais, DNS, despesas, credenciais ou mensagens reais.

O preflight confirmou raiz/origin/branch autorizados, checkout limpo e HEAD local/remoto em `d5d5f0fa737be132fde7c4ff566ea8e0579c2952`. `git fetch origin codex/eventos77-full-system` e `git push origin HEAD:refs/heads/codex/eventos77-full-system` terminaram exit 0; push informou `Everything up-to-date`, preservando o checkpoint anterior sem atualização de ref. Não houve reinício ou descarte de implementação.

O único workflow versionado, `.github/workflows/ci.yml`, executa qualidade em PR/manual, sem deploy e sem trigger de push. A consulta read-only ao painel Workers em 2026-10-19 retornou `No access / Authentication error`; não é prova de ausência de integração externa. Para isolar os checkpoints dos fluxos padrão Cloudflare Workers Builds/Pages, `preinstall` e `prebuild` recusam `WORKERS_CI`, `WORKERS_CI_BUILD_UUID` ou `CF_PAGES`. Três testes de processo comprovaram exit 1 nesses ambientes. Configuração externa que deliberadamente ignore lifecycle scripts não foi auditada; não adicionar comandos de publicação a esta branch.

Referência das variáveis injetadas: [Cloudflare Workers Builds](https://developers.cloudflare.com/changelog/post/2025-06-10-default-env-vars/). Um futuro release exige configuração de ambiente e autorização correspondente; remover o bloqueio apenas nesse contexto. Nenhuma integração Firebase, recurso Cloudflare real, DNS, migration cloud ou deploy foi realizada.

Rollback: reverter apenas este checkpoint revisado; preservar o checkpoint `d5d5f0f`, dados locais e histórico. As proteções de segurança do runtime não dependem de plano comercial.
