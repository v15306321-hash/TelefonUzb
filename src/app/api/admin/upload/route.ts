import { NextResponse } from "next/server";
import sharp from "sharp";
import { adminFromRequest } from "@/lib/auth/server";
import { sniffMime, storeFile, uploadRules, assetUrl, type UploadKind } from "@/lib/storage";
import { cleanupOrphanAssets } from "@/lib/admin/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await adminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const kind = String(form.get("kind") ?? "") as UploadKind;
  const file = form.get("file");
  if (!(kind in uploadRules) || !(file instanceof File)) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

  const rule = uploadRules[kind];
  if (file.size > rule.maxBytes) {
    return NextResponse.json({ error: `Файл больше ${Math.round(rule.maxBytes / 1024 / 1024)} МБ` }, { status: 413 });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buffer);
  if (!mime || !rule.mime.includes(mime) || !rule.ext.includes(ext)) {
    return NextResponse.json({ error: `Недопустимый формат. Разрешены: ${rule.ext.join(", ")}` }, { status: 415 });
  }

  let mimeType = mime;
  let filename = file.name.replace(/[^\p{L}\p{N}._ -]+/gu, "").slice(-120) || `file.${ext}`;
  let width: number | null = null;
  let height: number | null = null;

  if (kind === "image") {
    try {
      // normalise orientation, limit size, convert to WebP (keeps transparency)
      const out = await sharp(buffer, { failOn: "error" })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 86, alphaQuality: 90 })
        .toBuffer({ resolveWithObject: true });
      buffer = out.data;
      width = out.info.width;
      height = out.info.height;
      mimeType = "image/webp";
      filename = filename.replace(/\.[^.]+$/, "") + ".webp";
    } catch {
      return NextResponse.json({ error: "Не удалось обработать изображение" }, { status: 422 });
    }
  }

  try {
    const asset = await storeFile({ buffer, filename, mimeType, width, height });
    cleanupOrphanAssets().catch((e) => console.error("cleanup failed", e));
    return NextResponse.json({ id: asset.id, url: assetUrl(asset.id), width, height, mimeType, size: asset.size, filename: asset.filename });
  } catch (e) {
    console.error("upload failed", e);
    return NextResponse.json({ error: "Не удалось сохранить файл" }, { status: 500 });
  }
}
