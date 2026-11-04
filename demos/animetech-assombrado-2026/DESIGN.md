# DESIGN — AnimeTech Assombrado (demo conceitual independente)

**Data:** 2026-11-04 · **Natureza:** demo pública não oficial sem uso de logotipo e sem autorização de marca presumida.

## Brief e estratégia
- **Personalidade:** misteriosa, energética, acolhedora.
- **Públicos:** visitantes, expositores/Artist Alley, equipe/portaria e organização.
- **Problema principal:** programação e informações de expositores distribuídas por peças de divulgação, enquanto controle de entrada e acompanhamento operacional podem se beneficiar de um painel único.
- **Proposta visual:** editorial noturno de cultura geek com cartões de cores contrastantes, arte geométrica original em CSS (lua/orbitais), títulos amplos e UI compacta de operação.
- **Prioridade:** roteiro pessoal de atrações; complementar ferramenta de ingressos, nunca copiar/substituir integração de bilheteria vigente sem validação.

## Tokens / decisões
- Canvas `#120f19`, surface `#1e1829`, ink `#1b1721`, paper `#f8f1e6`.
- Accent `#f6a553`, highlight `#d8ff9d`, hairline `#42364d`, muted `#bbb1c4`.
- Fonte Space Grotesk (títulos), DM Sans (leitura), fontes de fallback.
- Grid de 1220 px, padding adaptativo 18–28 px e pontos de quebra 1050/750/390 px; mobile com navegação inferior e cabeçalho rolável.
- Toques primários >= 43/48 px; foco visível, labels associados, `aria-live`, CSS `prefers-reduced-motion`.
- Sem logotipos, fotos de terceiros, tracking, API ou dados de clientes.

## Ambientes
1. `/` — landing editorial com data/local publicados, descoberta de atrações e CTAs.
2. `/programacao` — programação **fictícia** com busca, filtro, favoritos e roteiro salvo localmente.
3. `/expositores` — cadastro **fictício** de interesse em estande, vitrine local e triagem no painel.
4. `/equipe` — validação de quatro credenciais **fictícias**, bloqueio de duplicidade e reinício.
5. `/gestao` — indicadores **fictícios/derivados dos testes**, criação/remoção de atividades e triagem local.

**Persistência e limitações:** localStorage do navegador (não há servidor de dados nem sincronização entre dispositivos; abas do mesmo navegador podem refletir mudanças pelo evento storage). Não comercializa ingressos, não envia solicitações, não faz QR real, não integra Sympla e não contém autenticação operacional de produção.

## Checagem executada
- Cloudflare Worker publicado e subdomínio workers.dev habilitado.
- URL de cada uma das cinco visões acessada por navegador de leitura externo e conteúdo renderizado.
- Código JavaScript inline submetido ao parser JS sem erro sintático.
- **Não realizado:** auditoria visual com capturas em larguras 320/360/390/430/768/1024/1440; testes de leitor de tela e interação manual ponta a ponta. Verificar isso antes de uso real.

## Evolução para produto
- **GLOBAL:** tema por configuração, aviso DEMO, design tokens, fronteiras de permissões.
- **VERTICAL EVENTOS:** edição, programação, expositores, credenciamento, organização.
- **LOCAL:** data/local confirmados, atrações/horários oficiais após validação, identidade visual autorizada.
- Necessários antes de produção: autorização da organizadora, autenticação RBAC, banco isolado, backend para ingresso válido, consentimento LGPD, testes de fraude/duplicidade e integração de bilheteria autorizada.
