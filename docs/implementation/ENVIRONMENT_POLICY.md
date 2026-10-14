# Ambientes, hosts e segredos — política de implementação

Checkpoint: 2026-10-14. A configuração local abaixo foi inspecionada; as exigências de segurança ainda precisam dos testes do runtime. Este documento não declara staging/produção provisionados nem um domínio oficial reservado em DNS.

| Ambiente | Configuração conhecida | Estado |
|---|---|---|
| local | `ADMIN_ORIGIN=http://localhost:5173`, `APP_ENV=local`; D1 binding `DB`, R2 binding `ASSETS_PRIVATE`; fixtures A/B com hosts `.example.test` | Scaffold em desenvolvimento; zero credenciais cloud necessário para executar local. |
| staging | Configuração por ambiente separada; dados exclusivamente fictícios e host autorizado futuramente | Não provisionado/verificado. Secrets, conta, nomes finais, URL e migrations reais não definidos como fatos. |
| production | Um deploy/codebase por ambiente; muitos tenants; auth em host administrativo fixo, conteúdo público por host explicitamente associado | Não provisionado/verificado. Depende de staging/homologação e autorização específica para produção. |

`a.example.test` e `b.example.test` são nomes reservados a testes, não DNS real. O host administrativo local está definido no scaffold; o host administrativo público, domínio oficial e subdomínio `workers.dev` final ainda precisam ser registrados na evidência de deploy. `workers_dev=false` no template inspecionado impede tratar o template como publicação. Um identificador D1 com zeros no arquivo de exemplo é placeholder local, não banco cloud existente.

`.env.example` e `.dev.vars.example` são templates sem valores reais. O script local pode gerar secret descartável em `.dev.vars`, ignorado pelo Git. Não copiar cookies, tokens de consoles, senhas, service accounts, API tokens Cloudflare/Firebase ou segredos de produção para documentação, fixtures, browser UI, logs ou repositório. Secrets de ambientes reais serão separados e configurados no provedor somente dentro da ação autorizada correspondente; CI de PR não recebe segredos de produção.

Políticas exigidas para o runtime, a verificar em F1/F2/F10:

- Cookies de sessão `HttpOnly`, `SameSite=Lax` ou mais restritivo, host-only sem atributo `Domain`; `Secure` em HTTPS. Exceção de HTTP apenas no localhost de desenvolvimento, sem reaproveitar cookies em custom host.
- Toda mutação administrativa exige sessão, origem confiável/CSRF, membership ativa, organização ativa, permissão e ownership/escopo de evento. CORS sem wildcard de credenciais e sem refletir origem arbitrária; origem administrativa exata configurada no servidor.
- CSP restringe scripts, objetos, frames e conexões necessários; nunca permitir HTML/CSS/JS arbitrários de tenant para contornar validação. HSTS depende de HTTPS e domínio real configurado, sem alegar que HTTP local exercita TLS.
- Painel, preview, recibos, uploads privados e respostas com PII usam `no-store`; cache público somente por host/destino/revisão publicada. Host desconhecido/pendente e organização suspensa falham fechado.
- Flags `CUSTOM_DOMAINS_ENABLED`, `OUTBOUND_MESSAGES_ENABLED` e `COMMERCIAL_GATING_ENABLED` estão desabilitadas por padrão no scaffold inspecionado. Flags não substituem autorização, teste ou integração externa e não podem desativar proteções básicas.

Firebase está disponível em console segundo o usuário. A função de integração, configuração, autorização server-side e prova de runtime serão registradas por decisão técnica própria; este documento não declara Firebase Auth/Firestore configurados ou sincronização cross-cloud. Não criar banco/deploy por tenant.

Rollback local: parar o runtime, preservar migrations/fixtures e remover somente segredos temporários gerados para o ambiente local quando necessário. Nunca apagar dados reais ou restaurar cloud sem runbook e autorização correspondentes. Ver [master status](MASTER_EXECUTION_STATUS.md) e [ADR-005](../adr/ADR-005-authorized-repository-and-execution.md).
