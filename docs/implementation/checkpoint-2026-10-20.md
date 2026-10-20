# Checkpoint — 2026-10-20

Estado do goal: **IN_PROGRESS / INCOMPLETO**. Este fechamento atende ao pedido de terminar as últimas ações e preservar o progresso no GitHub; não certifica o GOAL MASTER integral. F0–F7, F9–F10 e F12 continuam PARTIAL; F8 NOT_STARTED; F11 EXTERNAL_GATE_PENDING.

Checkout `C:\OpenSSL\set\Eventos`, origin `https://github.com/CristianoRFB/Eventos.git`, branch `codex/eventos77-full-system`. Baseline preservado `b90ece62e0d3c893dc6e95d6643fa7505dd25602`; checkpoint anterior `a9beeacbbe410fe9f3f682a8458d2de1d3efa3df`. Código F6 **`8ea34d960d487335c721c7bcbf9040897266dafb`**, enviado ao origin. Este documento e seus manifestos ficam no commit de evidências posterior ao código. Nenhum reset, force push, merge na main ou deploy foi executado.

## Implementação e limites

`app/domain/forms.ts`, `app/db/forms-schema.ts`, `app/services/forms.server.ts`, `forms-public.server.ts` e `app/infrastructure/submission-crypto.server.ts` implementam definições imutáveis, respostas cifradas com escopo autenticado, idempotência, prazo, limite operacional e recibo privado. As rotas `forms.tsx`, `applications.tsx` e `application-receipt.tsx` e o componente público completam construção, envio, análise e retirada. CMS/Worker validam separadamente publicação, papel e consentimento. [ADR-008](../adr/ADR-008-private-versioned-applications.md) descreve invariantes e limites.

Uma aprovação não publica respostas nem perfil. O perfil autorizado exige preparação editorial e publicação CMS. Retirada elimina os cifrados da submissão e remove o perfil até de snapshot anterior, sem cache público. Anexos privados, purga por retenção, resposta do candidato a pedido de informações e exportação mínima auditada ainda faltam. Recibos expiram; a remoção física por tempo ainda não foi implementada. Rotação/recuperação das chaves precisam de solução antes de dados reais.

Migration `0005_cuddly_legion.sql`: oito tabelas adicionais, relações compostas por tenant/edição, imutabilidade e auditoria. Aplicada exclusivamente ao D1 local sintético. Não houve migration cloud. Retenção de 30 dias, identidades, perfis e IP local dos testes são TEST_ONLY; não aprovam política comercial.

## Verificação executada

Ambiente: Windows/PowerShell, Node 24, Worker/D1/R2 locais, Chromium Playwright, organizadoras fictícias A/B. Logs em [evidence/2026-10-20](evidence/2026-10-20). Cada arquivo corresponde ao comando nomeado; códigos de saída abaixo foram observados, sem inferir prontidão de produção.

| Comando | Resultado |
|---|---|
| `npm run db:migrate:local` | PASS, exit 0; 0005 aplicada localmente em 2026-10-19; log preservado |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `npm test` | PASS, exit 0; 120 testes, 9 arquivos |
| `npm run build` | PASS, exit 0; somente build local |
| `npm run test:integration` | PASS, exit 0; 22 cenários API |
| `npx playwright test --project=desktop --project=mobile tests/e2e/forms.spec.ts --reporter=list` | PASS, exit 0; duas jornadas F6 |
| `npm run test:e2e` | PASS, exit 0; 14 cenários, sete por viewport (1440 e 390 px) |
| `npm run docs:check` | PASS, exit 0; 172 cláusulas de fase, 65 globais, 38 features, 60 telas e 16 diagramas preservados |

[Dez capturas novas](screenshots/2026-10-20/manifest.json) registram hash, horário, dimensões e SHA do código. Inspeção visual do formulário mobile e da revisão desktop confirmou leitura e composição; testes verificaram ausência de overflow e de erros de página. As capturas anteriores permanecem preservadas. O checker documental valida proveniência e inventário, sem certificar aceite funcional completo.

A regressão encontrou e corrigiu a geração de UUID no host HTTP local e a inclusão de um perfil novo quando o rascunho continha um perfil cujo consentimento fora revogado. API e navegador validam conflito de versão, isolamento A/B, privacidade, recusa de opt-out, revisão, publicação separada e retirada imediata. Os testes não cobrem anexos ou purga que ainda não existem. Logs registram indisponibilidade esperada de purge cloud; isso continua pendente.

## Como terminar o goal

1. **F6 — próximo trabalho local:** purga por retenção idempotente com testes A/B, expiração real no Worker e auditoria sem respostas privadas; depois anexos privados com download autorizado e teste cross-tenant, resposta do candidato, exportação mínima auditada e recuperação/rotação de chave. Fechar todas as cláusulas F6, não apenas a jornada feliz.
2. **F1–F5:** completar expiração de sessões/convites, falha sem D1, reinício/persistência e CI hosted; equipe/papéis e suporte; marca e clone sem PII; reconciliação de mídia e variantes; páginas e histórico de edições, purge e aceites CMS; CRUD de locais e agenda pública de dois dias. A matriz original preserva cada cláusula restante.
3. **F7:** implementar lifecycle completo de hostname com provedor fake, ownership, estados pendente/suspenso/SSL/DNS e testes fail-closed. Host real e DNS exigem autorização específica; não confundir helpers existentes com onboarding completo.
4. **F8:** provar os gates locais de F2 e implementar apenas abstrações/fixtures TEST_ONLY de entitlements aprovadas. Catálogo, preço, quota e trial de produção continuam NOT_APPROVED. Nenhum preço deve ser inventado; segurança independe de plano e NEXT fica fora da UI operacional.
5. **F9–F10:** completar telas NOW e estados de erro/vazio/forbidden/arquivado/responsividade e teclado; testes de falhas de provedores, backup/restore e medição; revisão de segurança e dependências no gate de release.
6. **F12:** reconciliar os 16 diagramas com código real, completar runbooks, matrizes e evidências por requisito. Atualizar SHA/branch/comandos/exit codes a cada checkpoint; preservar fontes e SVGs históricos Graphviz.
7. **F11 / gates externos:** preparar release e rollback revisáveis; obter escopo específico para recursos/deploy, dados e DNS reais, validar custo e configuração; comprovar URL/release/logs/smoke/backup/rollback e homologação. Somente depois avaliar prontidão comercial. Firebase runtime e Cloudflare reais ainda não foram comprovados.

**NEXT_STEP exato:** adicionar rotina local de purga de submissões vencidas por organizadora, sem remoção destrutiva de histórico obrigatório, com teste de execução repetida e ausência de dados/perfis A em B; registrar a política e seus limites no ADR-008. Continuar tarefas locais independentes enquanto gates comerciais/cloud estiverem pendentes.

## Rollback

Preservar banco e objetos locais, fechar recebimento e reverter o commit funcional identificado, mantendo tabelas e histórico adicionais. Não executar down destrutivo nem apagar registros obrigatórios. Um rollback editorial não reativa consentimento revogado. Segredos de teste, banco local, builds e traces não entram no Git. Pushes são checkpoints de fonte: guard em preinstall/prebuild recusa Cloudflare Builds/Pages padrão e CI do repositório não publica em push. Configurações externas que ignorem lifecycle não foram auditadas integralmente.
