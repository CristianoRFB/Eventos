# Crazy Geek Fest — Mirassol / DEMO NÃO OFICIAL

**Estágio:** `DEMO_INTERATIVA_EFEMERA` · criação independente para prospecção · sem contato, autorização de marca ou parceria comprovados.

## Fontes
- Prints do Instagram `@crazygeek_fest` e do Linktree entregues em 02/11/2026.
- Linktree consultado: https://linktr.ee/crazygeekfest (galerias e WhatsApp já existentes).
- Instagram oficial: https://www.instagram.com/crazygeek_fest/
- Edição futura, bilheteria, horários, vagas e regras: **não confirmados**.

## O que funciona de verdade
- `?view=festival`: site conceitual com direcionamento a canais oficiais, programação editável do exemplo e arquivo ilustrado de edições históricas.
- `?view=participar`: simulação de interesse de artista/expositor/cosplay com validação e e-mail obrigatório `@example.test`.
- `?view=gestao`: busca, filtro, mudança de status, cadastro e remoção de programação e botão de restaurar fixtures.
- Estado local: `sessionStorage`; alterações refletidas ao navegar entre vistas **neste mesmo navegador/sessão**. Não existe banco, senha real, e-mail, WhatsApp, cobrança nem inscrições reais.
- Toda arte visual é original em CSS, sem copiar imagens de terceiros.

## Teste
```sh
python3 -m http.server 4189 --bind 127.0.0.1 --directory demos/crazygeek
node demos/crazygeek/smoke.mjs
```
O smoke usa Playwright (`npm ci` e `npx playwright install chromium`) e testa fluxo de participação→triagem, edição da programação, redimensionamento e ausência de overflow/erros JS. CI isolada no workflow `crazygeek-demo.yml` na branch de demo; **não** faz deploy do produto.

## Como apresentar (90 segundos)
Abra o portal e mostre a navegação pelas memórias e pelos links reais; explique o futuro da programação; crie uma participação **com os dados automáticos fictícios**, abra Gestão, filtre o cadastro e altere o status. Adicione "Encontro geek especial (exemplo)", volte a Festival e mostre a atividade surgindo. Conclua: menos links soltos e informações desencontradas, sem substituir redes já existentes.

## Segurança / adoção posterior
- O sistema não é oficial; identidade e fotos precisariam ser autorizadas pela organização.
- Para operação real, desenvolver formulários com consentimento, políticas e acesso protegido por organizadora/edição, RBAC, banco staging/produção, proteção de PII e audit trail.
- Integração na vertical Eventos 77: `GLOBAL` UI/accessibility, `VERTICAL` agenda/participação, `LOCAL` branding de Crazy Geek. Demo separada até aprovação técnica.
- Não alegar publicação, CI verde ou URLs sem verificar no commit e ambiente realmente implantados.

## Prévia pública verificada — 02/11/2026
- **Festival:** https://77-crazygeek-conceito.on7.workers.dev/?view=festival
- **Participar (simulação):** https://77-crazygeek-conceito.on7.workers.dev/?view=participar
- **Organização (somente fixtures):** https://77-crazygeek-conceito.on7.workers.dev/?view=gestao
- Cloudflare Worker isolado `77-crazygeek-conceito`, conta de operação 77, subdomínio `on7.workers.dev`, habilitado em 02/11/2026. **Não altera** D1, banco, domínio ou Worker do produto Eventos 77.
- Upload da página estática, CSS e JS correspondentes ao código na branch neste dia; Cloudflare registra deployment `352d17ae-efd2-4444-877a-732d52bf83ed`, versão `10267578-f197-4a34-b5e5-cb0cd0f4aa6f`, 100% do tráfego, em 02/11/2026. O conteúdo HTML e ambas as rotas Festival/Gestão foram conferidos externamente após o deploy via fetch. Alterações posteriores no GitHub **não** são publicadas automaticamente: exigem novo upload/validação.
- `X-Robots-Tag: noindex, nofollow, noarchive`, CSP restritiva, `nosniff`, sem APIs nem credenciais. Toda inscrição é fictícia, persiste apenas no navegador, sem envio ou notificação.
- **CI específica PASS (Chromium, sete larguras):** https://github.com/CristianoRFB/Eventos/actions/runs/41462541705, SHA `05fa18df801db1b550892e468773686a805415cf`. Screenshots de navegador no artefato `crazygeek-actual-browser-screenshots`.
- **CI geral da vertical não está verde:** `Local quality gates` falhou no SHA citado: https://github.com/CristianoRFB/Eventos/actions/runs/41462541902. A primeira execução da CI da demo não passou por incompatibilidade pré-existente entre `package.json` e `package-lock.json` da aplicação base (faltava `@emnapi/core@1.11.3`). O teste da demo foi posteriormente isolado em `demos/crazygeek/package.json` e passou. Não interpretar esse sucesso como aprovação do SaaS completo.
