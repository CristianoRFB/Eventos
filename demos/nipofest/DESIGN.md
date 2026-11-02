# DESIGN — Nipo Fest Araçatuba / conceito não oficial

## Fontes e premissas (02/11/2026)
- Instagram observado em prints do usuário: @nipofest_aracatuba_; o perfil informa que "2027 vem aí". A bio aponta biolink.info/nipofestaracatuba; a página capturada contém links para ingressos e inscrição de cosplay, K-pop solo e K-pop grupo.
- Edição 2026: 17 e 18/10/2026, Associação Cultural Nipo-Brasileira de Araçatuba, Rua Rintaro Takahashi, 346. Fonte: https://nikkeyweb.org.br/eventos/nipofest-26-aracatuba/ e https://calendarionerd.com.br/evento/nipofest-aracatuba-2026
- O site Biolink não ficou acessível via ferramenta pública; o diagnóstico visual se baseia **exclusivamente no print**. Inscrições e preços de 2027: DESCONHECIDOS.
- Esta NÃO é a identidade oficial, não existe parceria/contato comercial comprovado.

## Tese de produto
Não reproduzir um link-in-bio com botões maiores. Demonstrar uma experiência pública + uma etapa de inscrição simulada + um painel de triagem, especificamente para 3 concursos informados na edição anterior. Coexistir com bilheteria externa real: não criar gateway de pagamento nem inventar integração.

## Direção de arte
Personalidade: **festiva, editorial, cultural**.
Referência cromática: tons de azul/lilás presentes nos materiais fornecidos, transformados em base plum-dark com acentos rosa-sakura e amarelo quente (não clonagem).
Paleta por papel: canvas #120C28, elevated #241945, surface #F8F1FF, primary #FF9FC8, warm #F5E5A7, ink #FEFAFC, muted #C4B9D7, stroke rgba(234,214,255,.2), error #8C3047.
Tipografia: Barlow Condensed 500–900 para títulos expressivos; DM Sans 400–800 para texto e controles; fallback de sistema. Fontes do Google com CSS e fallback; carregamento externo não crítico.
Escala 4/8/12/16/24/32/48/64; grid mobile 1 coluna, desktop 2 colunas no hero/form e 3 nas experiências. Cantos 6–12 px, imagem principal é **ilustração CSS original** (torii / halo / pétalas), sem foto ou logo de terceiros.

## Fluxos
- Público: primeira impressão → entender que 2027 ainda não tem dados confirmados → conhecer experiências históricas → explorar inscrição fictícia ou Instagram oficial.
- Participante: escolher concurso → completar dados **inventados** e e-mail example.test → ver confirmação somente local.
- Organização: navegar registros sintéticos → buscar/filtrar → alterar status e conferir contadores → restaurar fixtures.
- Estado: sessionStorage do navegador; sem API, envio, sincronização entre dispositivos ou autenticação. Sem coleta remota. UI avisa expressamente.

## Microinterações e acessibilidade
Navegação por URL ?view=, painel visível via controles e links, focus-visible, aria-current, aria-pressed, aria-label nos selects dinâmicos, formulário rotulado, validação, alerta de erro, fluxo sem hover, tamanho de clique adequado e respeito a prefers-reduced-motion. CSS 320/360/390/430/768/1024/1440. Scripts podem ser executados com Playwright no workflow dedicado.

## Diferenciação e limites
GLOBAL: aviso não oficial, qualidade mobile e sem PII; VERTICAL: modalidade de concurso/triagem; LOCAL: estética e nomes da Nipo Fest. Na contratação, identidade/mídia/horários/links/termos devem ser validados pela organização. Segurança de equipe, RBAC, hospedagem, formulários oficiais, consentimento, auditoria e bilheteria NÃO foram implementados.
