# DESIGN — Leonardo Senna (DEMO NÃO OFICIAL)
Data: 04/11/2026
Lead: @sennaroubacena; perfil verificado conforme captura enviada, cerca de 176 mil seguidores e 637 posts no print; possível criação de conteúdos de gastronomia, universo geek e entretenimento.
## Premissas e limites
Criador de conteúdo e embaixador de marca, sem confirmação de propriedade ou organização de Geek Ribeirão Fest. Nenhuma marca, logo, foto ou peça do Instagram incorporada ao código. Não confundir com ator homônimo encontrado em resultados de busca.
## Objetivo
Demonstrar valor em 90 segundos: visitante conhece o perfil > marca simula proposta > gestão observa pipeline e move etapas.
## Arte
Personalidade: editorial, vibrante, autêntica. Direção criativa original; não é identidade oficial. Canvas #f5f3ea; night #10110f; ácido #d5fc68; lilás #ad9cff; rosa #f4a7c2; conteúdo responsivo com contraste. Tipos de sistema (Impact para display e system UI para leitura). Sem assets externos.
## Navegação
/ público/editorial com referências a categorias de conteúdo, métricas da captura datadas e CTA.
/marcas hipóteses de formatos e formulário de proposta fictícia, sem e-mail/telefone.
/studio pipeline com quatro estágios, avanço e reset, calendário e checklist; localStorage somente em browser.
## Responsividade e acessibilidade
Faixas 320–350, 360–680, 680–980, 980+; flex/grid sem dependências, navegação com rolagem em telas compactas, foco visível, skip link, sem cores de baixo contraste no texto principal, reduced-motion.
## Segurança
Dados iniciais totalmente fictícios. Formulário opera somente localStorage e informa explicitamente que não envia. Admin é uma simulação pública, jamais auth de produção. Sem endpoints de gravação, sem tokens, cobrança ou terceiros.
## Integração futura
Este repositório Eventos 77 está DOCUMENTATION_ONLY, sem runtime. Demo independente para futura absorção como módulo criador/marca se houver contrato. A aplicação multi-tenant produtiva requer roles, auth, storage protegido, consentimento e confirmação de escopo.
## Critérios
Routes /, /marcas, /studio HTTP 200; CTA de apresentação abre /marcas; form fictício adiciona no board no mesmo browser; avanço e reset; nenhuma marca ou foto de terceiro.
