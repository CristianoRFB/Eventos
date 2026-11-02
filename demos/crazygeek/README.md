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
