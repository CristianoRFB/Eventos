# ADR-005 — Repositório autorizado e início da execução local

**Status:** ACEITO para destino e desenvolvimento local; decisões de stack continuam sujeitas à PoC.  
**Data:** 2026-10-14 (`America/Sao_Paulo`).  
**Baseline Git:** `b90ece62e0d3c893dc6e95d6643fa7505dd25602`.

## Contexto e autorização

O GOAL MASTER cita `CristianoRFB/Eventos-77` como destino ainda a confirmar. O checkout disponível pertence a `CristianoRFB/Eventos`. Após a divergência ser apresentada, o usuário respondeu expressamente:

> Usar esta pasta e o repositório Eventos, na branch codex/eventos77-full-system

Essa resposta substitui apenas o destino proposto no briefing. A implementação autorizada ocorre em `C:\OpenSSL\set\Eventos`, origin `https://github.com/CristianoRFB/Eventos.git`, branch `codex/eventos77-full-system`. O TXT fornecido e a solicitação de executá-lo como goal autorizam código local, fixtures sintéticas, migrations locais, verificações e checkpoints locais conforme seus limites. A divergência de nome não é mais um bloqueio.

O usuário também disponibilizou os consoles Firebase e Cloudflare nos navegadores integrados e pediu publicação futura em subdomínio de Workers, acrescentando: “mas por enquanto se foque em desenvolver o sistema”. Não há evidência de recurso cloud criado por esta execução. A disponibilidade de uma sessão no console não prova configuração, banco, acesso de runtime, migração, custo aprovado ou deploy.

## Decisão

1. Desenvolver neste checkout e nessa branch, preservando o baseline e as alterações simultâneas dos agentes deste goal.
2. Preservar `docs/versions/v0.1.0-architecture/` como histórico de design. ADR-001 a ADR-004 continuam documentando proposta de stack e invariantes; não reescrever a história como runtime.
3. Preservar tenant = organizadora, entidades event/edition distintas, isolamento server-side, publicação por snapshot, host público separado de autenticação administrativa e um deploy por ambiente.
4. Iniciar F1 local. A compatibilidade de auth e a função exata de Firebase deverão ser demonstradas e documentadas antes de afirmar integração. A preferência D1/Drizzle/R2 do briefing permanece sujeita a prova; qualquer substituição relevante exige ADR técnico próprio.
5. Preparar publicação futura em `workers.dev`, sem afirmar que ocorreu. Revalidar escopo, configuração, dados, custo e segurança antes da ação concreta. Não inferir autorização para serviço pago, Cloudflare for SaaS, domínio de terceiro, DNS, R2/D1 reais, usuários reais, email, GitHub remoto ou produção a partir da presença dos consoles.
6. Manter preço, quotas e trial Eventos 77 como `NOT_APPROVED`. Nenhuma proteção de segurança depende de plano.

## Consequências e rollback

Os próximos agentes podem continuar o código sem reabrir a pergunta de repositório. Evidências distinguem baseline, working tree e commit de implementação. F0 só passa após documentação/stack/checks concretos; F1 só passa após PoC no Worker e sua suíte. Recursos reais e produção continuam sem prova até gates externos. Reverter apenas commits novos identificados após revisar alterações locais; não usar reset destrutivo, limpeza do checkout, force push ou substituição de worktree.

## Referências

- [Fonte executável preservada](../../codex/CODEX_GOAL_MASTER_EVENTOS_77_FULL_SYSTEM.txt)
- [Estado atual](../CURRENT.md)
- [Status da execução](../implementation/MASTER_EXECUTION_STATUS.md)
- [ADR-001](ADR-001-cloudflare-worker-d1.md), [ADR-002](ADR-002-tenant-domain-and-edition.md), [ADR-003](ADR-003-global-commercial-standard.md), [ADR-004](ADR-004-editions-publishing.md)
