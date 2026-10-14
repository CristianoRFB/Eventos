# Requisitos verificáveis

## Regras de invariantes
R1 — Um usuário pode ter memberships em mais de uma organizadora, mas nenhum acesso por associação implícita.  
R2 — Todas as mutações privadas exigem session+membership ativa+role+escopo do recurso+tenant ativo.  
R3 — Evento pertence a uma organizadora; edição pertence a exatamente um evento daquela mesma organizadora.  
R4 — Um hostname normalizado só pertence a UM binding verificado/ativo. A ausência resulta em 404/421, nunca tenant default.  
R5 — Site público lê somente uma revisão imutável aprovada/publicada.  
R6 — PlanCatalog não pode liberar funcionalidade que ainda não existe. Segurança básica não depende de plano.  
R7 — Não executar deploy, DNS, billing ou migração sem gate humano.  
R8 — Formulários não precisam de dados pessoais além do mínimo de sua finalidade; registrar consentimento/documentação da base legal aplicável.  
R9 — Nenhum cliente exige fork, ambiente Firebase ou Worker próprio. Um ambiente por estágio, muitos tenants.  
R10 — Links de ingressos são integrados como referência externa; preço e pagamento do ingresso não são operados pela plataforma no MVP.

## Critérios de MVP
A. Platform Owner provisiona Org A e B (fixtures) com status e owner sem código por cliente.  
B. Cada owner cria dois eventos, suas edições e um site publicado; agenda/FAQ/guests do tenant A não aparecem em B.  
C. Editor programa atividades com detecção de conflito de palco/horário.  
D. Host próprio verificado aponta para destino correto e não vaza sessões.  
E. Novo conteúdo permanece privado antes de publicar; rollback editorial reproduz revisão anterior.  
F. Expositor envia formulário habilitado; staff revisa e lista publicamente apenas dados autorizados.  
G. Publicação retorna SSR com canonical/OG/robots/sitemap adequados ao hostname.  
H. Testes unitários, auth/RBAC, integração D1/R2, E2E, segurança, acessibilidade e smoke aprovados.  
I. Documentação real pós-implementação, SVGs Mermaid renderizados e screenshots PC/mobile.

## Priorização
NOW = fundação segura + domínio (ao menos manual verificado), CMS/SSR, agenda, convidados, expositores, produção e teste. NEXT = relatórios, notificações, reviews/editoria mais avançada, automação DNS total e plano comercial conforme decisão. DEFERRED = gateway, bilheteria interna, fiscal, marketplace, app nativo.
