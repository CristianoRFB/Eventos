# Feira Geek RS3 — demo independente

Tipo: DEMO_INTERATIVA_PERSISTIDA_LOCAL (localStorage; sem servidor ou autenticação)

Direção: arcade editorial, vibrante, acessível. Não reproduz marcas nem logos do organizador ou da 77.

Públicos: visitante (roteiro pessoal por dia), expositor (envio de candidatura simulada), organização (aprovação e edição de programação simuladas).

Visual: papel #f7f1e7, tinta #181622, roxo #4920b1, laranja #f15b39, verde #daff76; tipografia Space Grotesk e DM Sans com fallback system-ui. Layout mobile-first em 320–430 px, grade desktop, botões touch >=40 px e foco visível; reduced-motion.

Premissas: Feira Geek RS3, Porto Alegre, Shopping João Pessoa historicamente confirmado em divulgação pública; edição de 14–15 nov sugerida no print do Instagram. Datas na interface são referência conceitual, não certificação oficial. Nenhum expositor, atividade ou número exibido na demo é real.

Persistência: somente no navegador. Quem visita em dispositivos separados verá diferentes dados. Fluxos não cadastram pessoas nem disparam comunicações.

Rotas: / (visitante), /expositores, /organizacao.

Publicação: Worker Cloudflare isolado '77-feirageekrs3-conceito', sem DNS de cliente ou recursos pagos. Integrar com base Eventos 77 exige autenticação real, tenant isolation, backend e políticas de privacidade.

Fonte pública: https://calendarionerd.com.br/evento/feira-geek-shopping-joao-pessoa ; https://www.instagram.com/feirageekrs3/ 
