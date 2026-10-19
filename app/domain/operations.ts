import { z } from "zod";

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const name = z.string().trim().min(1).max(180);
const text = z.string().trim().max(3000).default("");
const url = z
  .union([
    z.literal(""),
    z.url().refine((v) => new URL(v).protocol === "https:"),
  ])
  .default("");
const profile = {
  id,
  name,
  description: text,
  imageAssetId: id.optional(),
  website: url,
  status: z.enum(["draft", "public"]).default("draft"),
};
export const operationSchemas = {
  stages: z
    .object({ id, name, venueId: id.optional(), accessibility: text })
    .strict(),
  guests: z.object({ ...profile }).strict(),
  exhibitors: z
    .object({
      ...profile,
      category: z.string().max(100).default(""),
      publicOptIn: z.boolean().default(false),
    })
    .strict(),
  sponsors: z
    .object({
      ...profile,
      category: z.string().max(100).default(""),
      order: z.number().int().min(0).max(10000).default(0),
    })
    .strict(),
  program: z
    .object({
      id,
      title: name,
      description: text,
      stageId: id,
      startAt: z.iso.datetime().transform((v) => new Date(v).toISOString()),
      endAt: z.iso.datetime().transform((v) => new Date(v).toISOString()),
      guestIds: z.array(id).max(8).default([]),
      status: z.enum(["draft", "public"]).default("draft"),
    })
    .strict(),
};
export type OperationKind = keyof typeof operationSchemas;
export const emptyOperations = {
  stages: [],
  guests: [],
  program: [],
  exhibitors: [],
  sponsors: [],
};
export const operationsSchema = z
  .object({
    stages: z.array(operationSchemas.stages).max(20).default([]),
    guests: z.array(operationSchemas.guests).max(80).default([]),
    program: z.array(operationSchemas.program).max(80).default([]),
    exhibitors: z.array(operationSchemas.exhibitors).max(100).default([]),
    sponsors: z.array(operationSchemas.sponsors).max(40).default([]),
  })
  .strict()
  .superRefine((ops, ctx) => {
    for (const kind of Object.keys(operationSchemas) as OperationKind[]) {
      const ids = new Set<string>();
      ops[kind].forEach((item, index) => {
        if (ids.has(item.id))
          ctx.addIssue({
            code: "custom",
            path: [kind, index, "id"],
            message: "Identificador duplicado nesta edição",
          });
        ids.add(item.id);
      });
    }
    for (const [index, item] of ops.program.entries()) {
      if (item.endAt <= item.startAt)
        ctx.addIssue({
          code: "custom",
          path: ["program", index],
          message: "O término deve ser posterior ao início",
        });
      if (!ops.stages.some((s) => s.id === item.stageId))
        ctx.addIssue({
          code: "custom",
          path: ["program", index, "stageId"],
          message: "Palco não pertence a este rascunho",
        });
      if (
        new Set(item.guestIds).size !== item.guestIds.length ||
        item.guestIds.some(
          (guestId) => !ops.guests.some((g) => g.id === guestId),
        )
      )
        ctx.addIssue({
          code: "custom",
          path: ["program", index, "guestIds"],
          message: "Convidado ausente ou duplicado nesta edição",
        });
      for (const other of ops.program.slice(0, index)) {
        if (item.startAt < other.endAt && item.endAt > other.startAt) {
          if (item.stageId === other.stageId)
            ctx.addIssue({
              code: "custom",
              path: ["program", index],
              message: `Conflito de palco com ${other.title}`,
            });
          if (item.guestIds.some((g) => other.guestIds.includes(g)))
            ctx.addIssue({
              code: "custom",
              path: ["program", index],
              message: `Conflito de convidado com ${other.title}`,
            });
        }
      }
    }
  });
export type Operations = z.infer<typeof operationsSchema>;

/** Publication contains only explicitly public profiles and their public fields. */
export function publicOperations(ops: Operations): Operations {
  const guests = ops.guests.filter((g) => g.status === "public");
  const program = ops.program.filter((p) => p.status === "public");
  if (
    program.some((p) =>
      p.guestIds.some((id) => !guests.some((g) => g.id === id)),
    )
  )
    throw new Error("PUBLIC_PROGRAM_REQUIRES_PUBLIC_GUESTS");
  return {
    stages: ops.stages.filter((s) => program.some((p) => p.stageId === s.id)),
    guests,
    program,
    exhibitors: ops.exhibitors.filter(
      (e) => e.status === "public" && e.publicOptIn,
    ),
    sponsors: ops.sponsors
      .filter((s) => s.status === "public")
      .sort((a, b) => a.order - b.order),
  };
}

export function programDays(ops: Operations, timeZone: string) {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return [
    ...new Set(ops.program.map((p) => format.format(new Date(p.startAt)))),
  ].sort();
}
