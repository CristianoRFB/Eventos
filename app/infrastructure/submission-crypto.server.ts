import type { AuthEnvironment } from "./auth.server";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const KEY_ID = /^[a-z][a-z0-9_-]{0,31}$/;
const MAX_KEYS = 8;

/**
 * Legacy v1 data is derived from the old authentication secret. A separate
 * SUBMISSION_ENCRYPTION_V1_SECRET can pin that root before auth rotates.
 *
 * v2 keys are a JSON object of {keyId: secretMaterial} provided ONLY as a
 * Worker secret (never committed). The active id is a separate Worker var.
 * Keeping retired keys in the ring allows old data to be read until its
 * retention expires, or until a separately approved migration is completed.
 */
export type SubmissionCipherSecrets = {
  legacySecret: string | undefined;
  activeKeyId?: string;
  keys?: Record<string, string>;
};

function unavailable(): never {
  throw new Response("Criptografia privada indisponível", { status: 503 });
}

export function submissionSecrets(env: AuthEnvironment): SubmissionCipherSecrets {
  const activeKeyId = env.SUBMISSION_ENCRYPTION_ACTIVE_KEY_ID;
  const serialized = env.SUBMISSION_ENCRYPTION_KEYRING;
  const legacySecret = env.SUBMISSION_ENCRYPTION_V1_SECRET ??
    env.BETTER_AUTH_SECRET;
  if ((activeKeyId === undefined) !== (serialized === undefined)) unavailable();
  if (activeKeyId === undefined) return { legacySecret };
  if (!KEY_ID.test(activeKeyId)) unavailable();
  let parsed: unknown;
  try { parsed = JSON.parse(serialized!); } catch { return unavailable(); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) unavailable();
  const entries = Object.entries(parsed);
  if (entries.length < 1 || entries.length > MAX_KEYS) unavailable();
  if (entries.some(([id, value]) =>
    !KEY_ID.test(id) || typeof value !== "string" || value.length < 32
  )) unavailable();
  const keys = Object.fromEntries(entries) as Record<string, string>;
  if (!Object.hasOwn(keys, activeKeyId)) unavailable();
  return { legacySecret, activeKeyId, keys };
}

function config(value: string | undefined | SubmissionCipherSecrets): SubmissionCipherSecrets {
  if (typeof value === "string" || value === undefined)
    return { legacySecret: value as string | undefined };
  if (!value || typeof value !== "object") unavailable();
  if ((value.activeKeyId === undefined) !== (value.keys === undefined)) unavailable();
  if (value.activeKeyId !== undefined) {
    if (!KEY_ID.test(value.activeKeyId) || !value.keys ||
      Object.keys(value.keys).length > MAX_KEYS ||
      !Object.hasOwn(value.keys, value.activeKeyId)) unavailable();
    for (const [id, secret] of Object.entries(value.keys)) {
      if (!KEY_ID.test(id) || typeof secret !== "string" || secret.length < 32)
        unavailable();
    }
  }
  return value;
}
function requireSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) unavailable();
  return secret;
}
export function equalPrivateDigests(left: string, right: string) {
  const a = encoder.encode(left), b = encoder.encode(right);
  const subtle: typeof crypto.subtle & {
    timingSafeEqual?: (a: Uint8Array, b: Uint8Array) => boolean;
  } = crypto.subtle;
  if (!subtle.timingSafeEqual)
    throw new Response("Serviço temporariamente indisponível", { status: 503 });
  return a.byteLength === b.byteLength && subtle.timingSafeEqual(a, b);
}
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, "0")).join("");
export async function privateDigest(secret: string | undefined, value: string) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(requireSecret(secret)),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
export async function receiptDigest(token: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
}
async function encryptionKey(secret: string | undefined, orgId: string, info: string) {
  const root = await crypto.subtle.importKey(
    "raw", encoder.encode(requireSecret(secret)), "HKDF", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(orgId),
      info: encoder.encode(info),
    }, root, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}
const encode = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (c) => String.fromCharCode(c)).join(""));
const decode = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export async function encryptSubmission(
  secret: string | undefined | SubmissionCipherSecrets,
  orgId: string,
  scope: string,
  value: unknown,
) {
  const settings = config(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const id = settings.activeKeyId;
  const key = id ? settings.keys?.[id] : settings.legacySecret;
  const info = id ?
    `eventos77:private-submissions:v2:${id}` :
    "eventos77:private-submissions:v1";
  const aad = id ? `eventos77:v2:${id}:${scope}` : scope;
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
    await encryptionKey(key, orgId, info),
    encoder.encode(JSON.stringify(value)),
  );
  return id ?
    `v2.${id}.${encode(iv)}.${encode(new Uint8Array(ciphertext))}` :
    `v1.${encode(iv)}.${encode(new Uint8Array(ciphertext))}`;
}

export async function decryptSubmission(
  secret: string | undefined | SubmissionCipherSecrets,
  orgId: string,
  scope: string,
  value: string,
) {
  const settings = config(secret);
  const parts = value.split(".");
  const v2 = parts[0] === "v2";
  const v1 = parts[0] === "v1";
  if ((!v1 && !v2) || parts.length !== (v2 ? 4 : 3))
    throw new Error("Invalid encrypted submission");
  const id = v2 ? parts[1] : undefined;
  if (v2 && (!id || !KEY_ID.test(id)))
    throw new Error("Invalid encrypted submission");
  const ivData = v2 ? parts[2] : parts[1];
  const ciphertext = v2 ? parts[3] : parts[2];
  if (!ivData || !ciphertext || !/^[A-Za-z0-9+/]+={0,2}$/.test(ivData) ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(ciphertext))
    throw new Error("Invalid encrypted submission");
  const iv = decode(ivData);
  const data = decode(ciphertext);
  if (iv.byteLength !== 12 || data.byteLength < 16)
    throw new Error("Invalid encrypted submission");
  // NEVER guess/fallback to a different key for a v2 envelope. Missing keys
  // fail closed and must be recovered from the secure key backup.
  const key = v2 ? settings.keys?.[id!] : settings.legacySecret;
  const info = v2 ?
    `eventos77:private-submissions:v2:${id}` :
    "eventos77:private-submissions:v1";
  const aad = v2 ? `eventos77:v2:${id}:${scope}` : scope;
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
    await encryptionKey(key, orgId, info),
    data,
  );
  return JSON.parse(decoder.decode(plaintext)) as unknown;
}
