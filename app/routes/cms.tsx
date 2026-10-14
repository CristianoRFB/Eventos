import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import type { Route } from "./+types/cms";
import { ContentEditor } from "../components/content-editor";
import { Panel } from "../components/panel";
import { contentDocumentSchema, starterContent } from "../domain/content";
import { requireTenant } from "../services/tenant.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const ctx = await requireTenant(request, env, params.orgId, "org.read");
    const edition = await env.DB.prepare(
      "SELECT id,event_id,name,status FROM editions WHERE organization_id=? AND id=?",
    )
      .bind(params.orgId, params.editionId)
      .first<{ id: string; event_id: string; name: string; status: string }>();
    if (!edition) throw new Response("Edição não encontrada", { status: 404 });
    await requireTenant(
      request,
      env,
      params.orgId,
      "content.read",
      edition.event_id,
    );
    const event = await env.DB.prepare(
      "SELECT id,name FROM events WHERE organization_id=? AND id=?",
    )
      .bind(params.orgId, edition.event_id)
      .first<{ id: string; name: string }>();
    if (!event) throw new Response("Evento não encontrado", { status: 404 });
    const [draft, publications, current] = await Promise.all([
      env.DB.prepare(
        "SELECT id,revision,content_json FROM content_drafts WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 1",
      )
        .bind(params.orgId, edition.id)
        .first<{ id: string; revision: number; content_json: string }>(),
      env.DB.prepare(
        "SELECT id,revision,rollback_of_id,created_at FROM publications WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 100",
      )
        .bind(params.orgId, edition.id)
        .all<{
          id: string;
          revision: number;
          rollback_of_id: string | null;
          created_at: string;
        }>(),
      env.DB.prepare(
        "SELECT publication_id,revision FROM edition_publication_pointers WHERE organization_id=? AND edition_id=?",
      )
        .bind(params.orgId, edition.id)
        .first<{ publication_id: string; revision: number }>(),
    ]);
    const content = draft
      ? contentDocumentSchema.parse(JSON.parse(draft.content_json))
      : starterContent;
    const role = ctx.member.role;
    return {
      organization: ctx.organization,
      event,
      edition,
      draftRevision: draft?.revision ?? 0,
      content,
      publications: publications.results,
      current: current ?? null,
      canPublish: [
        "organization_owner",
        "organization_admin",
        "event_manager",
        "publisher",
      ].includes(role),
      isArchived: edition.status === "archived",
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401)
      throw redirect("/login");
    throw error;
  }
}

export default function Cms({ loaderData }: Route.ComponentProps) {
  const {
    organization,
    event,
    edition,
    draftRevision,
    content,
    publications,
    current,
    canPublish,
    isArchived,
  } = loaderData;
  const endpoint = `/api/v1/orgs/${organization.id}/editions/${edition.id}`;
  return (
    <Panel name={organization.name}>
      <a
        className="muted"
        href={`/admin/${organization.id}/events/${event.id}`}
      >
        ← {event.name}
      </a>
      <p className="eyebrow">SITE DA EDIÇÃO</p>
      <h1>Conteúdo: {edition.name}</h1>
      <p className="muted">
        Edições mantêm rascunhos e publicações separados. O site público só muda
        quando uma pessoa com permissão publica.
      </p>
      {isArchived && (
        <p className="notice">
          Esta edição foi arquivada e não pode receber novas alterações.
        </p>
      )}
      <ContentEditor
        endpoint={endpoint}
        initialRevision={draftRevision}
        initialContent={content}
        revisions={{ drafts: [], publications, current }}
        canPublish={canPublish}
        disabled={isArchived}
      />
    </Panel>
  );
}
