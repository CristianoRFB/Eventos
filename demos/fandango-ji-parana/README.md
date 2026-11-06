# FanDango (Ji-Paraná) — demo independente
Prévia conceitual de portal comunitário: **visitante + equipe/check-in + organização**, sem a marca ou logo do FanDango.

**Website:** https://77-animefandango-comunidade-demo.on7.workers.dev/?view=public

**Links de visões:** [visitante](https://77-animefandango-comunidade-demo.on7.workers.dev/?view=public), [equipe](https://77-animefandango-comunidade-demo.on7.workers.dev/?view=team), [organização](https://77-animefandango-comunidade-demo.on7.workers.dev/?view=admin).

Abrir `index.html` no navegador também permite explorar o conceito localmente. O Worker hospedado apenas entrega HTML/CSS/JS estáticos.

## O que funciona
1. Na aba Visitante, clique em **Quero participar**, use um **apelido fictício** e complete a inscrição de teste.
2. Na aba Equipe, busque o identificador e faça o **check-in**.
3. Na aba Organização, veja a contagem, adicione uma atividade fictícia e volte à programação pública.
4. **Restaurar dados fictícios** reverte a experiência.

## Restrições
- Nada é oficial nem é enviado ao FanDango. Inscrições e atividades são exemplos.
- Programação e regras de 2026 não foram verificadas. Somente data e hora do card do print servem de referência, com ressalva no site.
- O estado é guardado apenas no `localStorage` do navegador. Aparelhos diferentes **não sincronizam**. Isso **não é backend real**.
- Sem fotos, mascote, marcas ou dados pessoais reais; sem vendas, pagamentos e credenciais.
- Veja o [design brief](DESIGN.md) para fontes, tokens, fluxos, limitações e testes.

### Integração com Eventos 77
Este demo está isolado em `demos/fandango-ji-parana` porque o repo principal está em fase de arquitetura. Não representa implementação de RBAC, multi-tenancy, banco ou autenticação da plataforma canônica.
