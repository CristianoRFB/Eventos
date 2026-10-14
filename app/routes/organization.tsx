import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import type { Route } from "./+types/organization";
import { requireTenant } from "../services/tenant.server";
import { ApiForm, InviteForm, Panel } from "../components/panel";

export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const ctx = await requireTenant(request, env, params.orgId, "org.read");
    const unrestricted = ["organization_owner", "organization_admin"].includes(
      ctx.member.role,
    );
    const events = await env.DB.prepare(
      "SELECT e.id,e.name,e.slug,e.status FROM events e WHERE e.organization_id=? AND (?=1 OR EXISTS(SELECT 1 FROM event_assignments a WHERE a.organization_id=e.organization_id AND a.event_id=e.id AND a.user_id=?)) ORDER BY e.created_at DESC",
    )
      .bind(ctx.organization.id, unrestricted ? 1 : 0, ctx.identity.user.id)
      .all<{ id: string; name: string; slug: string; status: string }>();
    return {
      organization: ctx.organization,
      events: events.results,
      canCreate: unrestricted,
      canManageMembers: ["organization_owner", "organization_admin"].includes(
        ctx.member.role,
      ),
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401)
      throw redirect("/login");
    throw error;
  }
}

export default function Organization({ loaderData }: Route.ComponentProps) {
  const { organization, events, canCreate, canManageMembers } = loaderData;
  return (
    <Panel name={organization.name}>
      <div className="eyebrow">SUA ORGANIZADORA</div>
      <h1>Vamos ao próximo encontro.</h1>
      <p className="muted">{organization.name}</p>
      <section className="section-card">
        <div className="section-title">
          <h2>Eventos</h2>
          <span className="badge">{events.length} cadastrados</span>
        </div>
        {events.map((event) => (
          <div className="event-row" key={event.id}>
            <span className="event-icon">✦</span>
            <div>
              <h3>
                <a href={`/admin/${organization.id}/events/${event.id}`}>
                  {event.name} ↗
                </a>
              </h3>
              <p className="muted">
                {event.slug} ·{" "}
                {event.status === "draft" ? "Rascunho" : event.status}
              </p>
            </div>
          </div>
        ))}
        {!events.length && (
          <p>Nenhum evento por aqui. Crie o primeiro para começar.</p>
        )}
      </section>
      {canCreate && (
        <section className="section-card">
          <h2>Criar um evento</h2>
          <ApiForm
            endpoint={`/api/v1/orgs/${organization.id}/events`}
            label="Criar evento ↗"
          >
            <label>
              Nome do evento
              <input name="name" required minLength={2} maxLength={120} />
            </label>
            <label>
              Identificador
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="meu-evento"
              />
            </label>
          </ApiForm>
        </section>
      )}
      {canManageMembers && (
        <section className="section-card">
          <h2>Convidar uma pessoa</h2>
          <p className="muted">
            O acesso fica vinculado à função e ao evento escolhido.
          </p>
          <InviteForm
            endpoint={`/api/v1/orgs/${organization.id}/invitations`}
            events={events}
          />
        </section>
      )}
    </Panel>
  );
}
