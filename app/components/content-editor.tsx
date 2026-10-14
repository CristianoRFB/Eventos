import { useState } from "react";
import type { ContentDocument, ContentSection } from "../domain/content";

type EditorFields = {
  siteName: string;
  title: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutBody: string;
  faqTitle: string;
  faqQuestion: string;
  faqAnswer: string;
};

function fieldsFromContent(content: ContentDocument): EditorFields {
  const home = content.pages.find((page) => page.slug === "home");
  const faqPage = content.pages.find((page) => page.slug === "faq");
  const hero = home?.sections.find((section) => section.type === "hero");
  const about = home?.sections.find((section) => section.type === "text");
  const faq = (faqPage?.sections ?? home?.sections ?? []).find(
    (section) => section.type === "faq",
  );
  return {
    siteName: content.siteName,
    title: content.title,
    description: content.description,
    heroTitle: hero?.title ?? "",
    heroSubtitle: hero?.subtitle ?? "",
    aboutTitle: about?.title ?? "Sobre o evento",
    aboutBody: about?.body ?? "",
    faqTitle: faq?.title ?? "Perguntas frequentes",
    faqQuestion: faq?.items[0]?.question ?? "",
    faqAnswer: faq?.items[0]?.answer ?? "",
  };
}

function contentFromFields(
  base: ContentDocument,
  fields: EditorFields,
): ContentDocument {
  const content = structuredClone(base);
  content.siteName = fields.siteName;
  content.title = fields.title;
  content.description = fields.description;
  let home = content.pages.find((page) => page.slug === "home");
  if (!home) {
    home = { slug: "home", title: "Início", description: "", sections: [] };
    content.pages.unshift(home);
  }
  const heroIndex = home.sections.findIndex(
    (section) => section.type === "hero",
  );
  const hero: ContentSection = {
    type: "hero",
    title: fields.heroTitle,
    subtitle: fields.heroSubtitle,
    ...(heroIndex >= 0 && home.sections[heroIndex]?.type === "hero"
      ? { imageAssetId: home.sections[heroIndex].imageAssetId }
      : {}),
  };
  if (heroIndex >= 0) home.sections[heroIndex] = hero;
  else home.sections.unshift(hero);
  const aboutIndex = home.sections.findIndex(
    (section) => section.type === "text",
  );
  const about: ContentSection = {
    type: "text",
    title: fields.aboutTitle,
    body: fields.aboutBody,
  };
  if (aboutIndex >= 0) home.sections[aboutIndex] = about;
  else home.sections.push(about);

  let faqPage = content.pages.find((page) => page.slug === "faq");
  if (!faqPage) {
    faqPage = {
      slug: "faq",
      title: fields.faqTitle,
      description: "Respostas às dúvidas frequentes.",
      sections: [],
    };
    content.pages.push(faqPage);
  }
  faqPage.title = fields.faqTitle;
  const faqIndex = faqPage.sections.findIndex(
    (section) => section.type === "faq",
  );
  const existingFaq =
    faqIndex >= 0 && faqPage.sections[faqIndex]?.type === "faq"
      ? faqPage.sections[faqIndex]
      : null;
  const faq: ContentSection = {
    type: "faq",
    title: fields.faqTitle,
    items: [
      { question: fields.faqQuestion, answer: fields.faqAnswer },
      ...(existingFaq?.items.slice(1) ?? []),
    ],
  };
  if (faqIndex >= 0) faqPage.sections[faqIndex] = faq;
  else faqPage.sections.push(faq);
  return content;
}

type RevisionData = {
  drafts: { id: string; revision: number; created_at: string }[];
  publications: {
    id: string;
    revision: number;
    rollback_of_id: string | null;
    created_at: string;
  }[];
  current: { publication_id: string; revision: number } | null;
};

export function ContentEditor({
  endpoint,
  initialRevision,
  initialContent,
  revisions,
  canPublish,
  disabled = false,
}: {
  endpoint: string;
  initialRevision: number;
  initialContent: ContentDocument;
  revisions: RevisionData;
  canPublish: boolean;
  disabled?: boolean;
}) {
  const [revision, setRevision] = useState(initialRevision);
  const [publishedRevision, setPublishedRevision] = useState(
    revisions.current?.revision ?? 0,
  );
  const [baseContent, setBaseContent] = useState(initialContent);
  const [fields, setFields] = useState(() => fieldsFromContent(initialContent));
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [published, setPublished] = useState(revisions.publications);

  async function send(action: string, payload: unknown) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`${endpoint}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        revision?: number;
        publicationId?: string;
        url?: string;
        rollbackOf?: string;
        cache?: string;
      };
      if (!response.ok) {
        setMessage(result.error ?? "Não foi possível concluir a operação.");
        return null;
      }
      return result;
    } catch {
      setMessage("Não foi possível conectar. Tente novamente.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function save() {
    const content = contentFromFields(baseContent, fields);
    const result = await send("draft", { expectedRevision: revision, content });
    if (result?.revision) {
      setRevision(result.revision);
      setBaseContent(content);
      setMessage(
        `Rascunho ${result.revision} salvo. A página pública continua na versão publicada.`,
      );
    }
  }

  async function createPreview() {
    const result = await send("preview", { draftRevision: revision });
    if (result?.url) window.location.href = result.url;
  }

  async function publishDraft() {
    const result = await send("publish", {
      draftRevision: revision,
      expectedPublicationRevision: publishedRevision,
    });
    if (result?.publicationId && result.revision) {
      setPublishedRevision(result.revision);
      setPublished((current) => [
        {
          id: result.publicationId!,
          revision: result.revision!,
          rollback_of_id: null,
          created_at: new Date().toISOString(),
        },
        ...current,
      ]);
      setMessage(
        `Versão ${result.revision} publicada. O cache público usa um TTL curto enquanto a invalidação automática está pendente.`,
      );
    }
  }

  async function rollback(publicationId: string) {
    const result = await send("rollback", {
      targetPublicationId: publicationId,
      expectedPublicationRevision: publishedRevision,
    });
    if (result?.publicationId && result.revision) {
      setPublishedRevision(result.revision);
      setPublished((current) => [
        {
          id: result.publicationId!,
          revision: result.revision!,
          rollback_of_id: publicationId,
          created_at: new Date().toISOString(),
        },
        ...current,
      ]);
      setMessage(
        `Nova versão ${result.revision} criada a partir da versão escolhida. O histórico foi preservado.`,
      );
    }
  }

  return (
    <div className="cms-layout">
      <section className="section-card cms-editor">
        <div className="section-title">
          <h2>Conteúdo do rascunho</h2>
          <span className="badge">Rascunho {revision || "novo"}</span>
        </div>
        <p className="muted">
          Atualize os campos da edição. O rascunho fica privado até uma pessoa
          publicadora aprovar a versão.
        </p>
        <div className="cms-fields">
          <label>
            Nome do site
            <input
              value={fields.siteName}
              maxLength={180}
              disabled={disabled}
              onChange={(event) =>
                setFields({ ...fields, siteName: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Título para buscadores
            <input
              value={fields.title}
              maxLength={180}
              disabled={disabled}
              onChange={(event) =>
                setFields({ ...fields, title: event.currentTarget.value })
              }
            />
          </label>
          <label className="cms-wide">
            Descrição do site
            <textarea
              value={fields.description}
              maxLength={320}
              rows={3}
              disabled={disabled}
              onChange={(event) =>
                setFields({ ...fields, description: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Destaque principal
            <input
              value={fields.heroTitle}
              maxLength={180}
              disabled={disabled}
              onChange={(event) =>
                setFields({ ...fields, heroTitle: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Complemento do destaque
            <input
              value={fields.heroSubtitle}
              maxLength={500}
              disabled={disabled}
              onChange={(event) =>
                setFields({
                  ...fields,
                  heroSubtitle: event.currentTarget.value,
                })
              }
            />
          </label>
          <label>
            Sobre o evento
            <input
              value={fields.aboutTitle}
              maxLength={180}
              disabled={disabled}
              onChange={(event) =>
                setFields({ ...fields, aboutTitle: event.currentTarget.value })
              }
            />
          </label>
          <label className="cms-wide">
            Apresentação
            <textarea
              value={fields.aboutBody}
              maxLength={3000}
              rows={5}
              disabled={disabled}
              onChange={(event) =>
                setFields({ ...fields, aboutBody: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Perguntas frequentes
            <input
              value={fields.faqTitle}
              maxLength={180}
              disabled={disabled}
              onChange={(event) =>
                setFields({ ...fields, faqTitle: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Pergunta
            <input
              value={fields.faqQuestion}
              maxLength={180}
              disabled={disabled}
              onChange={(event) =>
                setFields({ ...fields, faqQuestion: event.currentTarget.value })
              }
            />
          </label>
          <label className="cms-wide">
            Resposta
            <textarea
              value={fields.faqAnswer}
              maxLength={3000}
              rows={4}
              disabled={disabled}
              onChange={(event) =>
                setFields({ ...fields, faqAnswer: event.currentTarget.value })
              }
            />
          </label>
        </div>
        <div className="cms-actions">
          <button
            className="button"
            disabled={pending || disabled}
            onClick={() => void save()}
          >
            Salvar rascunho
          </button>
          <button
            className="button light"
            disabled={pending || disabled || revision < 1}
            onClick={() => void createPreview()}
          >
            Abrir prévia privada
          </button>
          {canPublish && (
            <button
              className="button"
              disabled={pending || disabled || revision < 1}
              onClick={() => void publishDraft()}
            >
              Publicar versão {revision || ""}
            </button>
          )}
        </div>
        <p className="form-message" role="status" aria-live="polite">
          {pending ? "Salvando…" : message}
        </p>
      </section>
      <section className="section-card">
        <div className="section-title">
          <h2>Histórico publicado</h2>
          <span className="badge">Atual {publishedRevision || "nenhuma"}</span>
        </div>
        <p className="muted">
          Cada publicação cria um snapshot imutável. Voltar a uma versão cria um
          novo registro auditável.
        </p>
        {published.map((item) => (
          <article className="revision-row" key={item.id}>
            <div>
              <strong>Publicação {item.revision}</strong>
              <p className="muted">
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(item.created_at))}
                {item.rollback_of_id ? " · rollback registrado" : ""}
              </p>
            </div>
            {canPublish && item.revision !== publishedRevision && (
              <button
                className="button light"
                disabled={pending || disabled}
                onClick={() => void rollback(item.id)}
              >
                Restaurar esta versão
              </button>
            )}
          </article>
        ))}
        {!published.length && (
          <p>
            Nenhuma publicação ainda. O público continuará vendo “não publicado”
            até a primeira aprovação.
          </p>
        )}
      </section>
    </div>
  );
}
