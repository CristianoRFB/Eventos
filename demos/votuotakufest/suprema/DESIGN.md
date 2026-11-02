# VOF 2027 — Direção de arte e UX (demo suprema)

## Status das informações
- CONFIRMADO: nome Votu Otaku Fest, Votuporanga/SP, planejamento 2027, site Wix existente, concursos cosplay/K-pop, interesse em fichas imprimíveis, patrocínios/lojas, galerias de fotos e pagamento via Mercado Pago Pix/cartão com PDF/e-mail na plataforma atual (informação fornecida pelo organizador Daniel).
- FONTE PÚBLICA: site https://www.votuotakufestoficial.com/ e pasta https://drive.google.com/drive/folders/13s-ZzFqJv34tf42Us1zibOtnexmvF-9r (VOF no FLIV 2026).
- DESCONHECIDO: data/local/atrações/preços 2027, regulamento, autorização de imagem, titularidade de domínio e conta de pagamento.
- FICTÍCIO: tickets/preços de exemplo, nomes de patrocinadores, participantes, vendas, status, QR de Pix, emails e checks-ins da demo.

## Ideia de experiência
Identidade em três palavras: **elétrica, editorial, comunitária**.
Ação principal público: experimentar compra simulada de ingresso. Ação principal participante: enviar inscrição fictícia de concurso. Ação principal equipe: imprimir fichas, controlar check-in fictício e gerenciar vitrines.

## Sistema visual
- Canvas: #f6f5f9; noite: #100b24; violeta: #6538db; rosa: #ff3da4; acento cítrico: #d8fb69; ink: #1c1630; muted: #726d80.
- Tipografia: Barlow Condensed 600–900 nos títulos de pôster; DM Sans para controles/textos. Google Fonts em URLs, nenhum arquivo de fonte redistribuído.
- Grid público 1200px máx.; herói composto, cards assimétricos e ticker com redução de movimento.
- Admin: sidebar escura, topbar compacta, KPIs identificados como DEMO, tabelas scrolláveis, ações e filtros claros.
- Fluxo de bilheteria: quatro etapas, sem coleta de cartão e sem QR Pix válido. PDF ilustrativo via impressão do navegador.
- Fluxo concurso: seletor cosplay/K-pop, campos contextualizados, protocolo e impressão em lote.
- Foco/teclado: anel visível; alvos grandes; grid 320/390/768/1440; reduced-motion.

## Fotografias
As fotos selecionadas estão vinculadas diretamente por URL do Google Drive público referenciado pelo site do evento. Origem: álbum 'VOF no FLIV 2026'. Não são republicadas nem garantem autorização de uso comercial. Antes de produção, solicitar expressamente permissão e créditos ao Daniel/fotógrafos. Arquivos podem deixar de aparecer se o provedor bloquear hotlink.

## Arquitetura da demonstração
- Arquivos: index.html, style.css, app.js; Worker de preview da Cloudflare consulta os assets em commit imutável GitHub.
- Dados de sessão em sessionStorage, sem Firebase, sem tenants reais.
- Brevo: a chave está no Cloudflare Worker, não no repositório; endpoint de teste bloqueado até configurar VOF_DEMO_EMAIL_TOKEN. Envio sempre para caixa fixa autorizada e mensagem claramente DEMO.
- Sem pagamento, bilhete real ou inscrição oficial; não copiar o conteúdo da organização para uso produtivo sem aprovação.

## Critérios de aceite
Rotas home/tickets/contests/gallery/admin, compra completa fake, formulário fake, filtros, CSV, impressão, check-in que bloqueia duplicatas, vitrine de parceiros, mostrar/ocultar fotos, emails fictícios, CSS carregado e smoke Playwright com quatro tamanhos de tela. CI e URLs devem apontar para o commit publicado.
