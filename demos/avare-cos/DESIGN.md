# DESIGN — AVA.COS (conceito independente)
**Lead:** @avare.cos, Avaré/SP. **Escopo:** demonstração comercial fictícia, não oficial e sem reprodução de logotipos.
## Evidência e cautelas
- Print fornecido em 04/11/2026: perfil de encontros cosplay em Avaré, concurso, posts de evento adiado, acesso ao regulamento via Google Forms. A data exibida em bio não deve ser tratada como confirmada.
- Divulgação regional de 23/10/2026 aponta encontro, cosplay, artistas e jogos de mesa no Centro Cultural Esther Pires Novaes. A próxima edição NÃO foi confirmada aqui.
- Nenhuma parceria, autorização de uso da marca gráfica, contrato ou acesso ao sistema do evento é presumida.
## UX / Visual
- Personalidade: **expressiva, acolhedora, ágil**.
- Público: visitante/cosplayer/criador, equipe de recepção e coordenação.
- Direção: editorial independente de cultura pop; estética de cartaz original, sem copiar identidade visual do Instagram.
- Paleta: ink `#16151c`, dark `#181722`, paper `#fffefa`, canvas `#f7f5f0`, accent `#d7f489`, lavender `#b6a1f5`, coral `#fd7863`.
- Tipografia: sistema nativo sans, fallback sem carregamento externo.
- Grid: 1170px no desktop, 1 coluna no mobile; hero visual CSS próprio; sem imagens ou logos externos.
- CTA: “Conhecer as inscrições”; fluxo demonstrativo em poucos passos.
- Breakpoints: 960px, 720px, 370px; touch, `:focus-visible`, `prefers-reduced-motion`, avisos persistentes de demonstração.
## Ambientes e comportamento
1. `/`: apresentação pública, categorias, programação **hipotética**, aviso de adiamento e FAQ.
2. `/participar`: gera passe ilustrativo para apelido fictício, modalidade e tema, sem pedir contato real.
3. `/equipe`: busca e faz check-in fictício, com possibilidade de desfazer.
4. `/gestao`: resumo, distribuição, comunicado/status para a demo, exportação CSV **fictício** e reset.
Os registros usam `localStorage` do mesmo navegador. Não há sincronização entre dispositivos, banco de dados, e-mails, pagamentos nem inscrições reais.
## Implantação
HTML independente `demos/avare-cos/index.html` em branch isolada `demo-avarecos-2026` do repositório Eventos 77 (produto canônico ainda sem runtime). Worker Cloudflare de demo `77-avare-cos-conceito.on7.workers.dev` faz proxy somente leitura do HTML público da branch. Nenhuma alteração de main ou produção de clientes.
## Validação e limites
- Rotas esperadas: `/`, `/participar`, `/equipe`, `/gestao`.
- Fonte sem segredos, com dados sintéticos e `noindex`.
- Para uso real: backend próprio, autenticação/RBAC, LGPD, políticas de acesso, confirmação oficial da edição, capacidade/limites de inscrição e integração de comunicação.
