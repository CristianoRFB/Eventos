# ADR-008 — Formulários versionados e candidaturas privadas

Data: 2026-10-20. Estado: implementação local parcial, sem aceite de produção.

Cada formulário pertence à organizadora e edição. Definições e perguntas são imutáveis; o CMS publica uma referência exata à versão. Abrir recebimento não publica formulário. A submissão valida a definição publicada, prazo e estado no servidor, com gravação atômica, chave de idempotência e limite operacional de 10 solicitações por minuto por formulário/IP hashado. Esse limite protege o serviço e não representa plano comercial.

Respostas e perfil proposto são cifrados por AES-GCM, com chave derivada por organizadora e contexto autenticado de submissão/definição. O segredo local de autenticação é a raiz da derivação; rotação e recuperação de chaves precisam de solução e teste antes de dados reais. O recibo opaco é armazenado somente como hash e tem expiração limitada à retenção e a 14 dias. Respostas privadas não aparecem no recibo nem no snapshot público. A comparação privada usa a extensão timingSafeEqual do runtime Workers e falha fechada se indisponível.

Aceite de análise privada e opt-in de listagem são escolhas separadas. Aprovação por staff não publica perfil. Uma ação explícita prepara apenas os campos públicos no rascunho; publicação exige o fluxo CMS existente. Fontes de perfis são revalidadas ao publicar e servir o snapshot. Retirada remove os cifrados e revoga a listagem imediatamente, inclusive em snapshots anteriores. Páginas com formulários ou perfis vinculados não usam cache público. Auditoria não contém respostas, emails nem tokens de recibo.

Retenção é um valor informado pela organizadora, sem padrão comercial inventado. O exemplo de 30 dias é exclusivamente sintético. Expiração bloqueia acesso/listagem, mas a rotina de purga por retenção ainda não existe: não utilizar dados reais antes de implementá-la. Anexos privados, resposta do candidato a pedido de informações, exportação mínima auditada, testes completos de expiração e recuperação de chaves continuam pendentes. Mensagens externas permanecem desabilitadas.

Migration `0005_cuddly_legion.sql` aplicada apenas no D1 local, acrescentando oito tabelas e constraints de escopo/imutabilidade. Rollback seguro preserva banco e histórico, reverte código por commit e fecha recebimento; não executar down destrutivo nem remover registros privados obrigatórios. Não foi feito deploy ou alteração de dados cloud.


## Adendo de implementação — 27/10/2026 (branch de chat, aguardando CI)

A rotina `purgeExpiredSubmissions(db, now, batchSize)` foi adicionada ao código na branch de chat. Ela seleciona apenas submissões com `retention_until <= now` e estado ativo/retirado, limita a operação a 100 itens por invocação, e executa cada limpeza em lote transacional do D1. A rotina anula `answers_ciphertext`, `profile_ciphertext` e `listing_opt_in`, marca `state='purged'`, remove `applicant_message` da candidatura vinculada, e emite evento `retention.purged` sem PII com ID determinístico. Preserva históricos de evento e `public_profile_sources` imutáveis para que perfis já publicados continuem bloqueados pela validação de consentimento. Não exclui arquivos R2 (anexos ainda não foram implementados).

O Worker expõe um handler `scheduled`, **mas nenhum cron foi habilitado** no `wrangler.jsonc` ou em Cloudflare. Logo, purga automática hospedada NÃO está ativa. O novo teste SQLite usa as migrations reais para provar A/B, datas, execução repetida, mensagens redigidas e seleção em lotes; até a conclusão do CI, os testes desta branch permanecem NÃO VERIFICADOS. O hash do recibo, hashes de idempotência/payload e metadados de auditoria permanecem para integridade do histórico; a política de minimização/anonimização desses pseudônimos e o scheduler de produção exigem revisão antes de aceitar dados reais.

A limpeza não equivale a `F6 PASS`: ainda faltam anexos privados, resposta a pedidos de informação, exportação mínima auditada e plano de rotação/recuperação de chave.
