import { fetchS3, getAssetMeta, readDbRange } from "@/lib/storage";

export const dynamic = "force-dynamic";

const IMMUTABLE = "public, max-age=31536000, immutable";

/** Serves uploaded assets with HTTP Range support (required for <video> on Safari/iOS). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response("Not found", { status: 404 });
  const asset = await getAssetMeta(id);
  if (!asset) return new Response("Not found", { status: 404 });

  const etag = `"${asset.id}"`;
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": IMMUTABLE } });

  const baseHeaders: Record<string, string> = {
    "Content-Type": asset.mimeType,
    "Cache-Control": IMMUTABLE,
    ETag: etag,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename="${encodeURIComponent(asset.filename)}"`,
  };

  const range = parseRange(req.headers.get("range"), asset.size);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { ...baseHeaders, "Content-Range": `bytes */${asset.size}` } });
  }

  if (asset.driver === "s3" && asset.storageKey) {
    const upstream = await fetchS3(asset.storageKey, range ? `bytes=${range.start}-${range.end}` : undefined);
    if (!upstream.ok && upstream.status !== 206) return new Response("Not found", { status: 404 });
    const headers: Record<string, string> = { ...baseHeaders };
    const cl = upstream.headers.get("content-length");
    if (cl) headers["Content-Length"] = cl;
    const cr = upstream.headers.get("content-range");
    if (cr) headers["Content-Range"] = cr;
    return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers });
  }

  const start = range ? range.start : 0;
  const end = range ? range.end : asset.size - 1;
  const chunk = asset.size === 0 ? Buffer.alloc(0) : await readDbRange(asset.id, start, end);
  const headers: Record<string, string> = { ...baseHeaders, "Content-Length": String(chunk.length) };
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${asset.size}`;
  return new Response(new Uint8Array(chunk), { status: range ? 206 : 200, headers });
}

function parseRange(header: string | null, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  let start: number;
  let end: number;
  if (m[1] === "" && m[2] !== "") {
    const suffix = Number(m[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return "invalid";
  // cap chunk size to keep memory bounded for large videos/models
  end = Math.min(end, start + 8 * 1024 * 1024 - 1);
  return { start, end };
}
