# Nipo Fest Araçatuba — DEMO conceitual independente

**Status:** DEMO_INTERATIVA_EFEMERA. NÃO OFICIAL. Nenhuma relação comercial nem autorização da marca foi presumida.

## O que foi pesquisado
- Screenshots do Instagram @nipofest_aracatuba_ e do Biolink fornecidos pelo usuário em 02/11/2026, incluindo "2027 vem aí", 3 modalidades de concurso e ingressos.
- https://nikkeyweb.org.br/eventos/nipofest-26-aracatuba/
- https://calendarionerd.com.br/evento/nipofest-aracatuba-2026
- A edição 2026 ocorreu 17–18/10; não tratar dados daquela edição como confirmação de 2027. O antigo link de ingressos pode não vender ingressos hoje, portanto o conceito remete ao Instagram sem prometer venda.

## Experiências
1. `?view=festival` — identidade conceitual, informações históricas rotuladas, chamada para concursos e canal oficial.
2. `?view=concursos` — inscrição simulada de cosplay, K-pop solo ou grupo. Valida todos os campos, aceita apenas `@example.test` e deixa claro que não envia nada.
3. `?view=gestao` — painel sem autenticação real porque contém **apenas dados fake**: busca por nome/grupo, filtro por modalidade/status, atualização de status e reset. Dados criados na inscrição aparecem no painel dentro da mesma sessão do navegador.

Persistência: `sessionStorage`, apenas na mesma aba/sessão. Não há API, banco, e-mail, WhatsApp, pagamento ou cadastro real. Dados não atravessam dispositivos. O navegador bloqueando sessionStorage volta às fixtures.

## Rodar/testar
```sh
python3 -m http.server 4188 --bind 127.0.0.1 --directory demos/nipofest
# abrir http://127.0.0.1:4188/?view=festival
node demos/nipofest/smoke.mjs
```
Para smoke de browser, instalar dependências da raiz (`npm ci`, `npx playwright install chromium`). O smoke valida 320/390/768/1440 px, inscrição→painel, filtros, estados, navegação e overflow.

O workflow `.github/workflows/nipofest-demo.yml` roda no PR e fornece screenshots reais como artefatos de CI. O código desta demo é independente do backend SaaS e não usa tenants/D1/regras de produção.

## Roteiro comercial de 80 segundos
Abra Festival (clareza e visual), vá a Concursos (três modalidades), envie inscrição **inventada**, navegue à Organização (a inscrição aparece), filtre por concurso, altere status para Em análise e destaque como a operação poderia funcionar após implementação segura. Nunca prometer controle de ingresso ou inscrição oficial.

## Antes de produção
Autorização para a identidade e imagens, fontes e regras oficiais de 2027, fluxos reais de inscrições, política de privacidade/consentimento, segurança por tenant/usuário e plano de hospedagem/aprovação. Nunca implantar o HTML da demo como admin real.
