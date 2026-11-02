# DESIGN — Budokai Matsuri Natal/RN
## Evidências e limites
Fonte primária: print enviado de @budokaigeekstore em 02/11/2026. Data 21–22/11/2026, localização Cidade Jardim Shopping e link Meet & Greet confirmados em https://www.sympla.com.br/evento/lgc/3587533. Bruno Sangregório divulgado para 22/11 por https://imaginedublado.com.br/bruno-sangregorio-voz-de-levi-em-attack-on-titan-e-confirmado-no-budokai-matsuri-em-natal/. Luana Stteger divulgada no print. Entrada geral gratuita indicada em listagens públicas, pendente de confirmação organizadora. Nenhum horário de atrações verificado. Sem autorização de identidade/fotos e sem associação contratual.

## Proposta e público
Visitante mobile consulta quando/onde, convidados, atrações e link externo de ingressos. Gestor experimenta atualizar aviso e programação numa simulação segura.
Direção: editorial, energético, cultural; pôster artesanal japonês, preto/vermelho/creme. Cores canvas #100d10, panel #1b1419, ink #fff5ee, primary #f04647, cream #f6eee5, gold #e7c688. Fontes Impact/Arial Narrow em títulos, sistema no corpo. Layout mobile-first, contrastes, foco claro, botões grandes, reduz motion.
Mídia: ilustração geométrica feita em CSS, sem fotos/ilustrações protegidas.

## Três experiências
Portal: datas, convidados, áreas, endereço, FAQ, Sympla e Instagram.
Agenda: seleção local de atividades e alternância de dias. Tudo fictício salvo Bruno anunciado, com legendas explícitas.
Gestão: editar texto da capa, adicionar atividade fictícia, restaurar estado. Persistência somente sessionStorage, sem backend, autenticação, pedidos ou cobrança.

## Critérios
Testar 320/360/390/430/768/1024/1440, no-overflow, CTAs, salvar/limpar, editar/visualizar/restaurar e ausência de script errors. Publicação somente em preview não produtivo, sem misturar tenant real.
