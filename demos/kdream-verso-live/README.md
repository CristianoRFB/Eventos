# VERSO Live — conceito não oficial para K-Dream Entertainment

Projeto criado no fluxo comercial da 77, em 06/11/2026, no repo canônico `CristianoRFB/Eventos` **sem tocar na main**. O cliente não foi contatado e este demo não é produto contratado.

**Link:** https://77-kdream-eventos-conceito.on7.workers.dev

## Ambientes

1. `/`: página pública, destaque do evento real [K-Dream Experience na Doity](https://doity.com.br/k-dream-experience-1); o restante é conceitual.
2. `/programacao`: atividades fictícias filtráveis, salvamento de favoritos.
3. `/inscricoes`: formulário fictício de participante, geração de código DEMO sem uso real.
4. `/credenciamento`: fila local e check-in simulado (sem autenticação, apenas dados inventados).
5. `/gestao`: editor de agenda com rascunho/publicação local, visão de propostas, reset.
6. `/parcerias`: envio fictício de propostas para painel local.

Persistência: `localStorage` do browser. Mesma máquina/navegador compartilha fluxo. Navegadores diferentes não sincronizam. Não há email, WhatsApp, Firebase, API, compra, ingresso ou dados pessoais reais.

Desenhos 100% CSS/HTML e tipografia do sistema; sem logos de K-Dream, 77, conteúdos de Instagram ou terceiros. Disclaimers em destaque. `/health` retorna JSON para smoke test.

## Critérios de aceite
- GET `/health` -> `ok:true`, GET nas 6 páginas com 200.
- Início exibe dados da Doity corretamente, CTA e link externo com `rel=noopener noreferrer`.
- Programação filtra por categoria; favoritos ficam apenas no navegador.
- Inscrição gera DEMO-... e aparece no credenciamento, onde o status muda e pode ser revertido.
- Editor cria rascunho, que só entra na programação após publicação simulada.
- Formulário de parcerias aparece no painel, onde pode ser movido para Em conversa.
- Responsividade em 320/360/390/430/768/1024/1440; teclado; foco; reduced motion.

## Limites
Não se trata de prévia oficial nem substitui Doity. Exige autenticação e persistência segura para uso real. Não contém integração com a K-Dream. Não mandar propostas reais a partir da demo.
