import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import type { Route } from "./+types/event";
import { requireTenant } from "../services/tenant.server";
import { Panel, ApiForm } from "../components/panel";

export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const ctx = await requireTenant(
      request,
      env,
      params.orgId,
      "edition.read",
      params.eventId,
    );
    const event = await env.DB.prepare(
      "SELECT id,name FROM events WHERE organization_id=? AND id=?",
    )
      .bind(params.orgId, params.eventId)
      .first<{ id: string; name: string }>();
    if (!event) throw new Response("Evento não encontrado", { status: 404 });
    const editions = await env.DB.prepare(
      "SELECT id,name,edition_key,city,time_zone,start_at,end_at,status FROM editions WHERE organization_id=? AND event_id=? ORDER BY start_at DESC",
    )
      .bind(params.orgId, params.eventId)
      .all<{
        id: string;
        name: string;
        edition_key: string;
        city: string;
        time_zone: string;
        start_at: string;
        end_at: string;
        status: string;
      }>();
    return {
      organization: ctx.organization,
      event,
      editions: editions.results,
      canCreate: [
        "organization_owner",
        "organization_admin",
        "event_manager",
      ].includes(ctx.member.role),
      canManageContent: [
        "organization_owner",
        "organization_admin",
        "event_manager",
        "content_editor",
        "publisher",
      ].includes(ctx.member.role),
      canReview: [
        "organization_owner",
        "organization_admin",
        "event_manager",
        "reviewer_staff",
      ].includes(ctx.member.role),
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401)
      throw redirect("/login");
    throw error;
  }
}
export default function EventPage({ loaderData }: Route.ComponentProps) {
  const {
    organization,
    event,
    editions,
    canCreate,
    canManageContent,
    canReview,
  } = loaderData;
  return (
    <Panel name={organization.name}>
      <a href={`/admin/${organization.id}`} className="muted">
        ← Todos os eventos
      </a>
      <h1>{event.name}</h1>
      <p className="muted">
        Cada edição tem suas datas, seu local e seu conteúdo.
      </p>
      <section className="section-card">
        <h2>Edições</h2>
        {editions.map((edition) => (
          <div className="event-row" key={edition.id}>
            <div>
              <h3>{edition.name}</h3>
              <p className="muted">
                {edition.city} ·{" "}
                {edition.start_at
                  ? new Intl.DateTimeFormat("pt-BR", {
                      timeZone: edition.time_zone,
                      dateStyle: "long",
                    }).format(new Date(edition.start_at))
                  : "Data a definir"}{" "}
                · {edition.status === "draft" ? "Rascunho" : edition.status}
              </p>
              {canManageContent && (
                <a
                  className="cms-link"
                  href={`/admin/${organization.id}/events/${event.id}/editions/${edition.id}/operations`}
                >
                  Programação e participantes ↗
                </a>
              )}
              {canCreate && (
                <a
                  className="cms-link"
                  href={`/admin/${organization.id}/events/${event.id}/editions/${edition.id}/forms`}
                >
                  Formulários e inscrições ↗
                </a>
              )}
              {canReview && (
                <a
                  className="cms-link"
                  href={`/admin/${organization.id}/events/${event.id}/editions/${edition.id}/applications`}
                >
                  Candidaturas ↗
                </a>
              )}
              {canManageContent && (
                <a
                  className="cms-link"
                  href={`/admin/${organization.id}/events/${event.id}/editions/${edition.id}/cms`}
                >
                  Conteúdo e publicação ↗
                </a>
              )}
            </div>
          </div>
        ))}
        {!editions.length && <p>Ainda não há edições. Prepare a primeira.</p>}
      </section>
      {canCreate && (
        <section className="section-card">
          <h2>Preparar nova edição</h2>
          <ApiForm
            endpoint={`/api/v1/orgs/${organization.id}/events/${event.id}/editions`}
            label="Criar edição ↗"
            transform={(form) => ({
              name: form.get("name"),
              editionKey: form.get("editionKey"),
              city: form.get("city"),
              timeZone: form.get("timeZone"),
              startAt: `${form.get("startAt")}:00.000Z`,
              endAt: `${form.get("endAt")}:00.000Z`,
            })}
          >
            <label>
              Nome da edição
              <input name="name" required minLength={2} />
            </label>
            <label>
              Identificador da edição
              <input
                name="editionKey"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="2027"
              />
            </label>
            <label>
              Cidade
              <input name="city" maxLength={120} />
            </label>
            <label>
              Fuso do evento
              <input
                name="timeZone"
                defaultValue={organization.timezone}
                required
              />
            </label>
            <label>
              Início (UTC)
              <input name="startAt" type="datetime-local" required />
            </label>
            <label>
              Término (UTC)
              <input name="endAt" type="datetime-local" required />
            </label>
          </ApiForm>
        </section>
      )}
    </Panel>
  );
}
