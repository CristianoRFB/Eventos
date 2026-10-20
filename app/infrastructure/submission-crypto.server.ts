const encoder = new TextEncoder();
export function equalPrivateDigests(left: string, right: string) {
  const a = encoder.encode(left),
    b = encoder.encode(right);
  // Workers exposes this extension; DOM's SubtleCrypto declaration omits it.
  const subtle: typeof crypto.subtle & {
    timingSafeEqual?: (a: Uint8Array, b: Uint8Array) => boolean;
  } = crypto.subtle;
  if (!subtle.timingSafeEqual)
    throw new Response("Serviço temporariamente indisponível", { status: 503 });
  return a.byteLength === b.byteLength && subtle.timingSafeEqual(a, b);
}
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
function requireSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32)
    throw new Response("Serviço temporariamente indisponível", { status: 503 });
  return secret;
}
export async function privateDigest(secret: string | undefined, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requireSecret(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
export async function receiptDigest(token: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
}
async function encryptionKey(secret: string | undefined, orgId: string) {
  const root = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requireSecret(secret)),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(orgId),
      info: encoder.encode("eventos77:private-submissions:v1"),
    },
    root,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
const encode = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (c) => String.fromCharCode(c)).join(""));
const decode = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
export async function encryptSubmission(
  secret: string | undefined,
  orgId: string,
  scope: string,
  value: unknown,
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(scope) },
    await encryptionKey(secret, orgId),
    encoder.encode(JSON.stringify(value)),
  );
  return `v1.${encode(iv)}.${encode(new Uint8Array(ciphertext))}`;
}
export async function decryptSubmission(
  secret: string | undefined,
  orgId: string,
  scope: string,
  value: string,
) {
  const [version, iv, ciphertext, extra] = value.split(".");
  if (version !== "v1" || !iv || !ciphertext || extra)
    throw new Error("Invalid encrypted submission");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(iv), additionalData: encoder.encode(scope) },
    await encryptionKey(secret, orgId),
    decode(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
}
