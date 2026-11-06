# EAC — Radar Geek (demonstração independente)

Lead: Instagram @eaccosplay, **EAC - Eventos e Ajuda Cosplay**. Material de prospecção **não oficial**, sem parceria contratual. **Não confundir** com EAC - Expoanime Cariri Fest.

Quatro ambientes integrados na mesma aplicação estática via Cloudflare Worker:
- `/` — descoberta e filtros de eventos fictícios; salvar no navegador
- `/parcerias` — simular pedido e visualizar a proposta no painel
- `/painel` — fila de propostas e agenda: incluir rascunho e publicar localmente
- `/loja` — vitrine editorial ilustrativa, sem preços, compras ou checkout

Sem logos, sem marcas reais no produto, sem backend, sem autenticação e sem mensagens externas. Dados do usuário e simulações **somente no localStorage do navegador**. Não apto para produção.

Publicação conceitual: https://77-eac-comunidade-geek-demo.on7.workers.dev

Código implantável: `index.js` (Cloudflare Worker ES module, sem bindings). Endpoint de checagem: `/health`.

Para produção seria necessário consentimento sobre identidade e conteúdo, verificação de eventos reais, autenticação/RBAC, persistência autorizada, revisão LGPD e aprovação contratual.
