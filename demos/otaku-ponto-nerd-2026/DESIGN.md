# Circuito Geek — conceito para Otaku Ponto Nerd Group

## Origem e premissas
Print do Instagram @otakupontonerdgroup de 04/11/2026 indica games, cosplay, rádio, eventos e parcerias; postagem mostra chamada para inscrições em desfile cosplay. Evento, organizadora, valores, estrutura e vínculos não foram confirmados em fontes oficiais. **Este é um protótipo independente, sem afiliação, uso de identidade visual ou logotipos da empresa.**

## UX / Direção de arte
- Direção: enérgica, organizada, acolhedora. Público: visitantes e cosplayers; equipe no check-in; gestor da edição.
- Essência: `menos links, mais experiência`; foco no fluxo programação > inscrição > credenciamento > gestão.
- Paleta: canvas #f5f3ec, ink #171a20, primary #ddff64 (sobre fundo escuro), accent #675bff, surface #ffffff; texto secundário #6e716e. A tipografia é Space Grotesk + DM Sans, com fallback system-ui.
- Hero editorial com ticket abstrato desenhado em CSS, sem marca ou imagens de terceiros; botões grandes, estados de foco, filters e feedbacks.
- Layout: grid fluido, breakpoints 960 e 620, 320–1440px, reduced-motion, scroll controlado, elementos de toque 44 px.
- Rotas: `/publico` (programação e inscrição por apelido), `/operacao` (busca e check-in), `/gestao` (contadores e agenda editável).
- Dados exclusivamente fictícios e locais no browser (`localStorage`), compartilhados entre três visões **no mesmo dispositivo**. Nada é enviado ao servidor, nenhum ingresso/credenciamento real é gerado.

## Escopo / limites
- Reusável: padrões de UI de público/equipe/gestor, agenda, registro e credenciamento.
- Para integrar à vertical de eventos: autenticação, RBAC, tenant/edition, persistência, formulários regulamentados/consentimento, tickets/QR verificados, checks de capacidade, auditoria, performance e testes.
- Fora do escopo: cobrança, bilhete válido, dados pessoais reais, marca oficial, envio de mensagens, sincronização entre dispositivos.

## Publicação
Worker único de demonstração `77-otaku-ponto-nerd-eventos-demo` sob subdomínio `on7.workers.dev`, sem tocar produção.

## Aceite / QA
Revisão de código: rótulo visível de DEMO; fluxo de inscrição/credenciamento/painel em uma sessão; nenhum segredo ou acesso real. Teste de navegador e QA visual devem ser registrados conforme ambiente de teste disponível.