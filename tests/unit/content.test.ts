import { describe, expect, it } from "vitest";
import {
  contentDocumentSchema,
  starterContent,
} from "../../app/domain/content";

describe("editorial document validation", () => {
  it("accepts a typed page set and supplies an empty redirect list", () => {
    const result = contentDocumentSchema.parse(starterContent);
    expect(result.pages[0]?.slug).toBe("home");
    expect(result.redirects).toEqual([]);
  });

  it("rejects arbitrary HTML blocks, executable links, and unknown script fields", () => {
    expect(() =>
      contentDocumentSchema.parse({
        ...starterContent,
        pages: [
          {
            slug: "home",
            title: "Home",
            sections: [{ type: "html", html: "<script>alert(1)</script>" }],
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      contentDocumentSchema.parse({
        ...starterContent,
        pages: [
          {
            slug: "home",
            title: "Home",
            sections: [
              { type: "cta", label: "Comprar", url: "javascript:alert(1)" },
            ],
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      contentDocumentSchema.parse({ ...starterContent, script: "alert(1)" }),
    ).toThrow();
  });

  it("requires unique page slugs and redirect targets that exist", () => {
    const duplicate = {
      ...starterContent,
      pages: [
        starterContent.pages[0]!,
        { ...starterContent.pages[0]!, title: "Outra" },
      ],
    };
    expect(() => contentDocumentSchema.parse(duplicate)).toThrow();
    expect(() =>
      contentDocumentSchema.parse({
        ...starterContent,
        redirects: [{ fromSlug: "antiga", toSlug: "inexistente" }],
      }),
    ).toThrow();
  });

  it("accepts plain script-looking text as data for escaped React rendering", () => {
    const result = contentDocumentSchema.parse({
      ...starterContent,
      pages: [
        {
          slug: "home",
          title: "Início",
          sections: [
            { type: "text", title: "Aviso", body: "<script>alert(1)</script>" },
          ],
        },
      ],
    });
    expect(result.pages[0]?.sections[0]).toMatchObject({
      body: "<script>alert(1)</script>",
    });
  });
});
