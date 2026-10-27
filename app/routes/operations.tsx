import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import { useEffect, useState } from "react";
import type { Route } from "./+types/operations";
import { requireTenant } from "../services/tenant.server";
import { operationPermissions } from "../services/operations.server";
import { contentDocumentSchema, starterContent } from "../domain/content";
import { type OperationKind } from "../domain/operations";
import { Panel, ApiForm } from "../components/panel";

const labels = {
  stages: "Palcos",
  program: "Programação",
  guests: "Convidados",
  exhibitors: "Expositores",
  sponsors: "Patrocinadores",
};
export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const ctx = await requireTenant(request, env, params.orgId, "org.read");
    const edition = await env.DB.prepare(
      "SELECT id,event_id,name,status,time_zone FROM editions WHERE organization_id=? AND id=? AND event_id=?",
    )
      .bind(params.orgId, params.editionId, params.eventId)
      .first<{
        id: string;
        event_id: string;
        name: string;
        status: string;
        time_zone: string;
      }>();
    if (!edition) throw new Response("Edição não encontrada", { status: 404 });
    await requireTenant(
      request,
      env,
      params.orgId,
      "content.read",
      edition.event_id,
    );
    const row = await env.DB.prepare(
      "SELECT revision,content_json FROM content_drafts WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 1",
    )
      .bind(params.orgId, edition.id)
      .first<{ revision: number; content_json: string }>();
    const content = contentDocumentSchema.parse(
      row ? JSON.parse(row.content_json) : starterContent,
    );
    const editable: OperationKind[] = [];
    for (const kind of Object.keys(labels) as OperationKind[]) {
      try {
        await requireTenant(
          request,
          env,
          params.orgId,
          operationPermissions[kind],
          edition.event_id,
        );
        editable.push(kind);
      } catch (error) {
        if (!(error instanceof Response && error.status === 403)) throw error;
      }
    }
    return {
      organization: ctx.organization,
      edition,
      revision: row?.revision ?? 0,
      operations: content.operations,
      editable,
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401)
      throw redirect("/login");
    throw error;
  }
}

export default function OperationsPage({ loaderData }: Route.ComponentProps) {
  const { organization, edition, revision, operations, editable } = loaderData;
  // SSR sends controlled form controls before React can attach event handlers.
  // A user (or fast browser test) changing the select during that gap would
  // lose the selection on hydration and submit the wrong operation kind.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [kind, setKind] = useState<OperationKind>("program");
  const [selected, setSelected] = useState("");
  const item = operations[kind].find((i) => i.id === selected);
  const profile = item && "name" in item ? item : undefined;
  const program = item && "title" in item ? item : undefined;
  const canEdit = editable.includes(kind) && edition.status !== "archived";
  const endpoint = `/api/v1/orgs/${organization.id}/editions/${edition.id}/${kind}${selected ? `/${selected}` : ""}`;
  return (
    <Panel name={organization.name}>
      <a href={`/admin/${organization.id}/events/${edition.event_id}`}>
        ← Edições
      </a>
      <p className="eyebrow">OPERAÇÃO DA EDIÇÃO</p>
      <h1>Programação e participantes</h1>
      <p>
        {edition.name} · Fuso {edition.time_zone}
      </p>
      <p className="notice">
        Alterações são salvas no rascunho do site. Revise e publique em{" "}
        <a
          href={`/admin/${organization.id}/events/${edition.event_id}/editions/${edition.id}/cms`}
        >
          Conteúdo e publicação
        </a>{" "}
        para atualizar o público.
      </p>
      <div className="form-grid">
        <label>
          Cadastro
          <select
            aria-label="Cadastro"
            disabled={!hydrated}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as OperationKind);
              setSelected("");
            }}
          >
            {(Object.keys(labels) as OperationKind[]).map((k) => (
              <option value={k} key={k}>
                {labels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Registro
          <select
            aria-label="Registro"
            disabled={!hydrated}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Novo registro</option>
            {operations[kind].map((i) => (
              <option key={i.id} value={i.id}>
                {"title" in i ? i.title : i.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="section-card">
        <h2>
          {selected ? "Editar" : "Adicionar"} {labels[kind].toLowerCase()}
        </h2>
        {canEdit ? (
          <ApiForm
            key={`${kind}-${selected}`}
            endpoint={endpoint}
            method={selected ? "PATCH" : "POST"}
            label="Salvar no rascunho"
            transform={(form) => {
              const data: Record<string, unknown> =
                kind === "program"
                  ? {
                      title: form.get("title"),
                      description: form.get("description"),
                      stageId: form.get("stageId"),
                      startAt: new Date(
                        `${form.get("startAt")}:00Z`,
                      ).toISOString(),
                      endAt: new Date(`${form.get("endAt")}:00Z`).toISOString(),
                      guestIds: form.getAll("guestIds"),
                      status: form.get("status"),
                    }
                  : kind === "stages"
                    ? {
                        name: form.get("name"),
                        accessibility: form.get("accessibility"),
                      }
                    : {
                        name: form.get("name"),
                        description: form.get("description"),
                        website: form.get("website"),
                        status: form.get("status"),
                        ...(form.get("imageAssetId")
                          ? { imageAssetId: form.get("imageAssetId") }
                          : {}),
                        ...(kind === "exhibitors"
                          ? {
                              category: form.get("category"),
                              publicOptIn: form.get("publicOptIn") === "on",
                            }
                          : {}),
                        ...(kind === "sponsors"
                          ? {
                              category: form.get("category"),
                              order: Number(form.get("order")),
                            }
                          : {}),
                      };
              return { expectedRevision: revision, data };
            }}
          >
            {kind === "program" ? (
              <>
                <label>
                  Título
                  <input
                    name="title"
                    defaultValue={program?.title}
                    required
                    maxLength={180}
                  />
                </label>
                <label>
                  Palco
                  <select
                    name="stageId"
                    defaultValue={program?.stageId}
                    required
                  >
                    {operations.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Início (UTC)
                  <input
                    type="datetime-local"
                    name="startAt"
                    defaultValue={program?.startAt.slice(0, 16)}
                    required
                  />
                </label>
                <label>
                  Término (UTC)
                  <input
                    type="datetime-local"
                    name="endAt"
                    defaultValue={program?.endAt.slice(0, 16)}
                    required
                  />
                </label>
                <fieldset>
                  <legend>Convidados participantes</legend>
                  {operations.guests.map((g) => (
                    <label key={g.id}>
                      <input
                        type="checkbox"
                        name="guestIds"
                        value={g.id}
                        defaultChecked={program?.guestIds.includes(g.id)}
                      />
                      {g.name}
                    </label>
                  ))}
                </fieldset>
              </>
            ) : (
              <label>
                Nome
                <input
                  name="name"
                  defaultValue={profile?.name}
                  required
                  maxLength={180}
                />
              </label>
            )}
            {kind === "stages" ? (
              <label>
                Acessibilidade
                <textarea
                  name="accessibility"
                  defaultValue={
                    profile && "accessibility" in profile
                      ? profile.accessibility
                      : ""
                  }
                  maxLength={3000}
                />
              </label>
            ) : (
              <>
                <label>
                  Descrição pública
                  <textarea
                    name="description"
                    defaultValue={
                      item && "description" in item ? item.description : ""
                    }
                    maxLength={3000}
                  />
                </label>
                <label>
                  Visibilidade na próxima publicação
                  <select
                    name="status"
                    defaultValue={
                      item && "status" in item ? item.status : "draft"
                    }
                  >
                    <option value="draft">Ainda em preparação</option>
                    <option value="public">Pronto para publicar</option>
                  </select>
                </label>
                {kind !== "program" && (
                  <>
                    <label>
                      Site (HTTPS)
                      <input
                        name="website"
                        type="url"
                        defaultValue={
                          profile && "website" in profile ? profile.website : ""
                        }
                      />
                    </label>
                    <label>
                      Imagem da biblioteca (opcional)
                      <input
                        name="imageAssetId"
                        defaultValue={
                          profile && "imageAssetId" in profile
                            ? profile.imageAssetId
                            : ""
                        }
                      />
                    </label>
                  </>
                )}
                {(kind === "exhibitors" || kind === "sponsors") && (
                  <label>
                    Categoria
                    <input
                      name="category"
                      defaultValue={
                        profile && "category" in profile
                          ? String(profile.category)
                          : ""
                      }
                      maxLength={100}
                    />
                  </label>
                )}
                {kind === "sponsors" && (
                  <label>
                    Ordem
                    <input
                      name="order"
                      type="number"
                      defaultValue={
                        profile && "order" in profile
                          ? Number(profile.order)
                          : 0
                      }
                      min={0}
                    />
                  </label>
                )}
                {kind === "exhibitors" && (
                  <label>
                    <input
                      type="checkbox"
                      name="publicOptIn"
                      defaultChecked={
                        profile && "publicOptIn" in profile
                          ? profile.publicOptIn === true
                          : false
                      }
                    />
                    Tenho autorização para a listagem pública deste expositor
                  </label>
                )}
              </>
            )}
          </ApiForm>
        ) : (
          <p>
            Você pode consultar os cadastros. Alterações exigem permissão para
            esta edição.
          </p>
        )}
        {canEdit && selected && (
          <ApiForm
            endpoint={endpoint}
            method="DELETE"
            label="Retirar do rascunho"
            transform={() => ({ expectedRevision: revision })}
          >
            <p>Revisões anteriores permanecem no histórico.</p>
          </ApiForm>
        )}
      </section>
      <section className="section-card">
        <h2>{labels[kind]} no rascunho</h2>
        {operations[kind].map((i) => (
          <article key={i.id}>
            <h3>{"title" in i ? i.title : i.name}</h3>
            {"startAt" in i && (
              <p>
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone: edition.time_zone,
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(i.startAt))}
              </p>
            )}
            {"status" in i && (
              <p>
                {i.status === "public"
                  ? "Pronto para publicar"
                  : "Em preparação"}
              </p>
            )}
          </article>
        ))}
        {!operations[kind].length && (
          <p>Ainda não há registros neste cadastro.</p>
        )}
      </section>
    </Panel>
  );
}
