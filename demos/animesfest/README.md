# AnimeSFest — demonstração de pré-venda (não oficial)

**Status:** PROTÓTIPO INTERATIVO DEMO · sem cliente contratado · sem backend · sem autenticação real · sem dados pessoais reais.

## Objetivo

Validar a oportunidade de um site para organizadora de eventos com três jornadas:

1. **Público:** landing editorial de cultura geek/pop, memória da 3ª edição 2026, canais oficiais, busca e filtros da vitrine de expositores.
2. **Expositores:** candidatura simulada com categoria, cidade, descrição, tipo de estrutura, aceite de regras e ciência de que a operação não é real. Recibo ilustrativo.
3. **Admin DEMO:** painel totalmente fictício com fila de candidaturas, aprovação, solicitação de ajustes, restauração da demo e reflexo instantâneo dos aprovados na vitrine pública.

## Contexto confirmado e limite

- Perfil público: https://www.instagram.com/anime.sfest/
- Formulário público compartilhado: https://docs.google.com/forms/d/e/1FAIpQLScNHDgDdtK0G1bQNwmcPLcYWBrT7IUWM_bA2_uyWZHTxQYq2g/viewform
- Título público do formulário: "Inscrições • Lojistas & Artistas - 3° Edição 2026". Regras públicas resumidas na UX, sem reproduzir integralmente o documento.
- Edição do evento em Santa Fé do Sul em 20 de setembro de 2026, com cosplay, K-pop, games e feira geek, conforme cobertura local: https://www.informamais.com.br/Site/Paginas/AnimesFest-2026-sera-realizado-em-Santa-Fe-do-Sul-com-atracoes-para-fas-de-animes-games-e-cosplay/10316
- Não há confirmação de edição futura agendada ou inscrições abertas. A edição 2026 já aconteceu na data da demonstração.
- Não afirmar patrocínio, aprovação, integração ou contratação. Identidade visual e ilustrações abstratas são propostas originais, não cópias de posts/logotipos/fotografias oficiais.

## Arquivos

- index.html: 3 experiências interligadas e nota pública de não oficialidade.
- demo.css: layout responsivo para 320–1440 px, tipografia, componentes e redução de movimento.
- demo.js: persistência somente em sessionStorage, dados fictícios e relações entre cadastro → admin → vitrine.
- Sem Node, npm, tokens, backend, banco, e-mails, cobranças, segredos ou requisições externas de submissão.

## Teste manual

Com servidor estático nesta pasta, abrir a raiz e navegar:
- Público: ?view=inicio
- Diretório: ?view=lojas
- Cadastro: ?view=inscricao
- Painel de demonstração: ?view=admin

Fluxo de 90 segundos:
1. Abra "Quero expor", preencha nome e descrição fictícios, aceite duas declarações e envie.
2. Abra o "Painel demo": a candidatura aparece como "Pendente".
3. Selecione e clique em "Aprovar".
4. Abra "Explorar lojas": o expositor aparece e pode ser encontrado na busca.
5. Teste filtros, solicitação de ajustes, navegação e "Restaurar dados demo".
6. Verifique versão mobile com menu e formulário em 320, 360, 390, 430 px.
7. Experimente conteúdo com tags HTML nos campos: a interface deve exibir texto escapado, jamais executar markup.

## Segurança e limites

- Nunca usar dados pessoais verdadeiros: valores inseridos ficam temporariamente em sessionStorage; outra aba/sessão pode possuir estado independente.
- Admin sem login somente nesta simulação isolada e sem backend. Em produto real autenticação e RBAC devem ser validados no servidor.
- O formulário oficial existente é referenciado, não substituído e não recebe submissões nesta demo.
- Uma URL de preview não comprova autenticação, persistência multiusuário, LGPD ou homologação.

## Integração futura ao produto canônico

Experimento independente que não altera rotas existentes. Funções reais devem ser absorvidas pelo aplicativo Eventos 77 com organização como tenant, evento/edição separados, Better Auth, RBAC server-side, D1 e formulários versionados. Regras, aceite, privacidade, retenção e política de publicação precisam aprovação explícita da organizadora.

**Critério de apresentação:** proposta não oficial, sem alegar sistema completo, integrado ou autorizado para inscrições reais.
