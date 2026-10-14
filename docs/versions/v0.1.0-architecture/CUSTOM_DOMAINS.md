# Custom domains e Cloudflare for SaaS — design técnico

**O que será suportado:** um ou mais hosts por organizadora, cada um com destino explícito: HOME_ORGANIZATION, EVENT_HOME, CURRENT_EDITION ou FIXED_EDITION. A chave da tabela é hostname normalizado exato (único globalmente), não domínio registrável inferido nem parâmetro livre do browser.

## Resolução a cada requisição
1. Obter autoridade/host da requisição por boundary confiável do Worker; nunca aceitar `X-Forwarded-Host` genérico de visitante sem definição do proxy.
2. Normalizar hostname: lowercase, remover porta permitida, tratar IDNA/punycode e ponto final, rejeitar host inválido/ASCII malformado, limitar comprimento.
3. Hosts reservados `app`, `preview`, `api` têm roteamento fixo sem lookup de público.
4. Lookup EXATO `domains.hostname`; fallback apenas para subdomínio de plataforma explicitamente registrado, nunca para tenant padrão.
5. Validar `domain.status = active`, `cloudflare_hostname_status=active` e `ssl_status=active` onde o host for customizado; checar `org.status` e destino que pertence à mesma organização.
6. Carregar ponteiro de publicação visível, SSR com canonical. Em erro, 404/421/503 sem revelar dados de outro tenant.

## Lifecycle planejado
`requested -> ownership_pending -> tls_pending -> dns_pending -> active -> suspended -> releasing -> released`; failed retorna via retry auditado. Ownership/DNS e SSL são validações DISTINTAS. A Cloudflare considera um domínio pronto quando hostname status + `ssl.status` são active E DNS aponta para a origem correta.

## Provisionamento por fase
**F0–F6:** contrato, resolver local, staging com host reservado; não criar custom hostname externo.  
**F7:** adapter `CloudflareForSaaSProvider` com API declarativa, sandbox/staging autorizado, reconciliador idempotente e triagem de erros.  
**F11:** ativação assistida em cloud real somente após aprovação, com CNAME e validações do cliente. Priorizar `www.customer.com` pela facilidade; apex/root pode exigir o cliente usar provedor com flattening/redirect ou recurso pago de apex proxying. Nunca prometer apex gratuito.

## Segurança de alteração
Não aceitar um domínio já reservado, ativo em outro tenant ou sem prova de titularidade. Suspender a associação antes de excluir hostname cloud. Ao revogar: despublicar site no host, invalidar cache, registrar audit, excluir no provedor após confirmação; cooldown contra takeover/reaproveitamento indevido. Credencial de API do provedor deve ser binding secret; jamais ficar no browser/log/README.

## SEO, sessão e cookies
Admin usa host próprio com cookie `HttpOnly Secure SameSite=Lax`, sem `Domain=.cliente.com`; hosts públicos não recebem cookie admin. Canonical único por destino/edição; sitemap e robots por domínio somente para conteúdo publicado; cópias auxiliares redirecionam ou `noindex`.

## Validação e falhas
Teste `customer.example.test` A vs `other.example.test` B; host desconhecido 404; host IDN; suspensão; binding inativo; SSL pendente; reatribuição proibida; timeout de Cloudflare; provider delete parcial; DNS antigo; domínio raiz e www com redirecionamento explícito. Testes com hostname REAL só no ambiente de staging aprovado.

## Custos/cotas verificados (14/10/2026)
Cloudflare for SaaS registra 100 hostnames incluídos na zona em planos Free/Pro/Business, adicional de USD 0.10/hostname segundo a página consultada. **Não equivale a serviço totalmente gratuito**: ativação do produto em conta não-Enterprise exige informações de pagamento, Worker/D1/R2 têm limites e cobranças próprias. Apex proxying figura como add-on pago, não incluso Free. Verificar os planos atuais no provisionamento.

Fontes: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/ ; https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/enable/ ; https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/ ; https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/ ; https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/common-api-calls/ .
