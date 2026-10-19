import type { Operations } from "../domain/operations";
import { programDays } from "../domain/operations";

export function OperationDirectory({
  ops,
  kind,
  timeZone,
  day = "",
  stage = "",
  assetPrefix = "/assets",
  previewPage,
}: {
  ops: Operations;
  kind: string;
  timeZone: string;
  day?: string;
  stage?: string;
  assetPrefix?: string;
  previewPage?: string;
}) {
  if (kind === "programacao") {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const display = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    });
    const items = ops.program
      .filter(
        (p) =>
          (!day || date.format(new Date(p.startAt)) === day) &&
          (!stage || p.stageId === stage),
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    return (
      <section className="public-section">
        <h1>Programação</h1>
        <p>Horários no fuso {timeZone}.</p>
        <form method="get" className="form-grid">
          {previewPage && (
            <input type="hidden" name="page" value={previewPage} />
          )}
          <label>
            Dia
            <select aria-label="Dia" name="day" defaultValue={day}>
              <option value="">Todos os dias</option>
              {programDays(ops, timeZone).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Palco
            <select aria-label="Palco" name="stage" defaultValue={stage}>
              <option value="">Todos os palcos</option>
              {ops.stages.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button">Filtrar programação</button>
        </form>
        <div className="public-cards">
          {items.map((p) => (
            <article key={p.id}>
              <p className="public-kicker">
                {ops.stages.find((s) => s.id === p.stageId)?.name}
              </p>
              <h2>{p.title}</h2>
              <p>
                <time dateTime={p.startAt}>
                  {display.format(new Date(p.startAt))}
                </time>{" "}
                —{" "}
                <time dateTime={p.endAt}>
                  {display.format(new Date(p.endAt))}
                </time>
              </p>
              <p>{p.description}</p>
              <p>
                {p.guestIds
                  .map((id) => ops.guests.find((g) => g.id === id)?.name)
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </article>
          ))}
        </div>
        {!items.length && <p>Nenhuma atividade publicada para este filtro.</p>}
      </section>
    );
  }
  const title =
    kind === "convidados"
      ? "Convidados"
      : kind === "expositores"
        ? "Expositores"
        : "Patrocinadores";
  const profiles =
    kind === "convidados"
      ? ops.guests
      : kind === "expositores"
        ? ops.exhibitors
        : ops.sponsors;
  return (
    <section className="public-section">
      <h1>{title}</h1>
      <div className="public-cards">
        {profiles.map((p) => (
          <article key={p.id}>
            {p.imageAssetId && (
              <img
                src={`${assetPrefix}/${encodeURIComponent(p.imageAssetId)}`}
                alt={p.name}
                loading="lazy"
                width="240"
                height="240"
              />
            )}
            <h2>{p.name}</h2>
            {"category" in p && (
              <p className="public-kicker">{String(p.category)}</p>
            )}
            <p>{p.description}</p>
            {p.website && (
              <a href={p.website} rel="noopener noreferrer">
                Site de {p.name} ↗
              </a>
            )}
            {kind === "convidados" && (
              <ul>
                {ops.program
                  .filter((item) => item.guestIds.includes(p.id))
                  .map((item) => (
                    <li key={item.id}>{item.title}</li>
                  ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      {!profiles.length && (
        <p>Os perfis serão divulgados após a publicação da organização.</p>
      )}
    </section>
  );
}
