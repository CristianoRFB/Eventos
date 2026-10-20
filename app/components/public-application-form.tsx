import { useRef, useState, type FormEvent } from "react";
import type { PublicForm } from "../domain/forms";

export function PublicApplicationForm({
  form,
  open,
  preview = false,
}: {
  form: PublicForm;
  open: boolean;
  preview?: boolean;
}) {
  const key = useRef<string | null>(null);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [listing, setListing] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    const answers = Object.fromEntries(
      form.definition.fields.map((field) => [
        field.key,
        field.type === "checkbox"
          ? values.get(field.key) === "on"
          : String(values.get(field.key) ?? ""),
      ]),
    );
    try {
      if (!key.current) {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes, (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        key.current = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      }
      const response = await fetch(`/api/v1/public/forms/${form.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          definitionId: form.definitionId,
          idempotencyKey: key.current,
          answers,
          privacyAccepted: values.get("privacyAccepted") === "on",
          listingOptIn: listing,
          websiteTrap: values.get("websiteTrap") ?? "",
          ...(listing
            ? {
                publicProfile: {
                  name: values.get("profileName"),
                  description: values.get("profileDescription"),
                  category: values.get("profileCategory"),
                  website: values.get("profileWebsite"),
                },
              }
            : {}),
        }),
      });
      const result = response.headers
        .get("Content-Type")
        ?.includes("application/json")
        ? ((await response.json()) as {
            statusUrl?: string;
            error?: string;
            fields?: { message: string }[];
          })
        : { error: await response.text() };
      if (!response.ok) {
        setMessage(
          result.fields
            ?.map((f) => f.message)
            .slice(0, 4)
            .join(" · ") ||
            result.error ||
            "Confira os campos e tente novamente.",
        );
        return;
      }
      if (result.statusUrl?.startsWith("/candidatura/"))
        window.location.assign(result.statusUrl);
    } catch {
      setMessage(
        "Não foi possível confirmar o envio. Tente novamente; o mesmo código evita duplicação.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="public-section">
      <h2>{form.definition.name}</h2>
      <p style={{ whiteSpace: "pre-line" }}>{form.definition.privacyNotice}</p>
      {!open && !preview ? (
        <p className="notice">
          As inscrições deste formulário estão encerradas.
        </p>
      ) : (
        <form
          aria-label={form.definition.name}
          onSubmit={submit}
          className="form-grid"
        >
          {form.definition.fields.map((field) => (
            <label key={field.key}>
              {field.label}
              {field.required ? " *" : ""}
              {field.type === "checkbox" ? (
                <input
                  type="checkbox"
                  name={field.key}
                  required={field.required}
                />
              ) : field.type === "category" ? (
                <select
                  aria-label={field.label}
                  name={field.key}
                  required={field.required}
                >
                  <option value="">Selecione</option>
                  {field.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : field.type === "paragraph" ? (
                <textarea
                  name={field.key}
                  required={field.required}
                  maxLength={3000}
                />
              ) : (
                <input
                  name={field.key}
                  type={
                    field.type === "email"
                      ? "email"
                      : field.type === "url"
                        ? "url"
                        : "text"
                  }
                  required={field.required}
                  maxLength={
                    field.type === "url"
                      ? 2048
                      : field.type === "email"
                        ? 254
                        : 200
                  }
                />
              )}
            </label>
          ))}
          <div hidden aria-hidden="true">
            <label>
              Deixe este campo vazio
              <input name="websiteTrap" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <fieldset>
            <legend>Privacidade e listagem</legend>
            <label>
              <input type="checkbox" name="privacyAccepted" required />
              {form.definition.consentLabel}
            </label>
            <p>
              Prazo de retenção informado pela organizadora:{" "}
              {form.definition.retentionDays} dias. O recibo privado funciona
              por até {Math.min(14, form.definition.retentionDays)} dias.
            </p>
            <label>
              <input
                type="checkbox"
                checked={listing}
                onChange={(e) => setListing(e.target.checked)}
              />
              Autorizo separadamente a listagem do perfil público abaixo, se
              minha candidatura for aprovada e publicada.
            </label>
          </fieldset>
          {listing && (
            <fieldset>
              <legend>Perfil autorizado para eventual listagem pública</legend>
              <label>
                Nome público
                <input name="profileName" required maxLength={180} />
              </label>
              <label>
                Descrição pública
                <textarea name="profileDescription" maxLength={3000} />
              </label>
              <label>
                Categoria pública
                <input name="profileCategory" maxLength={100} />
              </label>
              <label>
                Site público (HTTPS)
                <input name="profileWebsite" type="url" />
              </label>
              <p>As respostas e o contato do formulário permanecem privados.</p>
            </fieldset>
          )}
          <button
            type="submit"
            className="button"
            disabled={pending || preview}
          >
            {preview
              ? "Envio desabilitado na prévia"
              : pending
                ? "Enviando…"
                : "Enviar candidatura"}
          </button>
          <p role="status">{message}</p>
        </form>
      )}
    </section>
  );
}
