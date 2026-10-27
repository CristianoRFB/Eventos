import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import type { Route } from "./+types/applications";
import {
  editionFormContext,
  handleApplicationsAdmin,
} from "../services/forms.server";
import { saveDraft } from "../services/content.server";
import { requireTenant } from "../services/tenant.server";
import { Panel, ApiForm } from "../components/panel";

type Detail = {
  id: string;
  status: string;
  revision: number;
  applicantMessage?: string;
  listingOptIn?: boolean;
  answers: Record<string, unknown> | null;
  publicProfile: Record<string, string> | null;
  fields?: { key: string; label: string }[];
};
export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const actor = await requireTenant(request, env, params.orgId, "org.read");
    if (params.applicationId) {
      const response = await handleApplicationsAdmin(
        request,
        env,
        params.orgId,
        undefined,
        params.applicationId,
        undefined,
        saveDraft,
      );
      if (!response.ok) throw response;
      const detail = (await response.json()) as Detail;
      const row = await env.DB.prepare(
        "SELECT a.edition_id,e.event_id FROM exhibitor_applications a JOIN editions e ON e.organization_id=a.organization_id AND e.id=a.edition_id WHERE a.organization_id=? AND a.id=?",
      )
        .bind(params.orgId, params.applicationId)
        .first<{ edition_id: string; event_id: string }>();
      if (!row)
        throw new Response("Candidatura não encontrada", { status: 404 });
      const draft = await env.DB.prepare(
        "SELECT revision FROM content_drafts WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 1",
      )
        .bind(params.orgId, row.edition_id)
        .first<{ revision: number }>();
      let canStage = false;
      try {
        await requireTenant(
          request,
          env,
          params.orgId,
          "exhibitor.write",
          row.event_id,
        );
        canStage = true;
      } catch (error) {
        if (!(error instanceof Response && error.status === 403)) throw error;
      }
      return {
        organization: actor.organization,
        detail,
        list: null,
        editionId: row.edition_id,
        eventId: row.event_id,
        draftRevision: draft?.revision ?? 0,
        canStage,
      };
    }
    const { edition } = await editionFormContext(
      request,
      env,
      params.orgId,
      params.editionId!,
      "applications.review",
    );
    if (edition.event_id !== params.eventId)
      throw new Response("Edição não encontrada", { status: 404 });
    const response = await handleApplicationsAdmin(
      request,
      env,
      params.orgId,
      edition.id,
      undefined,
      undefined,
      saveDraft,
    );
    const list = (await response.json()) as {
      id: string;
      status: string;
      revision: number;
      created_at: string;
      form_name: string;
      submission_state: string;
    }[];
    return {
      organization: actor.organization,
      detail: null,
      list,
      editionId: edition.id,
      eventId: edition.event_id,
      draftRevision: 0,
      canStage: false,
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401)
      throw redirect("/login");
    throw error;
  }
}
const labels: Record<string, string> = {
  submitted: "Recebida",
  needs_info: "Informações solicitadas",
  approved: "Aprovada",
  rejected: "Não aprovada",
  withdrawn: "Retirada",
  purged: "Dados redigidos",
};
export default function ApplicationsPage({ loaderData }: Route.ComponentProps) {
  const {
    organization,
    detail,
    list,
    editionId,
    eventId,
    canStage,
    draftRevision,
  } = loaderData;
  const base = `/api/v1/orgs/${organization.id}/applications/${detail?.id}`;
  return (
    <Panel name={organization.name}>
      <a href={`/admin/${organization.id}/events/${eventId}`}>← Edições</a>
      <h1>{detail ? "Analisar candidatura" : "Candidaturas da edição"}</h1>
      <p className="notice">
        Respostas e contatos são privados. Consultas e decisões ficam
        registradas em auditoria.
      </p>
      {list && (
        <section className="section-card">
          <p>
            <a
              className="button light"
              href={`/api/v1/orgs/${organization.id}/editions/${editionId}/applications/export?page=0`}
            >
              Exportar primeira página de candidaturas (CSV privado)
            </a>
          </p>
          <p className="notice">
            Até 100 candidaturas por página. Somente equipe autorizada;
            dados retirados ou vencidos não são exportados.
          </p>
          {list.map((item) => (
            <article className="event-row" key={item.id}>
              <div>
                <h2>{item.form_name}</h2>
                <p>
                  {labels[
                    item.submission_state === "active"
                      ? item.status
                      : item.submission_state
                  ] ?? "Em análise"}
                </p>
                <a
                  className="button light"
                  href={`/admin/${organization.id}/applications/${item.id}`}
                >
                  Analisar candidatura
                </a>
              </div>
            </article>
          ))}
          {!list.length && <p>Nenhuma candidatura recebida nesta edição.</p>}
        </section>
      )}
      {detail && (
        <>
          <section className="section-card">
            <h2>{labels[detail.status] ?? detail.status}</h2>
            {detail.answers ? (
              <dl>
                {Object.entries(detail.answers).map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {detail.fields?.find((field) => field.key === key)
                        ?.label ?? "Resposta"}
                    </dt>
                    <dd>
                      {typeof value === "boolean"
                        ? value
                          ? "Sim"
                          : "Não"
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>
                Os dados foram retirados ou atingiram seu prazo de retenção.
              </p>
            )}
          </section>
          {detail.answers && (
            <section className="section-card">
              <h2>Decisão de análise</h2>
              <ApiForm
                endpoint={`${base}/review`}
                label="Registrar decisão"
                transform={(form) => ({
                  expectedRevision: detail.revision,
                  status: form.get("status"),
                  applicantMessage: form.get("applicantMessage"),
                })}
              >
                <label>
                  Decisão
                  <select
                    aria-label="Decisão"
                    name="status"
                    defaultValue={
                      detail.status === "submitted"
                        ? "needs_info"
                        : detail.status
                    }
                  >
                    <option value="needs_info">Solicitar informações</option>
                    <option value="approved">Aprovar</option>
                    <option value="rejected">Não aprovar</option>
                  </select>
                </label>
                <label>
                  Mensagem para a pessoa candidata
                  <textarea
                    name="applicantMessage"
                    maxLength={1000}
                    defaultValue={detail.applicantMessage}
                  />
                </label>
              </ApiForm>
            </section>
          )}
          {detail.publicProfile && (
            <section className="section-card">
              <h2>Perfil público proposto</h2>
              <p>
                {detail.listingOptIn
                  ? "Consentimento separado de listagem recebido."
                  : "Sem autorização para listagem."}
              </p>
              <h3>{detail.publicProfile.name}</h3>
              <p>{detail.publicProfile.description}</p>
              {canStage &&
                detail.status === "approved" &&
                detail.listingOptIn && (
                  <ApiForm
                    endpoint={`${base}/stage-profile`}
                    label="Preparar perfil público no rascunho"
                    transform={() => ({ expectedDraftRevision: draftRevision })}
                  >
                    <p>
                      Essa ação inclui apenas o perfil autorizado. Respostas
                      privadas e contatos permanecem fora do site. A publicação
                      do CMS é uma etapa posterior.
                    </p>
                  </ApiForm>
                )}
            </section>
          )}
          <a
            href={`/admin/${organization.id}/events/${eventId}/editions/${editionId}/applications`}
          >
            Voltar à fila
          </a>
        </>
      )}
    </Panel>
  );
}
