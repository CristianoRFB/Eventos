# Animatsuri Canoas — demo conceitual independente (04/11/2026)

**Natureza:** pré-venda; lead ainda não é cliente; não há vínculo nem autorização de marca.
**Ambiente:** https://77-animatsuri-canoas-2026-demo.on7.workers.dev/
**Origem do código:** `index.html` nesta pasta. `worker.js` é uma alternativa que embute a página; o Worker efetivamente publicado busca o HTML versionado no GitHub (CDN) e não processa dados pessoais.

## Evidências do screenshot disponibilizado
- Perfil Instagram `@animatsurirs`, festival de cultura geek em Canoas/RS.
- Publicação de edição para **22/11/2026**, localização na **Associação Pestalozzi / Canoas**, conforme perfil e artes visíveis.
- Há três links independentes de inscrições: apresentações de Genshin Impact, apresentações K-pop e desfile cosplay livre.
- Histórico de posts indica atividade recente. Não há prova pública suficiente de faturamento, orçamento, equipe técnica, volume de inscrições ou existência de sistema interno.

## Hipóteses de valor, não alegações do negócio
1. Consolidar três processos de inscrição e informações num só endereço, sem retirar os Formulários oficiais sem consentimento.
2. Reduzir conferências manuais no credenciamento com busca e marcação de status.
3. Dar à organização visão consolidada das modalidades e filas.

**Prioridade comercial: MÉDIA-ALTA** para qualificação inicial: problema demonstrável e evento próximo; orçamento e necessidade operacional ainda desconhecidos. Não ofertar integração/contrato sem descoberta.

## Design brief
- Identidade criativa **não oficial**; não usa logotipo, fotografias, tipografia proprietária nem artes do evento.
- Adjetivos: **editorial, vibrante, acolhedor**.
- Paleta: azul-escuro `#111827`, papel `#f6f4ef`, coral `#eb6247`, dourado `#f6c977`, textos `#162033`.
- Tipografia: sistema do dispositivo; espaço 4/8/12/16/24/32/48/64; raios 12-20px.
- Mobile-first 320-430px, tablet e desktop 1440px; botões 44px+, foco visível e reduced-motion.
- Sem imagens de terceiros: grafismos CSS originais.
- Ação principal: selecionar modalidade, criar inscrição fictícia, visualizar e fazer check-in na mesma aba/navegador.

## Ambientes
- `?view=publico`: apresentação, data/local indicados, atividades e acesso às inscrições.
- `?view=inscricoes`: formulário acessível de dados estritamente fictícios e código `D-...`.
- `?view=equipe`: busca, filtro, status e confirmação/estorno de check-in.
- `?view=gestao`: totais a partir dos dados DEMO, pausas/aberturas por categoria, exportação CSV e restauração.

## Limites e segurança
- Persistência **localStorage por navegador**, não há backend, logins, pagamento, WhatsApp automático nem mensagens para a organização.
- Gestão e equipe abertos **somente porque o ambiente é uma simulação**. Não reutilizar como autenticação de produção.
- Ao abrir em outro dispositivo, cada pessoa verá o próprio conjunto de dados fictícios. Não há sincronização entre aparelhos.
- Horários, regras finais de entrada, capacidade e valores: **não verificados**; não inventar.
- Não coletar informações reais; o formulário instrui nomes fictícios.

## Verificações
- Código JavaScript compilado sem erro de sintaxe (V8).
- Renderização lógica executada para 4 views e respectivos conteúdos.
- URL Workers e HTML de origem acessíveis, verificados por leitura externa.
- Fluxo real com navegador e screenshots responsivos: **não executado**; conta de automação web não dispõe de saldo. Fazer teste manual em dispositivos antes de proposta final de implantação.
