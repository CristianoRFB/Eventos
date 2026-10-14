# Eventos 77 — instruções do checkout

## Destino e fontes de verdade

- Checkout autorizado: `C:\OpenSSL\set\Eventos`; origin `https://github.com/CristianoRFB/Eventos.git`.
- Branch autorizada: `codex/eventos77-full-system`. Não trocar para main nem tocar outras verticais.
- Leia `docs/CURRENT.md`, `docs/implementation/MASTER_EXECUTION_STATUS.md` e o TXT `codex/CODEX_GOAL_MASTER_EVENTOS_77_FULL_SYSTEM.txt` antes de continuar. O destino Eventos-77 proposto no TXT foi substituído expressamente pelo usuário; veja `docs/adr/ADR-005-authorized-repository-and-execution.md`.
- Baseline preservado: `b90ece62e0d3c893dc6e95d6643fa7505dd25602`. O histórico `docs/versions/v0.1.0-architecture/` descreve design, não prova de software.

## Trabalho seguro e retomável

Faça código, testes, docs e migrations **locais**, em dados sintéticos A/B. Preserve arquivos preexistentes e alterações dos agentes; confira estado antes de editar. Não use `git reset --hard`, `git clean -fd`, `git push --force` nem substitua checkouts. Faça checkpoints locais pequenos por fase quando executados e documentados. Push, PR/merge remoto, serviços pagos, DNS/custom hostname, migração em cloud e ações com dados reais precisam de autorização correspondente. Os consoles disponibilizados pelo usuário são contexto de acesso, não evidência de recurso configurado. O usuário pediu foco inicial em desenvolver o sistema e publicação futura em subdomínio Workers.

Tenant = organizadora. Todo recurso tenant-owned, query, upload, cache e log deve carregar escopo validado em servidor; não aceitar papel/org/status do browser como autoridade. Eventos e edições são entidades diferentes. Hostname desconhecido, pendente ou suspenso falha fechado; não existe tenant default. Cookies administrativos são host-only, nunca compartilhados com hosts públicos. Preview/drafts/PII não entram em snapshot público ou cache. Não implementar auth improvisada para contornar falha de PoC. Segurança nunca depende de preço/plano.

## Verificações

Antes de trabalhar, conferir `git rev-parse --show-toplevel`, `git remote -v`, `git branch --show-current`, `git status -sb` e `git log -n 7 --oneline`. Registrar evidências sem segredos.

Os comandos alvo de F1 são `npm ci`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run test:e2e`, `npm run build`, `npm run docs:diagrams` e `npm run docs:check`. **São contrato provisório até existirem no `package.json`; a enumeração não afirma que foram criados ou executados.** Confira os scripts atuais e registre comando exato, saída, ambiente e código de saída. Não converter compilação verde em prova de auth, isolamento, deploy ou produção. Não ampliar testes sem relação com mudanças/falhas.

Para PASS, requisitos e aceite da fase precisam de código + teste executado + evidência rastreável no commit/branch. Mantenha `docs/implementation/REQUIREMENTS_TRACEABILITY.csv`, `FEATURE_STATES.md`, matrizes de telas, diagramas e status consistentes. Arquivos/testes indicados como planejados não são prova. Não fabricar screenshots, URLs, SHA de implementação, migrations, PASS ou integração Firebase/Cloudflare.

## Fases e encerramento

Continue tarefas locais independentes mesmo quando um gate cloud estiver pendente. F8 depende da prova A/B de F2; catálogo de produção não aprovado usa apenas abstração e fixtures `TEST_ONLY`, sem inventar preço/limite. NEXT/DEFERRED ficam fora da UI operacional até implementação real e decisão de escopo. Preserve as 16 fontes Mermaid e identifique SVGs históricos como Graphviz até renderização Mermaid comprovada.

Atualize o master status com SHA/branch/data, arquivos, migrations, comandos, resultados, rollback, impedimentos e `NEXT_STEP` exato. F11/produção exigem URL/release/logs/smoke e homologação reais. Não declarar o goal integral concluído enquanto qualquer requisito exigido permanecer sem prova; registre pendências externas com precisão.
