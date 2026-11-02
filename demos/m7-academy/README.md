# M7 Academy — MatchOps (DEMO NÃO OFICIAL)

Demo conceitual interativa criada para estudo de pré-venda em 02/11/2026. Sem contrato/afiliação. Sem cadastro de clientes reais. **Não interfere em https://m7arena.pro/**.

## O que demonstra
Uma camada operacional para campeonatos:
1. Público (`?view=publico`): agenda, partidas e histórico de resultados validados.
2. Capitão (`?view=capitao`): escolha de equipe fictícia, check-in, envio de placar e simulação de contestação.
3. Staff (`?view=staff`): triagem de resultados enviados, aprovação e rejeição fundamentada; reflexão na visão pública.
Dados ficam somente na sessão deste navegador e podem ser restaurados. Não há API nem banco. Recarregar mantém dados enquanto a sessão local existir; outra sessão pode diferir.

## Fontes e limites
- Instagram fornecido pelo usuário: https://www.instagram.com/m7academy_/
- Site de torneios que referencia @m7academy_: https://m7arena.pro/
- Informações em posts podem estar desatualizadas; todos os torneios, equipes, confrontos e horários desta demo são sintéticos.
- A marca e as cores são utilizadas como inspiração conceitual; sem logo oficial, fotos, assets Riot, permissões ou prova de parceria.
- Não pressupõe que os fluxos propostos estejam ausentes na plataforma atual; é hipótese de melhoria a validar.

## Acessar localmente
`python3 -m http.server 4177 --directory demos/m7-academy` → http://127.0.0.1:4177/
Para testes automáticos em CI: `node demos/m7-academy/smoke.mjs` com servidor acima e Playwright instalado.
Sem deploy de produção, sem URLs fictícias, sem senhas ou conta real.

## Aceite / QA
- Confirmar fluxo capitão→staff→público, rejeição, restauração, filtros e navegação de teclado.
- Validar 320/360/390/430/768/1024/1440px, sem scroll lateral.
- Concluir que se trata de **DEMO_INTERATIVA_EFEMERA**, não produto integrado.
- Produto real requer verificação dos fluxos atuais do M7 Arena, integração autorizada, modelo de arbitragem, autenticação, roles, antifraude, audit log, segurança e homologação.

## Caminho de absorção
Adicionar como módulo vertical de eventos/competições com ORGANIZADORA como tenant; torneio vinculado à edição, partidas e disputas tenant-scoped, endpoints autenticados, controle de staff e gestão de evidências privadas. Evitar lógica hardcoded de M7 Academy.
