import { env } from "cloudflare:workers";
import { data as routeData, redirect } from "react-router";
import type { Route } from "./+types/public";
import { OperationDirectory } from "../components/operation-directory";
import { publicOperations } from "../domain/operations";
import {
  readPreviewToken,
  resolvePublicSite,
  publicPage,
  findPublicRedirect,
  renderSection,
} from "../services/content.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (params.token) {
    if (url.origin !== new URL(env.ADMIN_ORIGIN).origin)
      throw new Response("Preview não encontrado", { status: 404 });
    const data = await readPreviewToken(env, params.token);
    const content = data.content;
    try {
      content.operations = publicOperations(content.operations);
    } catch {
      throw new Response(
        "A programação pública precisa de perfis de convidados prontos para publicar",
        { status: 400 },
      );
    }
    const previewSlug = url.searchParams.get("page") ?? "home";
    const page = content.pages.find(
      (candidate) => candidate.slug === previewSlug,
    );
    const operationKind = [
      "programacao",
      "convidados",
      "expositores",
      "patrocinadores",
    ].includes(previewSlug)
      ? previewSlug
      : "";
    if (!page && !operationKind)
      throw new Response("Página não encontrada", { status: 404 });
    return routeData(
      {
        mode: "preview" as const,
        siteName: content.siteName,
        title: `${content.title} — prévia`,
        description: content.description,
        canonical: "",
        organizationName: data.organizationName,
        editionName: data.editionName,
        pageTitle: page?.title ?? content.title,
        sections:
          page?.sections.map((section) =>
            renderSection(
              section,
              `/preview/${encodeURIComponent(params.token!)}/assets`,
            ),
          ) ?? [],
        content,
        previewPath: `/preview/${encodeURIComponent(params.token)}`,
        operationKind,
        timeZone: data.timeZone,
        operationFilter: {
          day: url.searchParams.get("day") ?? "",
          stage: url.searchParams.get("stage") ?? "",
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  const site = await resolvePublicSite(request, env);
  const slug = params.slug ?? "home";
  let page = publicPage(site, slug);
  const operationTitles: Record<string, string> = {
    programacao: "Programação",
    convidados: "Convidados",
    expositores: "Expositores",
    patrocinadores: "Patrocinadores",
  };
  if (Object.hasOwn(operationTitles, slug))
    page = {
      slug,
      title: operationTitles[slug]!,
      description: `${operationTitles[slug]} de ${site.eventName}.`,
      sections: [],
    };
  if (!page) {
    const storedRedirect = await findPublicRedirect(env, site, slug);
    if (storedRedirect) {
      const destination =
        storedRedirect.to_slug === "home"
          ? "/"
          : `/${encodeURIComponent(storedRedirect.to_slug)}`;
      throw redirect(
        new URL(destination, url.origin).toString(),
        storedRedirect.status_code,
      );
    }
  }
  if (slug === "edicoes") {
    return routeData(
      {
        mode: "editions" as const,
        site,
        siteName: site.content.siteName,
        title: `Edições — ${site.content.siteName}`,
        description: `Edições de ${site.eventName}.`,
        canonical: `${url.origin}/edicoes`,
        organizationName: site.organizationName,
        editionName: site.editionName,
        pageTitle: "Edições",
        sections: [],
        page: null,
      },
      { headers: publicHeaders(site.publicationRevision) },
    );
  }
  if (slug === "faq") {
    page ??= site.content.pages
      .flatMap((candidate) => candidate.sections)
      .some((section) => section.type === "faq")
      ? {
          slug: "faq",
          title: "Perguntas frequentes",
          description: "Respostas às dúvidas mais comuns.",
          sections: site.content.pages
            .flatMap((candidate) => candidate.sections)
            .filter((section) => section.type === "faq"),
        }
      : null;
  }
  if (!page) throw new Response("Página não encontrada", { status: 404 });
  return routeData(
    {
      mode: "site" as const,
      site,
      siteName: site.content.siteName,
      title:
        page.slug === "home"
          ? site.content.title
          : `${page.title} — ${site.content.siteName}`,
      description: page.description || site.content.description,
      canonical: `${url.origin}${page.slug === "home" ? "/" : `/${encodeURIComponent(page.slug)}`}`,
      organizationName: site.organizationName,
      editionName: site.editionName,
      pageTitle: page.title,
      sections: page.sections.map((section) => renderSection(section)),
      page,
      operationFilter: {
        day: url.searchParams.get("day") ?? "",
        stage: url.searchParams.get("stage") ?? "",
      },
    },
    { headers: publicHeaders(site.publicationRevision) },
  );
}

function publicHeaders(revision: number) {
  return {
    "Cache-Control":
      "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
    "X-Robots-Tag": "index, follow",
    "X-Publication-Revision": String(revision),
    Vary: "Host",
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return publicMeta(loaderData);
}
export function publicMeta(
  loaderData: Route.ComponentProps["loaderData"] | undefined,
) {
  if (!loaderData)
    return [
      { title: "Evento indisponível" },
      { name: "robots", content: "noindex,nofollow" },
    ];
  const data = loaderData;
  const preview = data.mode === "preview";
  return [
    { title: data.title },
    { name: "description", content: data.description },
    { property: "og:title", content: data.title },
    { property: "og:description", content: data.description },
    { property: "og:type", content: "website" },
    ...(!preview && data.canonical
      ? [{ tagName: "link", rel: "canonical", href: data.canonical }]
      : []),
    { name: "robots", content: preview ? "noindex,nofollow" : "index,follow" },
  ];
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

function Section({
  section,
}: {
  section: Route.ComponentProps["loaderData"]["sections"][number];
}) {
  switch (section.type) {
    case "hero":
      return (
        <section className="public-hero">
          {section.imageUrl && (
            <img src={section.imageUrl} alt="" fetchPriority="high" />
          )}
          <p className="public-kicker">
            Uma edição de {section.subtitle || "muitos encontros"}
          </p>
          <h1>{section.title}</h1>
          {section.subtitle && <p>{section.subtitle}</p>}
        </section>
      );
    case "cards":
      return (
        <section className="public-section">
          <h2>{section.title}</h2>
          <div className="public-cards">
            {section.items.map((item, index) => (
              <article key={`${item.title}-${index}`}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      );
    case "text":
      return (
        <section className="public-section">
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </section>
      );
    case "cta":
      return (
        <section className="public-cta">
          <a className="button" href={section.url} rel="noopener noreferrer">
            {section.label} ↗
          </a>
        </section>
      );
    case "faq":
      return (
        <section className="public-section" id="perguntas">
          <h2>{section.title}</h2>
          {section.items.map((item, index) => (
            <details key={`${item.question}-${index}`}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      );
    case "agenda":
      return (
        <section className="public-section">
          <h2>{section.title}</h2>
          <p>
            {section.description || "A programação será divulgada em breve."}
          </p>
          <p className="public-note">
            A programação completa será publicada pela organização.
          </p>
        </section>
      );
    case "sponsors":
      return (
        <section className="public-section">
          <h2>{section.title}</h2>
          <ul className="public-sponsors">
            {section.names.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      );
    case "gallery":
      return (
        <section className="public-section">
          <h2>{section.title}</h2>
          <div className="public-gallery">
            {section.images.map((src) => (
              <img key={src} src={src} alt="" loading="lazy" />
            ))}
          </div>
        </section>
      );
  }
}

export default function PublicPage({
  loaderData,
}: {
  loaderData: Route.ComponentProps["loaderData"];
}) {
  const { mode, siteName, organizationName, editionName, pageTitle, sections } =
    loaderData;
  const site = mode === "preview" ? null : loaderData.site;
  const color =
    site && /^#[\da-f]{6}$/iu.test(site.primaryColor)
      ? site.primaryColor
      : "#173c35";
  const buttonTextColor = site?.buttonTextColor ?? "#ffffff";
  const fontStack =
    site?.fontStack ?? 'Inter, "Segoe UI", system-ui, sans-serif';
  const content = mode === "preview" ? loaderData.content : null;
  const ticketUrl = site?.ticketUrl ?? null;
  const edition = site?.editionName ?? editionName;
  const city = site?.city ?? "";
  const startAt = site?.startAt ?? null;
  const previewPath =
    loaderData.mode === "preview" ? loaderData.previewPath : "";
  const pageUrl = (slug: string) =>
    previewPath
      ? `${previewPath}${slug === "home" ? "" : `?page=${slug}`}`
      : slug === "home"
        ? "/"
        : `/${slug}`;
  const operations = site?.content.operations ?? content?.operations;
  return (
    <div
      className="public-site"
      style={
        {
          "--public-primary": color,
          "--public-button-text": buttonTextColor,
          "--public-font": fontStack,
        } as React.CSSProperties
      }
    >
      <header className="public-header">
        <a className="brand" href={pageUrl("home")}>
          {siteName}
        </a>
        <nav aria-label="Navegação do evento">
          <a href={pageUrl("home")}>Início</a>
          {!previewPath && <a href="/edicoes">Edições</a>}
          {!!operations?.program.length && (
            <a href={pageUrl("programacao")}>Programação</a>
          )}
          {!!operations?.guests.length && (
            <a href={pageUrl("convidados")}>Convidados</a>
          )}
          {!!operations?.exhibitors.length && (
            <a href={pageUrl("expositores")}>Expositores</a>
          )}
          {!!operations?.sponsors.length && (
            <a href={pageUrl("patrocinadores")}>Patrocinadores</a>
          )}
          {(site || content?.pages.some((p) => p.slug === "faq")) && (
            <a href={pageUrl("faq")}>Perguntas</a>
          )}
          {ticketUrl && (
            <a className="button" href={ticketUrl} rel="noopener noreferrer">
              Ingressos ↗
            </a>
          )}
        </nav>
      </header>
      {mode === "preview" && (
        <div className="preview-banner">
          Prévia privada · {organizationName} · {editionName}
        </div>
      )}
      <main className="public-main">
        {loaderData.mode === "editions" ? (
          <section className="public-section">
            <p className="public-kicker">{organizationName}</p>
            <h1>{pageTitle}</h1>
            <article className="edition-card">
              <h2>{edition}</h2>
              {city && <p>{city}</p>}
              {startAt && site && (
                <p>
                  {new Intl.DateTimeFormat("pt-BR", {
                    timeZone: site.timezone,
                    dateStyle: "long",
                  }).format(new Date(startAt))}
                </p>
              )}
              {ticketUrl && (
                <a
                  className="button"
                  href={ticketUrl}
                  rel="noopener noreferrer"
                >
                  Ingressos ↗
                </a>
              )}
            </article>
          </section>
        ) : (
          <>
            {loaderData.mode === "site" && site && (
              <p className="public-kicker">
                {organizationName} · {edition}
                {city ? ` · ${city}` : ""}
                {startAt
                  ? ` · ${new Intl.DateTimeFormat("pt-BR", { timeZone: site.timezone, dateStyle: "long" }).format(new Date(startAt))}`
                  : ""}
              </p>
            )}
            {sections.map((section, index) => (
              <Section section={section} key={`${section.type}-${index}`} />
            ))}
            {loaderData.mode === "preview" && loaderData.operationKind && (
              <OperationDirectory
                ops={loaderData.content.operations}
                kind={loaderData.operationKind}
                timeZone={loaderData.timeZone}
                assetPrefix={`${loaderData.previewPath}/assets`}
                previewPage={loaderData.operationKind}
                {...loaderData.operationFilter}
              />
            )}
            {ticketUrl && (
              <section className="public-cta">
                <a
                  className="button"
                  href={ticketUrl}
                  rel="noopener noreferrer"
                >
                  Ingressos ↗
                </a>
              </section>
            )}
            {loaderData.mode === "site" &&
              [
                "programacao",
                "convidados",
                "expositores",
                "patrocinadores",
              ].includes(loaderData.page.slug) && (
                <OperationDirectory
                  ops={loaderData.site.content.operations}
                  kind={loaderData.page.slug}
                  timeZone={loaderData.site.timezone}
                  {...loaderData.operationFilter}
                />
              )}
            {!sections.length &&
              !(loaderData.mode === "preview" && loaderData.operationKind) &&
              !(
                loaderData.mode === "site" &&
                [
                  "programacao",
                  "convidados",
                  "expositores",
                  "patrocinadores",
                ].includes(loaderData.page.slug)
              ) && (
                <section className="public-section">
                  <h1>{pageTitle}</h1>
                  <p>As informações desta página serão publicadas em breve.</p>
                </section>
              )}
          </>
        )}
      </main>
      <footer className="public-footer">
        <span>{siteName}</span>
        <span>
          {organizationName} · {edition}
        </span>
        {content && <span>Rascunho para revisão</span>}
      </footer>
      {mode === "site" && site && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Event",
              name: site.eventName,
              startDate: site.startAt ?? undefined,
              endDate: site.endAt ?? undefined,
              location: site.city
                ? { "@type": "Place", name: site.city }
                : undefined,
              organizer: { "@type": "Organization", name: organizationName },
              url: loaderData.canonical,
            }).replaceAll("<", "\\u003c"),
          }}
        />
      )}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const status = error instanceof Response ? error.status : 500;
  const message =
    status === 404
      ? "Esta página não está disponível"
      : status === 503
        ? "Este site está temporariamente indisponível"
        : "Não foi possível carregar esta página";
  return (
    <main className="public-error">
      <a className="brand" href="/">
        eventos<span>77</span>
      </a>
      <h1>{message}</h1>
      <p>Confira o endereço ou volte mais tarde.</p>
    </main>
  );
}
