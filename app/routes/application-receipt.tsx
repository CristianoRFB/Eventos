import { env } from "cloudflare:workers";
import { data as routeData } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/application-receipt";
import { handlePublicForms } from "../services/forms-public.server";
import { privateHeaders } from "../infrastructure/security.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(
    `/api/v1/public/applications/${encodeURIComponent(params.receipt)}`,
    request.url,
  );
  const response = await handlePublicForms(
    new Request(url, { headers: request.headers }),
    env,
  );
  if (!response.ok) throw response;
  const result = (await response.json()) as {
    status: string;
    applicantMessage: string;
    formName: string;
    expiresAt: string;
  };
  return routeData(
    { ...result, receiptApi: url.pathname },
    { headers: { ...privateHeaders(), "Referrer-Policy": "no-referrer" } },
  );
}
export function meta() {
  return [
    { title: "Recibo privado da candidatura" },
    { name: "robots", content: "noindex,nofollow" },
    { name: "referrer", content: "no-referrer" },
  ];
}
const statusLabels: Record<string, string> = {
  submitted: "Recebida",
  needs_info: "Informações adicionais solicitadas",
  approved: "Aprovada",
  rejected: "Não aprovada",
  withdrawn: "Retirada",
  purged: "Prazo de retenção encerrado",
};
export default function ApplicationReceipt({
  loaderData,
}: Route.ComponentProps) {
  const [status, setStatus] = useState(loaderData.status),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  return (
    <main className="public-main">
      <section className="public-section">
        <p className="eyebrow">RECIBO PRIVADO</p>
        <h1>{loaderData.formName}</h1>
        <h2>{statusLabels[status] ?? "Em análise"}</h2>
        <p>
          Guarde este link com cuidado. Ele dá acesso somente ao estado da sua
          candidatura e expira em{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            timeZone: "UTC",
            dateStyle: "long",
          }).format(new Date(loaderData.expiresAt))}
          .
        </p>
        {status !== "withdrawn" && loaderData.applicantMessage && (
          <p>{loaderData.applicantMessage}</p>
        )}
        <p>
          A aprovação não publica seus contatos nem seu perfil automaticamente.
        </p>
        {status !== "withdrawn" && (
          <button
            disabled={pending}
            className="button light"
            onClick={async () => {
              setPending(true);
              try {
                const response = await fetch(
                  `${loaderData.receiptApi}/withdraw`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: "{}",
                  },
                );
                if (response.ok) {
                  setStatus("withdrawn");
                  setMessage(
                    "Candidatura retirada, dados privados redigidos e consentimento de listagem revogado.",
                  );
                } else
                  setMessage(
                    "Não foi possível retirar. Confira se o recibo continua válido.",
                  );
              } catch {
                setMessage("Não foi possível conectar. Tente novamente.");
              } finally {
                setPending(false);
              }
            }}
          >
            Retirar candidatura e revogar listagem
          </button>
        )}
        <p role="status">{message}</p>
        <a href="/">← Voltar ao evento</a>
      </section>
    </main>
  );
}
export function ErrorBoundary() {
  return (
    <main className="public-main">
      <section className="public-section">
        <h1>Recibo indisponível</h1>
        <p>
          O endereço pode ter expirado ou não pertencer a este evento. Procure a
          organizadora para atendimento.
        </p>
        <a href="/">Voltar ao evento</a>
      </section>
    </main>
  );
}
