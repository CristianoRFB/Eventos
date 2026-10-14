import { z } from "zod";

const shortText = z.string().trim().min(1).max(180);
const paragraph = z.string().trim().min(1).max(3000);
const assetId = z.string().min(1).max(100);

const sectionSchemas = {
  hero: z
    .object({
      type: z.literal("hero"),
      title: shortText,
      subtitle: z.string().trim().max(500).default(""),
      imageAssetId: assetId.optional(),
    })
    .strict(),
  cards: z
    .object({
      type: z.literal("cards"),
      title: shortText,
      items: z
        .array(z.object({ title: shortText, body: paragraph }).strict())
        .min(1)
        .max(12),
    })
    .strict(),
  agenda: z
    .object({
      type: z.literal("agenda"),
      title: shortText,
      description: z.string().trim().max(1000).default(""),
    })
    .strict(),
  cta: z
    .object({
      type: z.literal("cta"),
      label: shortText,
      url: z.url().refine((value) => new URL(value).protocol === "https:"),
    })
    .strict(),
  faq: z
    .object({
      type: z.literal("faq"),
      title: shortText.default("Perguntas frequentes"),
      items: z
        .array(z.object({ question: shortText, answer: paragraph }).strict())
        .min(1)
        .max(30),
    })
    .strict(),
  sponsors: z
    .object({
      type: z.literal("sponsors"),
      title: shortText,
      names: z.array(shortText).max(30),
    })
    .strict(),
  gallery: z
    .object({
      type: z.literal("gallery"),
      title: shortText,
      assetIds: z.array(assetId).min(1).max(20),
    })
    .strict(),
  text: z
    .object({
      type: z.literal("text"),
      title: shortText,
      body: paragraph,
    })
    .strict(),
} as const;

export const contentSectionSchema = z.discriminatedUnion("type", [
  sectionSchemas.hero,
  sectionSchemas.cards,
  sectionSchemas.agenda,
  sectionSchemas.cta,
  sectionSchemas.faq,
  sectionSchemas.sponsors,
  sectionSchemas.gallery,
  sectionSchemas.text,
]);

export const contentDocumentSchema = z
  .object({
    siteName: shortText,
    title: shortText,
    description: z.string().trim().max(320).default(""),
    pages: z
      .array(
        z
          .object({
            slug: z
              .string()
              .regex(/^(home|[a-z0-9]+(?:-[a-z0-9]+)*)$/)
              .max(100),
            title: shortText,
            description: z.string().trim().max(320).default(""),
            sections: z.array(contentSectionSchema).max(40),
          })
          .strict(),
      )
      .min(1)
      .max(20)
      .superRefine((pages, context) => {
        const slugs = new Set<string>();
        const reservedSlugs = new Set([
          "admin",
          "api",
          "assets",
          "edicoes",
          "login",
          "platform",
          "robots",
          "sitemap",
        ]);
        for (const [index, page] of pages.entries()) {
          if (slugs.has(page.slug))
            context.addIssue({
              code: "custom",
              path: [index, "slug"],
              message: "A rota da página está duplicada",
            });
          slugs.add(page.slug);
          if (reservedSlugs.has(page.slug))
            context.addIssue({
              code: "custom",
              path: [index, "slug"],
              message: "Este endereço está reservado pelo sistema",
            });
        }
        if (!slugs.has("home"))
          context.addIssue({
            code: "custom",
            path: ["pages"],
            message: "Inclua a página inicial",
          });
      }),
    redirects: z
      .array(
        z
          .object({
            fromSlug: z
              .string()
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
              .max(100),
            toSlug: z
              .string()
              .regex(/^(home|[a-z0-9]+(?:-[a-z0-9]+)*)$/)
              .max(100),
            statusCode: z.union([z.literal(301), z.literal(302)]).default(301),
          })
          .strict(),
      )
      .max(100)
      .default([]),
  })
  .strict()
  .superRefine((content, context) => {
    const targets = new Set(content.pages.map((page) => page.slug));
    const sources = new Set<string>();
    content.redirects.forEach((entry, index) => {
      if (entry.fromSlug === entry.toSlug || !targets.has(entry.toSlug))
        context.addIssue({
          code: "custom",
          path: ["redirects", index],
          message:
            "O destino do redirecionamento precisa existir e ser diferente da origem",
        });
      if (targets.has(entry.fromSlug))
        context.addIssue({
          code: "custom",
          path: ["redirects", index, "fromSlug"],
          message:
            "A origem do redirecionamento ainda está em uso por uma página",
        });
      if (sources.has(entry.fromSlug))
        context.addIssue({
          code: "custom",
          path: ["redirects", index, "fromSlug"],
          message: "A origem do redirecionamento está duplicada",
        });
      sources.add(entry.fromSlug);
    });
  });

export type ContentDocument = z.infer<typeof contentDocumentSchema>;
export type ContentSection = z.infer<typeof contentSectionSchema>;

export const starterContent: ContentDocument = {
  siteName: "Novo evento",
  title: "Novo evento — informações oficiais",
  description: "Informações da próxima edição.",
  redirects: [],
  pages: [
    {
      slug: "home",
      title: "Início",
      description: "Informações da edição.",
      sections: [
        {
          type: "hero",
          title: "Uma nova edição começa aqui",
          subtitle: "Atualize este conteúdo antes de publicar.",
        },
        {
          type: "text",
          title: "Sobre o evento",
          body: "Conte aos visitantes o que encontrarão nesta edição.",
        },
      ],
    },
  ],
};
