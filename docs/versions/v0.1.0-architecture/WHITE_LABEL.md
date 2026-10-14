# Design white-label e CMS estruturado

A identidade da plataforma NÃO aparece como marca pública obrigatória. Cada organizadora pode criar `brand_profiles`, aplicar defaults no evento e sobrescrever apenas tokens aprovados na edição. Ordem recomendada: platform template (fallback) < org brand < event brand < edition hero/section. Cor/contraste validada; CSS arbitrário/HTML não sanitizado proibidos no MVP.

## Tokens propostos
`displayName`, logo, favicon, `colorPrimary`, `colorAccent`, `surface`, `text`, `fontSet` de lista permitida, `heroImage`, `heroLayout`, `sectionsOrder`, `socials`, `contacts`, `legalEntity`, `termsUrl`, `privacyUrl`, `accessibilityNotes`, `ticketExternalUrl`. R2 assets possuem estado/consentimento/licença e variantes responsivas.

## Templates
- `festival`: visual editorial exuberante, hero e agenda em destaque.
- `convention`: visual informativo organizado, convidados/expositores.
- `community`: minimalista para eventos regionais pequenos.
Templates são configurações sobre os mesmos blocos de CMS, não forks.

## Publicação e preview
Editor muda draft -> preview autenticado -> revisão -> snapshot immutable -> publish pointer. Links preview assinados de expiração curta, `noindex`. A revisão publicada guarda referência a assets aprovados; mudar o draft não altera automaticamente o site público. Conteúdo de edição antiga permanece com URL e canonical adequados.

## Conteúdo de lead
Investigação pública pode alimentar `LEAD_CONTEXT.md` e briefing visual, mas NÃO promover logo, marca, banner ou nome como site real do lead antes de consentimento. A demo genérica usa nomes fictícios.
