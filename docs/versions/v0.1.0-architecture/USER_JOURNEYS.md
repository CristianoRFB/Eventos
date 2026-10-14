# Jornadas completas propostas (6)

## J1 — Primeiro cliente da plataforma (Platform Owner -> organizadora)
1. Platform Owner autenticado cria org em transação; `organizations.status=onboarding` ou status seguro equivalente.
2. Envia convite expiráveis para owner; token de uso único; mensagem externa só se provedor de email habilitado, senão link assistido.
3. Owner aceita no host do painel, escolhe org, configura branding/contatos/privacidade.
4. Cria evento Anime Nova e primeira edição, agendas e FAQ em draft.
5. Editor envia imagens licenciadas via R2, visualiza preview autenticado `noindex`.
6. Publisher aprova e publica snapshot. Um subdomínio de plataforma previamente verificado responde HTML SSR. Logs registram a publicação.
7. Solicita domínio próprio; respeitar validação ownership/SSL/DNS antes de mapear. Sem aprovação de integração cloud, ficar bloqueado com checklist.
**Aceite:** nenhum passo depende de troca de código/infra por cliente; dados não vazam A/B.

## J2 — Visitante consulta programação no domínio da edição
1. Visitante abre host exato; Edge termina TLS; Worker normaliza Host.
2. Resolver consulta binding verificado/ativo, tenant/edição destino, status org.
3. Carrega snapshot público com revisão e filtros de dia/palco; SSR title/canonical/OG.
4. Exibe convidado, atrações, local e link de ingressos externos.
5. Evento antigo mantém arquivo e nunca sobrepõe edição atual.
**Aceite:** host inexistente/inativo falha fechado; cache não mistura tenants.

## J3 — Mudança de programação sem publicação parcial
1. Event Manager abre edição e cria atividade às 15:00 no palco 1.
2. API valida timezone, pertencimento do palco, duração, convidados e sobreposições.
3. Novo draft salva com `revision` e optimistic lock; conflito retorna 409 sem sobrescrever mudança concorrente.
4. Preview exibe alterações sem afetar site público.
5. Publisher confirma snapshot; transaction atualiza pointer imutável.
6. CDN invalida host/revisão; se falhar, TTL curto garante convergência.
**Aceite:** uma revisão inteira publicada ou nenhuma; botão de rollback funciona.

## J4 — Expositor preenche e staff revisa inscrição
1. Produtora habilita formulário com versão, finalidade e texto de privacidade.
2. Público envia dados mínimos, arquivos autorizados e comprova desafio antiabuso.
3. Servidor valida limites, escopo do form, status `open`, gera token/protocolo seguro.
4. Revisor recebe fila sem acessos de outro tenant, solicita correção/aprova/rejeita com audit.
5. Somente após consentimento para exposição pública, o perfil aprovado passa ao snapshot público.
6. Pessoa pode solicitar retirada/exclusão conforme retenção e obrigações.
**Aceite:** submissão privada não é pública nem acessível por URL/ID genérico.

## J5 — Owner adiciona editor e reduz acessos
1. Owner cria convite com role content_editor e event assignment da edição A.
2. Novo membro acessa apenas drafts daquele evento; B é negado.
3. Tentativa de editar plano, domínio ou publicar sem direito resulta 403.
4. Revogação de membership impede nova mutação mesmo com sessão válida.
**Aceite:** último owner não pode ser removido sem transferência explícita.

## J6 — Downgrade manual sem perda de edições
1. Platform Owner seleciona plano local APROVADO e aplica estado/override com audit.
2. Serviço de entitlement resolve limite sem permitir valores ausentes como ilimitados.
3. Se organização excede novo limite, eventos existentes continuam legíveis/exportáveis conforme política, mas nova criação excedente é impedida de modo transacional.
4. Nenhuma exclusão de edição, mídia ou histórico é executada automaticamente.
**Aceite:** transação concorrente não fura limite, segurança permanece igual em qualquer plano.
