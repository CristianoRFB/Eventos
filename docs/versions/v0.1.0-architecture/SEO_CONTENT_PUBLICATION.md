# Publicação editorial e SEO

## Modelo editorial
`content_drafts` imutáveis por revisão; `publications` representam cópias imutáveis publicáveis e `edition_publication_pointer` indica a revisão ativa. Publicar exige role, validações semânticas, licença de imagens, consistência de programação e transação D1 do ponteiro/revisão. Draft nunca vai à API/SSR público.

## URLs públicas
`/` destino canônico, `/programacao`, `/convidados`, `/expositores`, `/ingressos`, `/faq`, `/como-chegar`, `/regulamento`, `/noticias/:slug`, `/edicoes/:ano-ou-slug`; cada uma deriva do tenant/edition por Host resolver. Domínios secundários redirecionam 301/308 para host canônico conforme política aprovada. URLs antigas recebem redirect histórico onde possível.

## SEO
SSR title/description, `og:title/og:image`, canonical absoluto do domínio verificado, Event Schema.org apenas com dados legítimos, robots/sitemap por host, indexar só snapshot publicado e não duplicar subdomínios de preview. Cuidado com eventos com data terminada, preserve histórico sem SEO enganoso.

## Cache e falhas
`Cache-Control` curto de HTML público e versionamento de assets, invalidação após mudança de pointer, chave {host, destination, revision, pathname}. Conteúdo preview, forms com dados pessoais e painel sempre `no-store`.
