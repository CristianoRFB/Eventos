import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import type { Route } from "./+types/domains";
import { requireTenant } from "../services/tenant.server";
import { Panel, ApiForm } from "../components/panel";

type DomainListItem = {
  id: string;
  hostname: string;
  destination_id: string;
  status: string;
  ownership_verified: number;
  hostname_status: string | null;
  ssl_status: string | null;
  dns_verified: number;
  version: number;
};
export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const ctx = await requireTenant(
      request, env, params.orgId, "org.domains.request",
    );
    const [domains, editions] = await Promise.all([
      env.DB.prepare(
        "SELECT id,hostname,destination_id,status,ownership_verified,hostname_status,ssl_status,dns_verified,version FROM domain_bindings WHERE organization_id=? ORDER BY created_at DESC LIMIT 100",
      ).bind(params.orgId).all<DomainListItem>(),
      env.DB.prepare(
        "SELECT d.id,d.name,v.name AS event_name FROM editions d JOIN events v ON v.organization_id=d.organization_id AND v.id=d.event_id WHERE d.organization_id=? AND d.status='active' AND v.status='active' ORDER BY d.created_at DESC LIMIT 100",
      ).bind(params.orgId).all<{ id: string; name: string; event_name: string }>(),
    ]);
    return {
      orgId: params.orgId,
      name: ctx.organization.name,
      domains: domains.results,
      editions: editions.results,
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401)
      throw redirect("/login");
    throw error;
  }
}
const statuses: Record<string, string> = {
  requested: "Solicitado",
  ownership_pending: "Aguardando verificação de propriedade",
  tls_pending: "Aguardando certificado HTTPS",
  dns_pending: "Aguardando confirmação DNS",
  active: "Ativo",
  suspended: "Suspenso",
  failed: "Falha na verificação",
  releasing: "Em remoção",
  released: "Removido / reservado",
};

export default function Domains({ loaderData }: Route.ComponentProps) {
  const { orgId, name, domains, editions } = loaderData;
  const endpoint = `/api/v1/orgs/${orgId}/domains`;
  return (
    <Panel name={name}>
      <div className="eyebrow">DOMÍNIOS PERSONALIZADOS · F7</div>
      <h1>Endereços dos seus eventos</h1>
      <p className="muted">
        Cada domínio aponta para uma edição específica. Solicitar um domínio
        não o ativa: a propriedade, o DNS e o certificado HTTPS precisam ser
        verificados separadamente pela plataforma.
      </p>
      <p><a href={`/admin/${orgId}`}>← Voltar para organizadora</a></p>
      <section className="section-card" aria-labelledby="domain-request-heading">
        <h2 id="domain-request-heading">Solicitar novo domínio</h2>
        <ApiForm endpoint={endpoint} label="Registrar solicitação">
          <label>
            Domínio completo
            <input
              name="hostname" type="text" required minLength={3} maxLength={253}
              autoComplete="off" placeholder="www.seuevento.com.br"
            />
          </label>
          <label>
            Edição de destino
            <select name="editionId" required defaultValue="">
              <option value="" disabled>Selecione a edição</option>
              {editions.map((edition) => (
                <option key={edition.id} value={edition.id}>
                  {edition.event_name} · {edition.name}
                </option>
              ))}
            </select>
          </label>
        </ApiForm>
        {!editions.length && (
          <p role="status">
            Cadastre e ative uma edição antes de solicitar seu domínio.
          </p>
        )}
      </section>
      <section className="section-card" aria-labelledby="domains-list-heading">
        <div className="section-title">
          <h2 id="domains-list-heading">Domínios da organizadora</h2>
          <span className="badge">{domains.length} cadastrados</span>
        </div>
        {!domains.length && (
          <p className="muted">Nenhum domínio solicitado ainda.</p>
        )}
        {domains.map((domain) => (
          <article className="event-row" key={domain.id}>
            <div style={{ width: "100%" }}>
              <h3>{domain.hostname}</h3>
              <p className="muted">
                {statuses[domain.status] ?? domain.status}
                {" · "}
                Edição: {editions.find((e) => e.id === domain.destination_id)?.name
                  ?? domain.destination_id}
              </p>
              <p className="muted">
                Propriedade: {domain.ownership_verified ? "verificada" : "pendente"}
                {" · "}
                HTTPS: {domain.ssl_status === "active" ? "ativo" : "pendente"}
                {" · "}
                DNS: {domain.dns_verified ? "verificado" : "pendente"}
              </p>
              <div className="form-grid">
                {domain.status === "active" ||
                  domain.status === "requested" ||
                  domain.status === "ownership_pending" ||
                  domain.status === "dns_pending" ||
                  domain.status === "tls_pending" ||
                  domain.status === "failed" ? (
                  <ApiForm
                    endpoint={`${endpoint}/${domain.id}`}
                    method="PATCH"
                    label="Suspender domínio"
                    transform={() => ({ operation: "suspend", revision: domain.version })}
                  >
                    <p className="muted">
                      Suspender impede que o endereço publique conteúdo.
                    </p>
                  </ApiForm>
                ) : null}
                {(domain.status === "suspended" || domain.status === "failed") && (
                  <ApiForm
                    endpoint={`${endpoint}/${domain.id}`}
                    method="PATCH"
                    label="Solicitar nova verificação"
                    transform={() => ({ operation: "retry", revision: domain.version })}
                  >
                    <p className="muted">A revisão exigirá validar novamente as provas.</p>
                  </ApiForm>
                )}
                {(domain.status === "requested" || domain.status === "failed") && (
                  <ApiForm
                    endpoint={`${endpoint}/${domain.id}`}
                    method="PATCH"
                    label="Retirar solicitação"
                    transform={() => ({ operation: "release", revision: domain.version })}
                  >
                    <p className="muted">
                      A retirada reserva o histórico para evitar apropriação indevida.
                    </p>
                  </ApiForm>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
      <p className="muted">
        Esta versão é operacional apenas no ambiente local. Não configure DNS
        nem aponte um domínio de cliente antes da liberação do provedor.
      </p>
    </Panel>
  );
}
