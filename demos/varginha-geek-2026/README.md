# Órbita 26 — demonstração independente inspirada no Varginha Geek

## Contexto
Evento real confirmado para 22/11/2026, 09h–18h, no Clube de Varginha (MG). Ingressos oficiais na Sympla: https://www.sympla.com.br/evento/x/3532471 . O projeto é CONCEITUAL, não oficial, sem logos, fotos ou parceria com a organização.

## UX / arte
- Personalidade: futurista, acolhedora, editorial.
- Paleta: base #090d13, superfície #141b22, verde espacial #d2ff6f, ciano #83e9d4, pêssego #ffb68b; tipografia system-ui.
- Layout: grid responsivo 1180px, 900 e 620px; alvos touch >= 44px; foco visível; movimento reduzido respeitado.
- Hero: planeta alienígena original em CSS; sem logomarca oficial ou imagens protegidas.
- Fluxo prioritário: visitante compra no site real da Sympla e monta roteiro FICTÍCIO na demo; equipe simula check-in; organização altera aviso e publicação.

## Visões
- Visitante: `?view=visitante` — informação confirmada, CTA Sympla, agenda fictícia com roteiro local.
- Expositor: `?view=expositor` — checklist, edição de perfil e publicação simulada.
- Equipe: `?view=equipe` — busca fictícia, check-in e reversão.
- Gestão: `?view=gestao` — total fictício, aviso e programação compartilhados no mesmo navegador.

## Limitações e segurança
Sem backend, login, QR real, integração à Sympla, venda de ingressos, disparos ou banco de dados. `localStorage` apenas no navegador; ambientes de pessoas diferentes não sincronizam. Nomes, métricas, horários da agenda e estande são fictícios. Nenhuma alteração de produção existente.

## Worker publicado
https://77-varginha-geek-2026-conceito.on7.workers.dev/?view=visitante

Arquivo `index.html` contém a experiência independente, sem dependências externas. Implantação via API do Cloudflare Workers; este repositório guarda fonte, mas NÃO possui workflow de deploy automático.

## Referências
- https://www.sympla.com.br/evento/x/3532471
- https://turismo.varginha.mg.gov.br/varginha-geek-tera-campanha-solidaria/
