# ADR-008 — Formulários versionados e candidaturas privadas

Data: 2026-10-20. Estado: implementação local parcial, sem aceite de produção.

Cada formulário pertence à organizadora e edição. Definições e perguntas são imutáveis; o CMS publica uma referência exata à versão. Abrir recebimento não publica formulário. A submissão valida a definição publicada, prazo e estado no servidor, com gravação atômica, chave de idempotência e limite operacional de 10 solicitações por minuto por formulário/IP hashado. Esse limite protege o serviço e não representa plano comercial.

Respostas e perfil proposto são cifrados por AES-GCM, com chave derivada por organizadora e contexto autenticado de submissão/definição. O segredo local de autenticação é a raiz da derivação; rotação e recuperação de chaves precisam de solução e teste antes de dados reais. O recibo opaco é armazenado somente como hash e tem expiração limitada à retenção e a 14 dias. Respostas privadas não aparecem no recibo nem no snapshot público. A comparação privada usa a extensão timingSafeEqual do runtime Workers e falha fechada se indisponível.

Aceite de análise privada e opt-in de listagem são escolhas separadas. Aprovação por staff não publica perfil. Uma ação explícita prepara apenas os campos públicos no rascunho; publicação exige o fluxo CMS existente. Fontes de perfis são revalidadas ao publicar e servir o snapshot. Retirada remove os cifrados e revoga a listagem imediatamente, inclusive em snapshots anteriores. Páginas com formulários ou perfis vinculados não usam cache público. Auditoria não contém respostas, emails nem tokens de recibo.

Retenção é um valor informado pela organizadora, sem padrão comercial inventado. O exemplo de 30 dias é exclusivamente sintético. Expiração bloqueia acesso/listagem, mas a rotina de purga por retenção ainda não existe: não utilizar dados reais antes de implementá-la. Anexos privados, resposta do candidato a pedido de informações, exportação mínima auditada, testes completos de expiração e recuperação de chaves continuam pendentes. Mensagens externas permanecem desabilitadas.

Migration `0005_cuddly_legion.sql` aplicada apenas no D1 local, acrescentando oito tabelas e constraints de escopo/imutabilidade. Rollback seguro preserva banco e histórico, reverte código por commit e fecha recebimento; não executar down destrutivo nem remover registros privados obrigatórios. Não foi feito deploy ou alteração de dados cloud.
