const maxImageBytes = 10 * 1024 * 1024;
const maxDimension = 16_384;
const maxPixels = 40_000_000;
export interface ImageInfo {
  mime: "image/png" | "image/jpeg" | "image/webp";
  size: number;
  width: number;
  height: number;
}
export interface PrivateBucketEnvironment {
  ASSETS_PRIVATE?: R2Bucket;
}
export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}
export class MediaStorageUnavailable extends Error {
  constructor() {
    super("Private object storage is unavailable");
    this.name = "MediaStorageUnavailable";
  }
}
function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}
function dimensions(
  bytes: Uint8Array,
  mime: string,
): { width: number; height: number } {
  if (mime === "image/png") {
    if (bytes.length < 57 || ascii(bytes, 12, 16) !== "IHDR")
      throw new MediaValidationError("Imagem PNG incompleta");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8;
    let first = true;
    let imageData = false;
    let ended = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      if (length > maxImageBytes || offset + length + 12 > bytes.length)
        throw new MediaValidationError("Estrutura PNG inválida");
      const kind = ascii(bytes, offset + 4, offset + 8);
      if (first && (kind !== "IHDR" || length !== 13))
        throw new MediaValidationError("Cabeçalho PNG inválido");
      if (kind === "IDAT") imageData = true;
      if (kind === "IEND") {
        if (length !== 0 || offset + 12 !== bytes.length)
          throw new MediaValidationError("Final PNG inválido");
        ended = true;
        break;
      }
      first = false;
      offset += length + 12;
    }
    if (!imageData || !ended)
      throw new MediaValidationError("Imagem PNG incompleta");
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mime === "image/jpeg") {
    if (bytes.length < 12 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
      throw new MediaValidationError("Imagem JPEG incompleta");
    for (let offset = 2; offset + 1 < bytes.length - 2;) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = (bytes[offset] << 8) | bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length - 2)
        throw new MediaValidationError("Estrutura JPEG inválida");
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      )
        return {
          height: (bytes[offset + 3] << 8) | bytes[offset + 4],
          width: (bytes[offset + 5] << 8) | bytes[offset + 6],
        };
      offset += length;
    }
    throw new MediaValidationError("Dimensões JPEG não encontradas");
  }
  if (
    bytes.length < 25 ||
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      4,
      true,
    ) +
      8 !==
      bytes.length
  )
    throw new MediaValidationError("Estrutura WebP inválida");
  const chunk = ascii(bytes, 12, 16);
  if (chunk === "VP8X" && bytes.length >= 30)
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    };
  if (
    chunk === "VP8 " &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  )
    return {
      width: ((bytes[27] << 8) | bytes[26]) & 0x3fff,
      height: ((bytes[29] << 8) | bytes[28]) & 0x3fff,
    };
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f)
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height:
        1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
    };
  throw new MediaValidationError("Quadro WebP válido não encontrado");
}
export function validateImageUpload(
  bytes: Uint8Array,
  mime: string,
  maxBytes = maxImageBytes,
): ImageInfo {
  if (
    bytes.byteLength < 12 ||
    bytes.byteLength > Math.min(maxBytes, maxImageBytes)
  )
    throw new MediaValidationError(
      "A imagem ultrapassa o tamanho permitido ou está incompleta",
    );
  let detected: "image/png" | "image/jpeg" | "image/webp" | null = null;
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 4) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    detected = "image/png";
  else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    detected = "image/jpeg";
  else if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP")
    detected = "image/webp";
  if (!detected || detected !== mime)
    throw new MediaValidationError(
      "O tipo informado não corresponde a PNG, JPEG ou WebP válido",
    );
  const size = dimensions(bytes, detected);
  if (
    !Number.isInteger(size.width) ||
    !Number.isInteger(size.height) ||
    size.width < 1 ||
    size.height < 1 ||
    size.width > maxDimension ||
    size.height > maxDimension ||
    size.width * size.height > maxPixels
  )
    throw new MediaValidationError(
      "As dimensões da imagem são inválidas ou muito grandes",
    );
  return {
    mime: detected,
    size: bytes.byteLength,
    width: size.width,
    height: size.height,
  };
}
export async function readBoundedBody(
  stream: ReadableStream<Uint8Array> | null,
  contentLength: number | null,
  maxBytes = maxImageBytes,
) {
  if (contentLength !== null && (contentLength < 1 || contentLength > maxBytes))
    throw new MediaValidationError("A imagem ultrapassa o tamanho permitido");
  if (!stream) throw new MediaValidationError("Envie uma imagem");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new MediaValidationError("A imagem ultrapassa o tamanho permitido");
    }
    chunks.push(part.value);
  }
  if (contentLength !== null && total !== contentLength)
    throw new MediaValidationError("Corpo incompleto");
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
export interface StoredImage {
  id: string;
  key: string;
  mime: ImageInfo["mime"];
  size: number;
  width: number;
  height: number;
  visibility: "private" | "public";
  licenseStatus: "pending" | "licensed" | "owned" | "rejected";
  licenseNote: string;
  altText: string;
  etag: string | null;
}
export async function uploadImage(
  env: PrivateBucketEnvironment,
  organizationId: string,
  input: {
    bytes: Uint8Array;
    mime: string;
    visibility: "private" | "public";
    licenseStatus: "pending" | "licensed" | "owned" | "rejected";
    licenseNote: string;
    altText: string;
  },
) {
  const info = validateImageUpload(input.bytes, input.mime);
  if (!env.ASSETS_PRIVATE) throw new MediaStorageUnavailable();
  if (
    input.visibility === "public" &&
    !(["licensed", "owned"] as string[]).includes(input.licenseStatus)
  )
    throw new MediaValidationError(
      "Confirme a licença da imagem antes de torná-la pública",
    );
  const id = crypto.randomUUID();
  const key = `org/${organizationId}/${input.visibility}/${id}`;
  const object = await env.ASSETS_PRIVATE.put(key, input.bytes, {
    httpMetadata: { contentType: info.mime, cacheControl: "private, no-store" },
    customMetadata: {
      organizationId,
      visibility: input.visibility,
      licenseStatus: input.licenseStatus,
    },
  });
  return {
    id,
    key,
    ...info,
    visibility: input.visibility,
    licenseStatus: input.licenseStatus,
    licenseNote: input.licenseNote,
    altText: input.altText,
    etag: object.etag ?? null,
  } satisfies StoredImage;
}
export async function readPrivateImage(
  env: PrivateBucketEnvironment,
  organizationId: string,
  key: string,
) {
  if (!env.ASSETS_PRIVATE) throw new MediaStorageUnavailable();
  if (!key.startsWith(`org/${organizationId}/`))
    throw new Response("Arquivo não encontrado", { status: 404 });
  const object = await env.ASSETS_PRIVATE.get(key);
  if (
    !object ||
    object.customMetadata?.organizationId !== organizationId ||
    object.customMetadata?.visibility !== "private"
  )
    throw new Response("Arquivo não encontrado", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
