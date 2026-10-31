import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import type { Route } from "./+types/platform";
import { requirePlatform } from "../services/tenant.server";
import { Panel, ApiForm } from "../components/panel";
export async function loader({ request }: Route.LoaderArgs) {
  try {
    await requirePlatform(request, env);
    const demoOnly = env.APP_ENV === "local";
    const demoAssignments = demoOnly
      ? (await env.DB.prepare(
          "SELECT organization_id,plan_id,subscription_status,revision FROM commercial_assignments",
        ).all<{
          organization_id: string;
          plan_id: string;
          subscription_status: string;
          revision: number;
        }>()).results
      : [];
    return {
      demoOnly,
      demoAssignments,
      organizations: (
        await env.DB.prepare(
          "SELECT id,name,slug,status,revision FROM organizations ORDER BY created_at DESC LIMIT 200",
        ).all<{
          id: string;
          name: string;
          slug: string;
          status: string;
          revision: number;
        }>()
      ).results,
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401)
      throw redirect("/login");
    throw error;
  }
}
export default function Platform({ loaderData }: Route.ComponentProps) {
  return (
    <Panel name="Administração da plataforma">
      <div className="eyebrow">PLATAFORMA</div>
      <h1>Cada organizadora, seu espaço.</h1>
      <p className="muted">Gerencie o cadastro e o estado de operação.</p>
      <section className="section-card">
        {loaderData.organizations.map((org) => (
          <div className="platform-row" key={org.id}>
            <div>
              <h2>{org.name}</h2>
              <p>
                {org.slug} · {org.status === "active" ? "Ativa" : "Suspensa"}
              </p>
            </div>
            <ApiForm
              endpoint={`/api/v1/platform/organizations/${org.id}/status`}
              method="PATCH"
              label={org.status === "active" ? "Suspender" : "Reativar"}
              transform={() => ({
                status: org.status === "active" ? "suspended" : "active",
                revision: org.revision,
              })}
            >
              <span className="sr-only">Alterar estado de {org.name}</span>
            </ApiForm>
            {loaderData.demoOnly && (() => {
              const assignment = loaderData.demoAssignments.find(
                (item) => item.organization_id === org.id,
              );
              return (
                <div>
                  <h3>Contrato de demonstração interna</h3>
                  <p className="muted">
                    TEST_ONLY · Sem preço, cobrança ou limites comerciais aprovados.
                    {assignment ? ` Estado atual: ${assignment.subscription_status}` :
                      " Nenhuma atribuição de teste."}
                  </p>
                  <ApiForm
                    endpoint={`/api/v1/platform/organizations/${org.id}/commercial`}
                    method="PATCH"
                    label="Salvar simulação"
                    transform={(form) => ({
                      planId: "internal-demo",
                      subscriptionStatus: String(form.get("subscriptionStatus")),
                      trialUntil: null,
                      entitlementOverrides: {},
                      limitOverrides: {},
                      expectedRevision: assignment?.revision ?? 0,
                    })}
                  >
                    <label>
                      Estado sintético
                      <select name="subscriptionStatus" defaultValue={assignment?.subscription_status ?? "demo"}>
                        <option value="demo">Demonstração</option>
                        <option value="active">Ativo (simulado)</option>
                        <option value="suspended">Suspenso (simulado)</option>
                        <option value="cancelled">Cancelado (simulado)</option>
                      </select>
                    </label>
                  </ApiForm>
                </div>
              );
            })()}
          </div>
        ))}
      </section>
      <section className="section-card">
        <h2>Cadastrar organizadora</h2>
        <ApiForm
          endpoint="/api/v1/platform/organizations"
          label="Cadastrar organizadora"
        >
          <label>
            Nome
            <input name="name" required minLength={2} />
          </label>
          <label>
            Identificador
            <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </label>
        </ApiForm>
      </section>
    </Panel>
  );
}
