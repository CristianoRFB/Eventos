# Demo conceitual — Anime Land (Sorocaba)
Quatro ambientes: Visitante (`?view=publico`), Expositor (`?view=expositor`), Equipe (`?view=equipe`) e Gestão (`?view=gestao`).
Worker isolado: `77-animeland-festival-conceito` em `on7.workers.dev`.
Caráter: DEMO_INTERATIVA_EFEMERA, com persistência apenas via localStorage e interações entre visões no mesmo navegador.

## Prova de valor
1. Visitante filtra agenda, favorita atividade e cria passe ilustrativo.
2. Equipe identifica código AL-XXXXXX e simula check-in, com desfazer.
3. Expositor envia inscrição fictícia e acompanha situação.
4. Gestão aprova/recusa candidatura e edita visibilidade das atrações, refletindo na visão pública.
5. Impressão de credencial e reset de dados são recursos da simulação.

## Segurança e procedência
Não utilizar em operação real. Sem logomarca, fotos ou artes oficiais, sem compra, cadastro, dado compartilhado entre usuários, autenticação, ingressos válidos ou disparos externos. Data/cidade observadas no print do perfil `@animelandfestival`; os demais itens são ilustrativos.
Código do Worker autônomo, isolado da base canônica Eventos 77. Antes de produção integrar tenant organizer, editions, public sessions e RBAC server-side.
