# QA e aceite — demo K-Dream / VERSO Live

Data: 2026-11-06 · Ambiente: Cloudflare Worker isolado `77-kdream-eventos-conceito.on7.workers.dev`

## Evidências de execução
- Cloudflare API: upload de Worker ES module bem-sucedido; subdomínio `workers.dev` habilitado; deployment registrado com 100% de tráfego.
- HTTP live, via ferramenta de leitura externa: `/`, `/programacao`, `/inscricoes`, `/credenciamento`, `/gestao`, `/parcerias` retornaram HTML válido, sem erro de transporte.
- HTTP `/health`: `{ "ok": true, "project": "verso-live-kdream", "mode": "demo", "routes": 6 }`.
- Validação do JavaScript do cliente: parse bem-sucedido.
- Teste de fluxos em DOM simulado com armazenamento local em memória: 6 visões renderizaram, formulário de participante gravou registro fictício, registro surgiu no credenciamento, check-in atualizou, proposta fictícia surgiu na gestão, evento criado começou como rascunho oculto ao público e apareceu após publicação local. Todos esses asserts passaram.
- Revisão estática de CSS: media queries em 350, 660, 830 e 1050 px; foco `:focus-visible`, etiquetas de formulário, `prefers-reduced-motion`.

## Limites do aceite
**APRESENTÁVEL COM LIMITAÇÕES EXPLÍCITAS.** A verificação de screenshots/browser E2E visual não foi concluída; as telas não foram testadas em dispositivos físicos. Leitor de conteúdo externo retorna o HTML inicial antes da hidratação JavaScript, não a tela já renderizada. O comportamento foi validado por simulação de DOM, não por Playwright remoto.

Não há backend, login, integração Doity, QR de acesso real, envios ou pagamentos. Nenhum dado de K-Dream alterado. As programações e atividades são fictícias; data/local do K-Dream Experience derivam da página pública Doity, sujeita a atualização independente.

## Próximos requisitos para produção real
Confirmar interesse e escopo, autorização de identidade/mídia, autenticação e RBAC, persistência/consentimento LGPD, integração com vendas/inscrições quando autorizada, testes E2E reais mobile/desktop e aceite da organização.
