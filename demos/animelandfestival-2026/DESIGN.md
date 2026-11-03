# DESIGN — Anime Land Festival / conceito não oficial
Data: 2026-11-03
Contexto observado: perfil @animelandfestival no Instagram informa Sorocaba/SP e 15/11/2026; 8.807 seguidores no print. Referência pública de edição de agosto: https://agendasorocaba.com.br/panoramico-power-center/anime-land-2/
Hipóteses: calendário digital, credenciamento e inscrição de expositores poderiam reduzir troca de mensagens e filas. A agenda, horários, serviços e dados operacionais da demo são fictícios.

## Objetivo
Mostrar em menos de 90 segundos um fluxo de visitante -> passe fictício -> equipe -> check-in, e expositor -> candidatura -> gestão -> atualização de status, com programação editável.

## Direção de arte
Editorial, enérgica, contemporânea. Sem logotipo oficial, sem imagens da organização, sem personagens de terceiros. Formas geométricas CSS originais.
Tokens: canvas #f7f5ec, surface #fffefa, ink #171b19, primary #c5f46c, accent #fc8068, secondary #f6cb60, muted #647067, hairline #d9dccf, success #dcf2c9, error #fae0df.
Tipografia: system-ui e Georgia, sem dependências externas.
Grade: 1280 px desktop; 1020/680/360 breakpoints; mobile first no objetivo de 320–430 px; seções com boa respirabilidade.
Interações: salvar atividades, filtrar agenda, gerar/imprimir/excluir passe, simular check-in e reversão, simular candidatura e aprovação/recusa, ocultar/exibir programação.
Motion: 160–200ms para hover e toast, desabilitado com prefers-reduced-motion.
Persistência: localStorage no mesmo navegador. Não há backend, pagamento, e-mail ou envio de dados.
Acessibilidade: navegação por botões, foco visível, rótulos em formulários, aria-pressed, aria-live, contraste textual.
Limites: não oficial; atividades/horários demonstrativos; nenhuma ação real em sistemas do evento.
