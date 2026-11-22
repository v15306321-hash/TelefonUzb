import "server-only";
import { AwsClient } from "aws4fetch";
import { prisma } from "./db";

/**
 * File storage abstraction.
 *  - "db": file bytes are stored in PostgreSQL (Asset.data). Zero extra infrastructure,
 *          files are included in regular database backups.
 *  - "s3": any S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, Backblaze B2...).
 * The public URL of every asset is always /api/media/<id>, so switching drivers
 * does not require any change in the UI or stored data.
 */

export type UploadKind = "image" | "model" | "video";

export const uploadRules: Record<UploadKind, { maxBytes: number; mime: string[]; ext: string[] }> = {
  image: { maxBytes: 12 * 1024 * 1024, mime: ["image/jpeg", "image/png", "image/webp", "image/avif"], ext: ["jpg", "jpeg", "png", "webp", "avif"] },
  model: { maxBytes: 60 * 1024 * 1024, mime: ["model/gltf-binary", "model/gltf+json"], ext: ["glb", "gltf"] },
  video: { maxBytes: 80 * 1024 * 1024, mime: ["video/mp4", "video/webm"], ext: ["mp4", "webm"] },
};

/** Detect the real file type by its magic bytes (never trust the browser-provided type). */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
    return "video/mp4";
  }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "video/webm";
  if (buf.toString("ascii", 0, 4) === "glTF") return "model/gltf-binary";
  const head = buf.toString("utf8", 0, Math.min(buf.length, 2048)).trimStart();
  if (head.startsWith("{") && head.includes('"asset"')) return "model/gltf+json";
  return null;
}

function driver(): "db" | "s3" {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "db";
}

let s3Client: AwsClient | null = null;
function s3() {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("S3 storage is not configured (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)");
  }
  s3Client ??= new AwsClient({
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    region: S3_REGION || "auto",
    service: "s3",
  });
  return { client: s3Client, base: `${S3_ENDPOINT.replace(/\/$/, "")}/${S3_BUCKET}` };
}

export async function storeFile(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
}) {
  const d = driver();
  if (d === "s3") {
    const { client, base } = s3();
    const key = `uploads/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${safeName(input.filename)}`;
    const res = await client.fetch(`${base}/${key}`, {
      method: "PUT",
      body: new Uint8Array(input.buffer),
      headers: { "Content-Type": input.mimeType },
    });
    if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
    return prisma.asset.create({
      data: {
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.buffer.length,
        driver: "s3",
        storageKey: key,
        width: input.width ?? null,
        height: input.height ?? null,
      },
      select: assetMetaSelect,
    });
  }
  return prisma.asset.create({
    data: {
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.buffer.length,
      driver: "db",
      data: new Uint8Array(input.buffer),
      width: input.width ?? null,
      height: input.height ?? null,
    },
    select: assetMetaSelect,
  });
}

export const assetMetaSelect = {
  id: true,
  filename: true,
  mimeType: true,
  size: true,
  driver: true,
  storageKey: true,
  width: true,
  height: true,
  createdAt: true,
} as const;

export async function getAssetMeta(id: string) {
  return prisma.asset.findUnique({ where: { id }, select: assetMetaSelect });
}

/** Read a byte range [start, end] (inclusive) of an asset stored in the database. */
export async function readDbRange(id: string, start: number, end: number): Promise<Buffer> {
  const rows = await prisma.$queryRaw<{ chunk: Uint8Array }[]>`
    SELECT substring("data" from ${start + 1}::int for ${end - start + 1}::int) AS chunk FROM "Asset" WHERE id = ${id}`;
  return Buffer.from(rows[0]?.chunk ?? new Uint8Array());
}

export async function fetchS3(key: string, range?: string) {
  const { client, base } = s3();
  return client.fetch(`${base}/${key}`, { headers: range ? { Range: range } : {} });
}

export async function deleteAsset(id: string) {
  const asset = await getAssetMeta(id);
  if (!asset) return;
  if (asset.driver === "s3" && asset.storageKey) {
    try {
      const { client, base } = s3();
      await client.fetch(`${base}/${asset.storageKey}`, { method: "DELETE" });
    } catch (e) {
      console.error("S3 delete failed", e);
    }
  }
  await prisma.asset.delete({ where: { id } }).catch(() => undefined);
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-60);
}

export function assetUrl(id: string | null | undefined): string | null {
  return id ? `/api/media/${id}` : null;
}
