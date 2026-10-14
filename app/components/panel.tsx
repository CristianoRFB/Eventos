import { useState, type FormEvent, type ReactNode } from "react";
export function Panel({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="panel">
      <aside>
        <a className="brand" href="/admin">
          eventos<span>77</span>
        </a>
        <div className="workspace-label">ESPAÇO DE TRABALHO</div>
        <nav aria-label="Navegação do painel">
          <a href="/admin">◈ Minhas organizadoras</a>
        </nav>
        <div className="sidebar-foot">
          Desenvolvimento local
          <br />
          Dados fictícios
        </div>
      </aside>
      <div className="panel-body">
        <header className="panel-top">
          <span>{name}</span>
          <button
            className="button light"
            onClick={async () => {
              await fetch("/api/auth/sign-out", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
              });
              window.location.href = "/login";
            }}
          >
            Sair
          </button>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
export function ApiForm({
  endpoint,
  method = "POST",
  children,
  transform,
  label = "Salvar",
}: {
  endpoint: string;
  method?: string;
  children: ReactNode;
  transform?: (form: FormData) => unknown;
  label?: string;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          transform ? transform(form) : Object.fromEntries(form),
        ),
      });
      const result = (await response
        .json()
        .catch(() => ({ error: "Não foi possível salvar" }))) as {
        error?: string;
      };
      if (!response.ok) {
        setMessage(result.error ?? "Confira os dados e tente novamente");
        return;
      }
      window.location.reload();
    } catch {
      setMessage("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-grid">
      {children}
      <button disabled={pending} className="button" type="submit">
        {pending ? "Salvando…" : label}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
export function InviteForm({
  endpoint,
  events,
}: {
  endpoint: string;
  events: { id: string; name: string }[];
}) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setToken("");
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      email: data.email,
      role: data.role,
      ...(data.eventId ? { eventId: data.eventId } : {}),
    };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        token?: string;
        error?: string;
      };
      if (!response.ok) {
        setMessage(result.error ?? "Não foi possível criar o convite");
        return;
      }
      setToken(result.token ?? "");
      setMessage(
        "Convite criado. Copie o código e entregue à pessoa convidada.",
      );
      event.currentTarget.reset();
    } catch {
      setMessage("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <form onSubmit={submit} className="form-grid">
        <label>
          E-mail da pessoa
          <input type="email" name="email" required maxLength={254} />
        </label>
        <label>
          Função
          <select name="role" defaultValue="content_editor">
            <option value="organization_owner">Proprietária</option>
            <option value="organization_admin">Administradora</option>
            <option value="content_editor">Editora de conteúdo</option>
            <option value="publisher">Publicadora</option>
            <option value="event_manager">Gestora de evento</option>
            <option value="reviewer_staff">Revisora de inscrições</option>
          </select>
        </label>
        <label>
          Evento (para equipe)
          <select name="eventId" defaultValue="">
            <option value="">Selecione um evento</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button" disabled={pending}>
          {pending ? "Criando…" : "Criar convite ↗"}
        </button>
        <p role="status">{message}</p>
      </form>
      {token && (
        <label className="invite-token">
          Código de uso único
          <input
            value={token}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      )}
    </>
  );
}
