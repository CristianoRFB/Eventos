import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import type { Route } from "./+types/admin";
import { handleApi } from "../services/api.server";
import { Panel } from "../components/panel";
export async function loader({ request }: Route.LoaderArgs) {
  try {
    const response = await handleApi(
      new Request(new URL("/api/v1/me", request.url), {
        headers: request.headers,
      }),
      env,
    );
    return (await response.json()) as {
      user: { name: string };
      memberships: {
        organization_id: string;
        name: string;
        role: string;
        status: string;
      }[];
      isPlatformOwner: boolean;
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401)
      throw redirect("/login");
    throw error;
  }
}
export default function Admin({ loaderData }: Route.ComponentProps) {
  return (
    <Panel name={loaderData.user.name}>
      <div className="eyebrow">VISÃO GERAL</div>
      <h1>Suas organizadoras.</h1>
      <p className="muted">Escolha o espaço em que você vai trabalhar hoje.</p>
      <div className="org-grid">
        {loaderData.memberships.map((org) => (
          <a
            className="org-card"
            key={org.organization_id}
            href={`/admin/${org.organization_id}`}
          >
            <span className="badge">
              {org.status === "active" ? "Ativa" : "Suspensa"}
            </span>
            <h2>{org.name}</h2>
            <p>Abrir espaço de trabalho ↗</p>
          </a>
        ))}
      </div>
      {loaderData.memberships.length === 0 && (
        <p>Você ainda não possui vínculos com uma organizadora.</p>
      )}
      {loaderData.isPlatformOwner && (
        <a className="button" href="/platform">
          Administrar plataforma ↗
        </a>
      )}
    </Panel>
  );
}
