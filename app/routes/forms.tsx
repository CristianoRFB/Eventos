import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/forms";
import { editionFormContext } from "../services/forms.server";
import { formDefinitionSchema, type FormDefinition } from "../domain/forms";
import { Panel, ApiForm } from "../components/panel";

export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const { edition, actor } = await editionFormContext(
      request,
      env,
      params.orgId,
      params.editionId,
      "forms.manage",
    );
    if (edition.event_id !== params.eventId)
      throw new Response("Edição não encontrada", { status: 404 });
    const list = await env.DB.prepare(
      "SELECT id,name,state,revision FROM forms WHERE organization_id=? AND edition_id=? ORDER BY created_at DESC LIMIT 100",
    )
      .bind(params.orgId, edition.id)
      .all<{ id: string; name: string; state: string; revision: number }>();
    const selectedId = new URL(request.url).searchParams.get("form");
    const selected = list.results.find((f) => f.id === selectedId) ?? null;
    const definitions = selected
      ? await env.DB.prepare(
          "SELECT id,revision,definition_json FROM form_definitions WHERE organization_id=? AND form_id=? ORDER BY revision DESC LIMIT 50",
        )
          .bind(params.orgId, selected.id)
          .all<{ id: string; revision: number; definition_json: string }>()
      : { results: [] };
    const draft = await env.DB.prepare(
      "SELECT revision FROM content_drafts WHERE organization_id=? AND edition_id=? ORDER BY revision DESC LIMIT 1",
    )
      .bind(params.orgId, edition.id)
      .first<{ revision: number }>();
    return {
      organization: actor.organization,
      edition,
      forms: list.results,
      selected,
      definitions: definitions.results.map((d) => ({
        id: d.id,
        revision: d.revision,
        definition: formDefinitionSchema.parse(JSON.parse(d.definition_json)),
      })),
      draftRevision: draft?.revision ?? 0,
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401)
      throw redirect("/login");
    throw error;
  }
}
const initialFields: FormDefinition["fields"] = [
  {
    key: "contato_email",
    label: "E-mail para contato profissional",
    type: "email",
    required: true,
    options: [],
  },
];
function FormBuilder({
  endpoint,
  initial,
  revision,
  onCreated,
}: {
  endpoint: string;
  initial?: FormDefinition;
  revision?: number;
  onCreated?: (result: Record<string, unknown>) => void;
}) {
  const [fields, setFields] = useState(initial?.fields ?? initialFields);
  function update(
    index: number,
    changes: Partial<FormDefinition["fields"][number]>,
  ) {
    setFields((previous) =>
      previous.map((f, i) => (i === index ? { ...f, ...changes } : f)),
    );
  }
  return (
    <ApiForm
      endpoint={endpoint}
      label="Salvar versão do formulário"
      onSuccess={onCreated}
      transform={(form) => ({
        ...(revision ? { expectedRevision: revision } : {}),
        definition: {
          name: form.get("name"),
          privacyNotice: form.get("privacyNotice"),
          consentLabel: form.get("consentLabel"),
          retentionDays: Number(form.get("retentionDays")),
          ...(form.get("deadline")
            ? {
                deadlineAt: new Date(
                  `${form.get("deadline")}:00Z`,
                ).toISOString(),
              }
            : {}),
          fields,
        },
      })}
    >
      <label>
        Nome do formulário
        <input
          name="name"
          defaultValue={initial?.name}
          required
          maxLength={180}
        />
      </label>
      <label>
        Retenção em dias
        <input
          type="number"
          name="retentionDays"
          defaultValue={initial?.retentionDays}
          required
          min={1}
          max={365}
        />
      </label>
      <label>
        Aviso de privacidade e finalidade
        <textarea
          name="privacyNotice"
          defaultValue={initial?.privacyNotice}
          required
          minLength={20}
          maxLength={4000}
        />
      </label>
      <label>
        Texto do aceite de privacidade
        <input
          name="consentLabel"
          defaultValue={initial?.consentLabel}
          required
          minLength={8}
          maxLength={300}
        />
      </label>
      <label>
        Prazo final de envio (UTC, opcional)
        <input
          type="datetime-local"
          name="deadline"
          defaultValue={initial?.deadlineAt?.slice(0, 16)}
        />
      </label>
      <p>
        O prazo de retenção é uma escolha da organizadora conforme a finalidade
        informada. Contatos e respostas são privados. Documentos pessoais não
        são campos padrão.
      </p>
      <div className="full-span">
        <h3>Campos</h3>
        {fields.map((field, index) => (
          <fieldset key={field.key} className="section-card">
            <legend>Campo {index + 1}</legend>
            <label>
              Pergunta {index + 1}
              <input
                value={field.label}
                onChange={(e) => update(index, { label: e.target.value })}
                required
                maxLength={180}
              />
            </label>
            <label>
              Tipo da pergunta {index + 1}
              <select
                aria-label={`Tipo da pergunta ${index + 1}`}
                value={field.type}
                onChange={(e) =>
                  update(index, { type: e.target.value as typeof field.type })
                }
              >
                <option value="text">Resposta curta</option>
                <option value="paragraph">Resposta longa</option>
                <option value="email">E-mail</option>
                <option value="url">Site HTTPS</option>
                <option value="category">Categoria</option>
                <option value="checkbox">Confirmação</option>
              </select>
            </label>
            {field.type === "category" && (
              <label>
                Categorias (uma por linha)
                <textarea
                  value={field.options.join("\n")}
                  onChange={(e) =>
                    update(index, { options: e.target.value.split("\n") })
                  }
                  required
                />
              </label>
            )}
            <label>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => update(index, { required: e.target.checked })}
              />
              Obrigatória
            </label>
            <button
              className="button light"
              type="button"
              onClick={() =>
                setFields((previous) => previous.filter((_, i) => i !== index))
              }
              disabled={fields.length === 1}
            >
              Retirar campo {index + 1}
            </button>
          </fieldset>
        ))}
        <button
          className="button light"
          type="button"
          disabled={fields.length >= 20}
          onClick={() =>
            setFields((previous) => [
              ...previous,
              {
                key: `campo_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
                label: "Nova pergunta",
                type: "text",
                required: false,
                options: [],
              },
            ])
          }
        >
          Adicionar pergunta
        </button>
      </div>
    </ApiForm>
  );
}
export default function FormsPage({ loaderData }: Route.ComponentProps) {
  const { organization, edition, forms, selected, definitions, draftRevision } =
    loaderData;
  const base = `/api/v1/orgs/${organization.id}/editions/${edition.id}/forms`;
  const current = definitions[0];
  return (
    <Panel name={organization.name}>
      <a href={`/admin/${organization.id}/events/${edition.event_id}`}>
        ← Edições
      </a>
      <h1>Formulários da edição</h1>
      <p>
        As versões anteriores continuam vinculadas aos seus envios. Um
        formulário só aparece no site após preparação e publicação do rascunho.
      </p>
      <nav aria-label="Formulários">
        <a className="button light" href="?">
          Novo formulário
        </a>
        {forms.map((form) => (
          <a
            className="button light"
            key={form.id}
            href={`?form=${encodeURIComponent(form.id)}`}
          >
            {form.name}
          </a>
        ))}
      </nav>
      <section className="section-card">
        <h2>{selected ? `Editar ${selected.name}` : "Criar formulário"}</h2>
        <FormBuilder
          key={selected?.id ?? "new"}
          endpoint={selected ? `${base}/${selected.id}/definitions` : base}
          initial={current?.definition}
          revision={selected?.revision}
          onCreated={
            !selected
              ? (result) => {
                  if (typeof result.id === "string")
                    window.location.search = `?form=${encodeURIComponent(result.id)}`;
                }
              : undefined
          }
        />
      </section>
      {selected && current && (
        <>
          <section className="section-card">
            <h2>Recebimento e publicação</h2>
            <p>
              Recebimento:{" "}
              {selected.state === "open"
                ? "aberto"
                : selected.state === "closed"
                  ? "encerrado"
                  : "em preparação"}
              . Abrir o recebimento não publica uma versão no site.
            </p>
            <ApiForm
              endpoint={`${base}/${selected.id}/state`}
              label={
                selected.state === "open"
                  ? "Encerrar recebimento"
                  : "Abrir recebimento"
              }
              transform={() => ({
                expectedRevision: selected.revision,
                state: selected.state === "open" ? "closed" : "open",
              })}
            >
              <p>
                O encerramento é imediato, preservando as candidaturas
                existentes.
              </p>
            </ApiForm>
            <ApiForm
              endpoint={`${base}/${selected.id}/stage`}
              label="Preparar formulário no rascunho do site"
              transform={() => ({
                expectedDraftRevision: draftRevision,
                definitionId: current.id,
              })}
            >
              <p>
                A versão {current.revision} será incluída na próxima publicação
                editorial.
              </p>
            </ApiForm>
            <a
              className="button"
              href={`/admin/${organization.id}/events/${edition.event_id}/editions/${edition.id}/cms`}
            >
              Revisar e publicar o site
            </a>
          </section>
          <section className="section-card">
            <h2>Histórico de versões</h2>
            {definitions.map((def) => (
              <p key={def.id}>
                Versão {def.revision} · {def.definition.fields.length} perguntas
                · {def.definition.name}
              </p>
            ))}
          </section>
        </>
      )}
    </Panel>
  );
}
