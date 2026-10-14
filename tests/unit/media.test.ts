import { describe, expect, it } from "vitest";
import {
  MediaStorageUnavailable,
  MediaValidationError,
  readBoundedBody,
  uploadImage,
  validateImageUpload,
} from "../../app/infrastructure/media.server";

function png(width = 2, height = 3) {
  const bytes = new Uint8Array(57);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = 6;
  bytes.set([0x49, 0x44, 0x41, 0x54], 37);
  bytes.set([0x49, 0x45, 0x4e, 0x44], 49);
  return bytes;
}
function jpeg(width = 3, height = 2) {
  const bytes = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0,
    17,
    8,
    (height >> 8) & 255,
    height & 255,
    (width >> 8) & 255,
    width & 255,
    3,
    1,
    0x11,
    0,
    2,
    0x11,
    0,
    3,
    0x11,
    0,
    0xff,
    0xd9,
  ]);
  return bytes;
}
describe("secure local media boundary", () => {
  it("reads true PNG/JPEG signatures and server-derived dimensions", () => {
    expect(validateImageUpload(png(), "image/png")).toMatchObject({
      width: 2,
      height: 3,
      mime: "image/png",
    });
    expect(validateImageUpload(jpeg(), "image/jpeg")).toMatchObject({
      width: 3,
      height: 2,
      mime: "image/jpeg",
    });
  });
  it.each([
    ["text/html", png()],
    ["image/svg+xml", new TextEncoder().encode("<svg></svg>")],
    ["image/jpeg", png()],
    ["image/png", new Uint8Array([1, 2, 3])],
  ] as const)(
    "rejects unsupported, mislabeled or truncated content",
    (mime, bytes) =>
      expect(() => validateImageUpload(bytes, mime)).toThrow(
        MediaValidationError,
      ),
  );
  it("rejects pixel bombs and oversized objects before storage", () => {
    expect(() => validateImageUpload(png(16000, 16000), "image/png")).toThrow(
      /dimensões/,
    );
    expect(() =>
      validateImageUpload(new Uint8Array(10 * 1024 * 1024 + 1), "image/png"),
    ).toThrow(/tamanho/);
  });
  it("bounds incoming byte streams and checks content length", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(6));
        controller.enqueue(new Uint8Array(6));
        controller.close();
      },
    });
    await expect(readBoundedBody(stream, null, 10)).rejects.toThrow(/tamanho/);
    await expect(
      readBoundedBody(new Blob([png()]).stream(), 34),
    ).rejects.toThrow(/incompleto/);
  });
  it("requires the private R2 binding and a license for public media", async () => {
    const base = {
      bytes: png(),
      mime: "image/png",
      visibility: "private" as const,
      licenseStatus: "pending" as const,
      licenseNote: "",
      altText: "",
    };
    await expect(uploadImage({}, "org-a", base)).rejects.toThrow(
      MediaStorageUnavailable,
    );
    await expect(
      uploadImage(
        {
          ASSETS_PRIVATE: {
            put: async () => ({ etag: "x" }),
          } as unknown as R2Bucket,
        },
        "org-a",
        { ...base, visibility: "public" },
      ),
    ).rejects.toThrow(/licença/);
  });
  it("generates tenant namespaced object keys server-side", async () => {
    let actual = "";
    const bucket = {
      put: async (key: string) => {
        actual = key;
        return { etag: "ok" };
      },
    } as unknown as R2Bucket;
    const stored = await uploadImage({ ASSETS_PRIVATE: bucket }, "tenant-a", {
      bytes: png(),
      mime: "image/png",
      visibility: "private",
      licenseStatus: "pending",
      licenseNote: "",
      altText: "",
    });
    expect(actual).toMatch(/^org\/tenant-a\/private\/[0-9a-f-]{36}$/);
    expect(stored.key).toBe(actual);
    expect(stored.id).toBe(actual.split("/").at(-1));
    expect(stored.width).toBe(2);
  });
});
