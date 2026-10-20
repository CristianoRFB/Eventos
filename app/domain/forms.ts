import { z } from "zod";

const label = z.string().trim().min(1).max(180);
const key = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,49}$/)
  .refine((v) => !["constructor", "prototype", "__proto__"].includes(v));
export const formFieldSchema = z
  .object({
    key,
    label,
    type: z.enum(["text", "paragraph", "email", "url", "category", "checkbox"]),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  })
  .strict()
  .superRefine((field, ctx) => {
    if (
      field.type === "category" &&
      (!field.options.length ||
        new Set(field.options).size !== field.options.length)
    )
      ctx.addIssue({
        code: "custom",
        message: "Informe categorias distintas para o campo",
      });
  });
export const formDefinitionSchema = z
  .object({
    name: label,
    privacyNotice: z.string().trim().min(20).max(4000),
    consentLabel: z.string().trim().min(8).max(300),
    retentionDays: z.number().int().min(1).max(365),
    deadlineAt: z.iso
      .datetime()
      .transform((v) => new Date(v).toISOString())
      .optional(),
    fields: z.array(formFieldSchema).min(1).max(20),
  })
  .strict()
  .superRefine((def, ctx) => {
    if (new Set(def.fields.map((f) => f.key)).size !== def.fields.length)
      ctx.addIssue({
        code: "custom",
        path: ["fields"],
        message: "As chaves dos campos precisam ser distintas",
      });
  });
export type FormDefinition = z.infer<typeof formDefinitionSchema>;
export function receiptIsAvailable(
  expiresAt: string,
  retentionUntil: string,
  now = Date.now(),
) {
  return Date.parse(expiresAt) > now && Date.parse(retentionUntil) > now;
}
export const publicFormSchema = z
  .object({
    id: z.string().uuid(),
    definitionId: z.string().uuid(),
    definition: formDefinitionSchema,
  })
  .strict();
export type PublicForm = z.infer<typeof publicFormSchema>;
export const applicantProfileSchema = z
  .object({
    name: label,
    description: z.string().trim().max(3000).default(""),
    category: z.string().trim().max(100).default(""),
    website: z
      .union([
        z.literal(""),
        z
          .url()
          .max(2048)
          .refine((v) => new URL(v).protocol === "https:"),
      ])
      .default(""),
  })
  .strict();
export const submitFormSchema = z
  .object({
    definitionId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    answers: z.record(z.string(), z.unknown()),
    privacyAccepted: z.literal(true),
    listingOptIn: z.boolean().default(false),
    publicProfile: applicantProfileSchema.optional(),
    websiteTrap: z.string().max(200).default(""),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.listingOptIn && !input.publicProfile)
      ctx.addIssue({
        code: "custom",
        path: ["publicProfile"],
        message: "Informe o perfil público autorizado ou desmarque a listagem",
      });
  });
export function validateAnswers(definition: FormDefinition, answers: unknown) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of definition.fields) {
    if (field.type === "checkbox") {
      shape[field.key] = field.required
        ? z.literal(true, { error: `Confirme: ${field.label}` })
        : z.boolean().default(false);
      continue;
    }
    let schema: z.ZodType;
    if (field.type === "email") schema = z.email().max(254);
    else if (field.type === "url")
      schema = z
        .url()
        .max(2048)
        .refine((v) => new URL(v).protocol === "https:", "Use uma URL HTTPS");
    else if (field.type === "category")
      schema = z
        .string()
        .refine(
          (v) => field.options.includes(v),
          "Escolha uma categoria disponível",
        );
    else
      schema = z
        .string()
        .trim()
        .min(1)
        .max(field.type === "paragraph" ? 3000 : 200);
    shape[field.key] = field.required
      ? schema
      : z
          .union([z.literal(""), schema])
          .optional()
          .default("");
  }
  return z.object(shape).strict().parse(answers);
}
