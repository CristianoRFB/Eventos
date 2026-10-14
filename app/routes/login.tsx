import { useState, type FormEvent } from "react";
export function meta() {
  return [
    { title: "Entrar · Eventos 77" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}
export default function Login() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      if (response.ok) window.location.href = "/admin";
      else setError("Não foi possível entrar. Confira seu e-mail e sua senha.");
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="login-page">
      <a className="brand" href="/">
        eventos<span>77</span>
      </a>
      <main className="login-card">
        <div className="eyebrow">SEU PRÓXIMO ENCONTRO COMEÇA AQUI</div>
        <h1>Bom ter você de volta.</h1>
        <p>Entre para cuidar das suas próximas edições.</p>
        <form onSubmit={submit}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
          />
          <button className="button" disabled={pending}>
            {pending ? "Entrando…" : "Entrar no painel ↗"}
          </button>
          <p role="alert">{error}</p>
        </form>
        <small>
          O acesso é concedido pela administração da sua organizadora.
        </small>
      </main>
    </div>
  );
}
