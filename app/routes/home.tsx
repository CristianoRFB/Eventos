import { env } from "cloudflare:workers";
import type { Route } from "./+types/home";
import PublicPage, { loader as publicLoader, publicMeta } from "./public";

export async function loader(args: Route.LoaderArgs) {
  if (new URL(args.request.url).origin === new URL(env.ADMIN_ORIGIN).origin)
    return { mode: "landing" as const };
  return publicLoader({ ...args, params: { slug: "home" } });
}
export function meta({ loaderData }: Route.MetaArgs) {
  if (loaderData && loaderData.mode !== "landing")
    return publicMeta(loaderData);
  return [
    { title: "Eventos 77 — Sua próxima edição começa aqui" },
    {
      name: "description",
      content:
        "Um espaço para sua organizadora, seus eventos e suas próximas edições.",
    },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  if (loaderData.mode !== "landing")
    return <PublicPage loaderData={loaderData} />;
  return (
    <div className="landing">
      <header className="topbar">
        <a className="brand" href="/">
          eventos<span>77</span>
        </a>
        <a className="button light" href="/login">
          Acessar painel ↗
        </a>
      </header>
      <main className="hero">
        <div className="eyebrow">
          <span className="dot" /> Um lugar para cada próxima edição
        </div>
        <h1>
          Grandes encontros.
          <br />
          <em>Uma gestão mais leve.</em>
        </h1>
        <p>
          Da primeira ideia à próxima edição, organize seus eventos em um só
          espaço.
        </p>
        <a className="button" href="/login">
          Entrar na minha organizadora <span>↗</span>
        </a>
        <div className="hero-note">
          Ambiente de desenvolvimento • dados de demonstração fictícios
        </div>
        <section
          className="feature-grid"
          aria-label="O que estamos construindo"
        >
          <article>
            <div className="feature-num">01 / ORGANIZE</div>
            <h2>Um evento, muitas edições.</h2>
            <p>
              Mantenha cada evento e sua história no contexto da sua
              organizadora.
            </p>
          </article>
          <article>
            <div className="feature-num">02 / PREPARE</div>
            <h2>Conteúdo com intenção.</h2>
            <p>
              CMS, programação e publicação fazem parte do escopo em
              desenvolvimento.
            </p>
          </article>
          <article>
            <div className="feature-num">03 / CONECTE</div>
            <h2>Uma identidade própria.</h2>
            <p>
              Um sistema compartilhado, com espaço para a personalidade de cada
              marca.
            </p>
          </article>
        </section>
      </main>
      <footer>
        EVENTOS 77 <span>Desenvolvimento local · 2026</span>
      </footer>
    </div>
  );
}
