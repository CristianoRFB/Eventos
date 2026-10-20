import { describe, it, expect } from "vitest";
import {
  formDefinitionSchema,
  submitFormSchema,
  validateAnswers,
  receiptIsAvailable,
} from "../../app/domain/forms";
import {
  encryptSubmission,
  decryptSubmission,
  privateDigest,
  receiptDigest,
} from "../../app/infrastructure/submission-crypto.server";

const definition = () =>
  formDefinitionSchema.parse({
    name: "Candidatura fictícia",
    privacyNotice: "Respostas privadas para análise deste evento fictício.",
    consentLabel: "Concordo com a finalidade informada",
    retentionDays: 30,
    fields: [
      {
        key: "email",
        label: "Contato profissional",
        type: "email",
        required: true,
      },
      {
        key: "category",
        label: "Categoria",
        type: "category",
        required: true,
        options: ["Arte", "Livros"],
      },
      { key: "rules", label: "Regulamento", type: "checkbox", required: true },
      { key: "site", label: "Site", type: "url", required: false },
    ],
  });
const secret = "TEST_ONLY-Submission-Encryption-Long-Secret-2026";
describe("private application contracts", () => {
  it("denies expired, retention-expired and malformed receipt dates", () => {
    const now = Date.parse("2026-10-19T00:00:00Z");
    expect(
      receiptIsAvailable("2026-10-20T00:00:00Z", "2026-10-30T00:00:00Z", now),
    ).toBe(true);
    expect(
      receiptIsAvailable("2026-10-19T00:00:00Z", "2026-10-30T00:00:00Z", now),
    ).toBe(false);
    expect(
      receiptIsAvailable("2026-10-30T00:00:00Z", "2026-10-18T00:00:00Z", now),
    ).toBe(false);
    expect(receiptIsAvailable("bad", "2026-10-30T00:00:00Z", now)).toBe(false);
  });
  it("requires an explicit retention choice, valid privacy notice and distinct fields/categories", () => {
    const d = definition();
    expect(
      formDefinitionSchema.safeParse({ ...d, retentionDays: undefined })
        .success,
    ).toBe(false);
    expect(
      formDefinitionSchema.safeParse({
        ...d,
        fields: [d.fields[0], d.fields[0]],
      }).success,
    ).toBe(false);
    expect(
      formDefinitionSchema.safeParse({
        ...d,
        fields: [{ ...d.fields[1], options: ["A", "A"] }],
      }).success,
    ).toBe(false);
  });
  it("validates original version fields and rejects unexpected fields and executable URLs", () => {
    const d = definition();
    expect(
      validateAnswers(d, {
        email: "synthetic@example.test",
        category: "Arte",
        rules: true,
      }),
    ).toEqual({
      email: "synthetic@example.test",
      category: "Arte",
      rules: true,
      site: "",
    });
    for (const answers of [
      { email: "bad", category: "Arte", rules: true },
      { email: "synthetic@example.test", category: "Outra", rules: true },
      { email: "synthetic@example.test", category: "Arte", rules: false },
      {
        email: "synthetic@example.test",
        category: "Arte",
        rules: true,
        site: "javascript:alert(1)",
      },
      {
        email: "synthetic@example.test",
        category: "Arte",
        rules: true,
        organizationId: "b",
      },
    ])
      expect(() => validateAnswers(d, answers)).toThrow();
  });
  it("separates privacy acceptance from public listing consent and excludes contact fields from profiles", () => {
    const input = {
      definitionId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      answers: {},
      privacyAccepted: true,
    };
    expect(submitFormSchema.safeParse(input).success).toBe(true);
    expect(
      submitFormSchema.safeParse({ ...input, privacyAccepted: false }).success,
    ).toBe(false);
    expect(
      submitFormSchema.safeParse({ ...input, listingOptIn: true }).success,
    ).toBe(false);
    expect(
      submitFormSchema.safeParse({
        ...input,
        listingOptIn: true,
        publicProfile: {
          name: "Perfil público",
          email: "private@example.test",
        },
      }).success,
    ).toBe(false);
  });
  it("encrypts with randomized nonces and authenticated tenant/submission scope", async () => {
    const plaintext = { email: "private-synthetic@example.test" };
    const a = await encryptSubmission(
      secret,
      "a",
      "a:form:submission:definition",
      plaintext,
    );
    const b = await encryptSubmission(
      secret,
      "a",
      "a:form:submission:definition",
      plaintext,
    );
    expect(a).not.toBe(b);
    expect(a).not.toContain(plaintext.email);
    expect(
      await decryptSubmission(secret, "a", "a:form:submission:definition", a),
    ).toEqual(plaintext);
    await expect(
      decryptSubmission(secret, "b", "a:form:submission:definition", a),
    ).rejects.toThrow();
    await expect(
      decryptSubmission(secret, "a", "a:form:another:definition", a),
    ).rejects.toThrow();
    await expect(
      decryptSubmission(
        secret + "changed",
        "a",
        "a:form:submission:definition",
        a,
      ),
    ).rejects.toThrow();
  });
  it("derives stable unguessable receipt/idempotency digests without storing bearer tokens", async () => {
    const a = await privateDigest(secret, "receipt:a:form:key");
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).toBe(await privateDigest(secret, "receipt:a:form:key"));
    expect(a).not.toBe(await privateDigest(secret, "receipt:b:form:key"));
    expect(await receiptDigest(a)).not.toBe(a);
    await expect(privateDigest(undefined, "receipt:a")).rejects.toBeInstanceOf(
      Response,
    );
  });
});
