import { describe, expect, it } from "vitest";
import {
  decryptSubmission,
  encryptSubmission,
  submissionSecrets,
  type SubmissionCipherSecrets,
} from "../../app/infrastructure/submission-crypto.server";

const legacy = "TEST_ONLY-LEGACY-ROOT-000000000000000000001";
const oldKey = "TEST_ONLY-PRIVATE-KEY-2026-OLD-00000000001";
const newKey = "TEST_ONLY-PRIVATE-KEY-2026-NEW-00000000002";
const orgA = "org-a";
const scope = "org-a:form:submission:definition";
const personal = { email: "synthetic-private@example.test", project: "fictional" };

function config(activeKeyId: string, keys: Record<string, string>): SubmissionCipherSecrets {
  return { legacySecret: legacy, activeKeyId, keys };
}
describe("F6 private AES-GCM key versioning and recovery", () => {
  it("writes v2 with key id, hides plaintext and binds org, scope and key identifier", async () => {
    const secrets = config("oct26", { oct26: oldKey });
    const sealed = await encryptSubmission(secrets, orgA, scope, personal);
    expect(sealed).toMatch(/^v2\.oct26\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
    expect(sealed).not.toContain(personal.email);
    expect(await decryptSubmission(secrets, orgA, scope, sealed)).toEqual(personal);
    await expect(decryptSubmission(secrets, "org-b", scope, sealed)).rejects.toThrow();
    await expect(decryptSubmission(secrets, orgA, "org-a:another", sealed)).rejects.toThrow();
    await expect(decryptSubmission(config("oct26", { oct26: newKey }), orgA, scope, sealed))
      .rejects.toThrow();
  });

  it("keeps legacy v1 readable after activation and separate V1 secret pinning", async () => {
    const legacyCipher = await encryptSubmission(legacy, orgA, scope, personal);
    expect(legacyCipher.startsWith("v1.")).toBe(true);
    const secrets = config("oct26", { oct26: oldKey });
    expect(await decryptSubmission(secrets, orgA, scope, legacyCipher)).toEqual(personal);
    const env = submissionSecrets({
      BETTER_AUTH_SECRET: "TEST_ONLY-NEW-AUTH-ROOT-0000000000000000",
      SUBMISSION_ENCRYPTION_V1_SECRET: legacy,
      SUBMISSION_ENCRYPTION_ACTIVE_KEY_ID: "oct26",
      SUBMISSION_ENCRYPTION_KEYRING: JSON.stringify({ oct26: oldKey }),
    } as Parameters<typeof submissionSecrets>[0]);
    expect(await decryptSubmission(env, orgA, scope, legacyCipher)).toEqual(personal);
    await expect(decryptSubmission({ ...env, legacySecret: undefined }, orgA, scope, legacyCipher))
      .rejects.toThrow();
  });

  it("rotates v2 writing key while preserving old reads until explicit retirement", async () => {
    const before = config("oct26", { oct26: oldKey });
    const oldCipher = await encryptSubmission(before, orgA, scope, personal);
    const after = config("jan27", { oct26: oldKey, jan27: newKey });
    const newCipher = await encryptSubmission(after, orgA, scope, personal);
    expect(newCipher.startsWith("v2.jan27.")).toBe(true);
    expect(await decryptSubmission(after, orgA, scope, oldCipher)).toEqual(personal);
    expect(await decryptSubmission(after, orgA, scope, newCipher)).toEqual(personal);
    await expect(
      decryptSubmission(config("jan27", { jan27: newKey }), orgA, scope, oldCipher),
    ).rejects.toThrow();
    // Recovered backed-up old key, without modifying private data in-place.
    const recovered = config("jan27", { oct26: oldKey, jan27: newKey });
    expect(await decryptSubmission(recovered, orgA, scope, oldCipher)).toEqual(personal);
  });

  it("fails closed on partially deployed, weak, malformed, or missing key material", async () => {
    const exampleEnv = { BETTER_AUTH_SECRET: legacy };
    const bad = [
      { ...exampleEnv, SUBMISSION_ENCRYPTION_ACTIVE_KEY_ID: "oct26" },
      { ...exampleEnv, SUBMISSION_ENCRYPTION_KEYRING: JSON.stringify({ oct26: oldKey }) },
      { ...exampleEnv, SUBMISSION_ENCRYPTION_ACTIVE_KEY_ID: "OCT26", SUBMISSION_ENCRYPTION_KEYRING: JSON.stringify({ OCT26: oldKey }) },
      { ...exampleEnv, SUBMISSION_ENCRYPTION_ACTIVE_KEY_ID: "oct26", SUBMISSION_ENCRYPTION_KEYRING: "{wrong" },
      { ...exampleEnv, SUBMISSION_ENCRYPTION_ACTIVE_KEY_ID: "oct26", SUBMISSION_ENCRYPTION_KEYRING: JSON.stringify({ oct26: "short" }) },
      { ...exampleEnv, SUBMISSION_ENCRYPTION_ACTIVE_KEY_ID: "oct26", SUBMISSION_ENCRYPTION_KEYRING: JSON.stringify({ other: oldKey }) },
    ];
    for (const entry of bad) {
      expect(() => submissionSecrets(entry as Parameters<typeof submissionSecrets>[0]))
        .toThrow();
    }
    const settings = config("oct26", { oct26: oldKey });
    for (const malformed of [
      "v3.oct26.a.b",
      "v2..a.b",
      "v2.oct26.X.X",
      "v2.oct26.bad!",
      "v1.none",
    ]) await expect(decryptSubmission(settings, orgA, scope, malformed)).rejects.toThrow();
  });

  it("rejects ciphertext version tampering rather than guessing a fallback key", async () => {
    const secrets = config("oct26", { oct26: oldKey, jan27: newKey });
    const sealed = await encryptSubmission(secrets, orgA, scope, personal);
    await expect(decryptSubmission(secrets, orgA, scope, sealed.replace("v2.oct26.", "v2.jan27.")))
      .rejects.toThrow();
    await expect(decryptSubmission(secrets, orgA, scope, sealed.replace("v2.oct26.", "v1.")))
      .rejects.toThrow();
  });
});
