# Votu Otaku Fest — proposta de demonstração independente

**Status:** conceito não oficial, sem vínculo com Votu Otaku Fest. Edição 2027 anunciada no Instagram como "LOADING"; sem data/local/preço oficial de 2027 verificado nesta pesquisa (2026-11-01).

## Pesquisa / decisão comercial
- Instagram fornecido: https://www.instagram.com/votuotakufest/ (prints de 2026-11-01; legenda de patrocínio e convite a expositores).
- Site próprio: https://www.votuotakufestoficial.com/ (Wix com galerias, loja, formulário, membros, contato).
- Última edição documentada: https://www.votuotakufestoficial.com/event-details/votu-otaku-fest-edicao-10-anos-2-0 (17/05/2026, Votuporanga; ingressos encerrados). Os +972 convidados são somente da página dessa edição, NÃO o público total.
- Imprensa: https://diariodevotuporanga.com.br/votu-otaku-fest-celebra-10-anos-e-transforma-votuporanga-em-palco-da-cultura-geek/
- Não assumir que a bilheteria Wix é problema; o negócio já tem venda digital. Propor **captação e gestão de patrocínios/expositores**, apresentação mobile da edição 2027 e centralização de demandas potencialmente espalhadas por DM, sem afirmar que isso ocorre de fato.

## Hipóteses de negócio
Posts recrutando patrocinadores/expositores mostram demanda por parcerias B2B. Hipóteses a validar: (1) triagem em DMs pode gerar retrabalho; (2) lojistas podem querer informações e retorno estruturados; (3) público pode gostar de página clara de informações confirmadas. Nenhuma dor foi confirmada pela organização.

## Visões funcionais
1. ?view=visitar — conceito de portal, temas culturais, CTA e acesso a canais oficiais. Sem atrações, data, local, lote ou preço de 2027 inventados.
2. ?view=participar — três modalidades de interesse não oficial e formulário acessível que somente aceita email fictício @example.test, sem envio de rede.
3. ?view=gestao — painel inteiramente fictício, sem senha porque não há backend: busca, filtro, atualização de status e reset. Entradas do formulário surgem na mesma sessão.

Sem persistência de servidor: exemplos em sessionStorage (mesma guia; durabilidade dependente do navegador), sem integração com Wix. Uma nova guia/navegador não vê a mesma sessão. Nenhum WhatsApp, email, PIX, ingresso ou contato real é processado.

## Execução e teste
O projeto é estático, sem dependência de runtime. Na raiz do repo, executar: python3 -m http.server 4179 --directory demos/votuotakufest ; abrir http://localhost:4179/?view=visitar
Com o servidor ativo, Chromium instalado e dependências do repo: node demos/votuotakufest/smoke.mjs
Smoke em 390 e 1440px: navegação, inscrição fictícia, painel, alteração de status, ausência de JS errors e overflow horizontal. Workflow separado: .github/workflows/vof-preview.yml

## Segurança, marca, produção
- Não contatar automaticamente o email ou telefone do evento.
- Não introduzir dados pessoais verdadeiros na demo.
- Nenhum logo, foto ou criativo oficial foi copiado; símbolo CSS e wordmark são interpretação independente.
- Contratação requer permissão de marca e conteúdo, fontes oficiais, escopo, tenant com RBAC real, formulários oficiais, consentimento, política de retenção, suporte e valores aprovados.
- VERTICAL Eventos: expositores/patrocínios. LOCAL VOF: linguagem visual e conteúdo. GLOBAL: UX/aviso DEMO/estado acessível.
- Preview público, caso exista, é independente do SaaS e não usa D1.

## Roteiro em 60 segundos
Abra Visitantes, mostre o estado "edição em preparação". Vá a Participar, selecione Patrocinador, use dados inventados, confirme. Abra Gestão, encontre a candidatura fake e altere para "Em conversa". Explique que numa contratação seriam necessários autenticação e armazenamento reais autorizados, não presentes neste exemplo.
