# Modelo de ameaça e proteção proposta

## Superfícies
Domínios customizados, host header, sessões, uploads R2, edição de conteúdo rico, formulários públicos, convites, analytics, Platform Owner e cache CDN. D1 compartilhado aumenta impacto de falha de escopo e exige tests rigorosos.

## Controles mínimos
- Fail closed do hostname; resolução de domínio sem fallback silencioso e com domínios reservados; DNS/certificado verificados separadamente.
- Boundaries `auth -> membership ativa -> resource org -> role -> entitlement condicional` em TODAS as mutações; Security baseline não passa por gates comerciais.
- SQL parametrizado, IDs não confiáveis, FK composto, `organization_id` em queries, audit de recursos protegidos.
- UI sanitizada, escaping/HTML de rich text, headers CSP, HSTS depois de DNS confirmado, frame restrictions, proteção contra open redirect.
- CSRF em ações baseadas em cookie e validação de Origin, limite de sessão, rate limit, anti-credential-stuffing; 2FA pode ser NEXT para risk-based.
- Upload com MIME sniff, magic bytes, tamanho, hashes, file owner, extensões permitidas; antivírus/scan quando risco exigir; URLs privadas geradas por backend com expiração; não servir arquivos privados como públicos.
- Public assets e public snapshot são explicitamente publicados com controle editorial/consentimento; nunca copiar documentos de inscrição para bucket público.
- Formulários com Turnstile ou defesa equivalente (quando provedor autorizado), rate limit, validação, dedup, honeypot e logs sem dados pessoais.
- Cache público por host/destino/revisão; privado `no-store` e chaves por tenant; evitar service workers PWA de domínio customizado por padrão.
- Senhas e secrets não entram em banco em texto puro, logs ou Git; token Cloudflare segregado por escopo e ambiente.

## LGPD e menores
Inventário de dados por finalidade, base legal documentada com profissional quando necessário, termos/privacidade configuráveis por controlador, retenção parametrizável, exportação e exclusão quando cabível. Dados de menor de idade NÃO coletados por padrão; eventos com menores exigem revisão específica. É requisito projetado, não selo de conformidade jurídica.

## Testes adversariais com aceite
1. Owner A usa id de edição B -> 403/404 e nenhum resultado.
2. Editor A tenta upload no key prefix B -> 403 sem objeto criado.
3. Host B recebe HTML/canonical de A -> FAIL bloqueante.
4. Host desconhecido, SSL pendente e DNS inválido -> nunca servir tenant default.
5. Dois publish concorrentes -> versão/If-Match, um conflito informado; não há estado parcial.
6. CSRF sem token ou origem indevida -> rejeitado.
7. Status suspenso e membership revogada -> API privada negada.
8. Submissões não aparecem em sitemap nem nos metadados públicos.
9. Export/contadores respeitam org+evento; não inferem existência de outro tenant.
10. Sessão do host administrativo não é enviada ao custom domain.

## Gates
Security tests, build e revisão de dependências antes de staging. Sem bypass para fazer tests passarem. Incidentes requerem rollback e notificação com responsabilidade definida em RUNBOOKS.
