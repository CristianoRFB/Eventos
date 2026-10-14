# Migrações, backup, restore

Projeto greenfield: nenhuma migração de cliente real prevista na concepção. Ao iniciar no Codex: migrations numeradas, estado único e checksum; nunca criar tabelas manualmente em produção. Toda mudança crítica: dry-run em staging, backup lógico de D1, validação de schema/índices, rollback operacional documentado (nem toda DDL é automaticamente reversível).

Provisionamento de tenant e hostname idempotente com chave de tentativa/audit. Seed fica SOMENTE em dev/stage e inclui A/B fictícios. Exports e remoção de dados reais seguem política de retenção e obrigações contratuais/LGPD a validar. Restore deve ser testado, e conteúdo R2 deve ser reconciliado com metadata D1 após recuperação.
