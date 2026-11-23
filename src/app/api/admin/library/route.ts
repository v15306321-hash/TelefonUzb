import { NextResponse } from "next/server";
import { adminFromRequest } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { parseColors } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Photo library: white-background ("studio") photos already used by any product, to reuse for a new unit
 * without uploading them again. ?q= filters by model name, colour or file name.
 */
export async function GET(req: Request) {
  const admin = await adminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 60);

  const rows = await prisma.productImage.findMany({
    where: { style: "studio" },
    orderBy: [{ product: { nameRu: "asc" } }, { sortOrder: "asc" }],
    select: {
      assetId: true,
      colorKey: true,
      asset: { select: { filename: true } },
      product: { select: { nameRu: true, colors: true } },
    },
  });

  const seen = new Set<string>();
  const items: { id: string; url: string; model: string; color: string | null }[] = [];
  for (const r of rows) {
    if (seen.has(r.assetId)) continue;
    seen.add(r.assetId);
    const color = r.colorKey ? (parseColors(r.product.colors).find((c) => c.hex.toLowerCase() === r.colorKey?.toLowerCase())?.nameRu ?? null) : null;
    // drop the storage size from unit names: "Apple iPhone 17 Pro Max 256 GB" → "Apple iPhone 17 Pro Max"
    const model = r.product.nameRu.replace(/\s+\d+(\/\d+)?\s*(GB|TB)$/i, "");
    const hay = `${model} ${color ?? ""} ${r.asset.filename}`.toLowerCase();
    if (q && !q.split(/\s+/).every((w) => hay.includes(w))) continue;
    items.push({ id: r.assetId, url: `/api/media/${r.assetId}`, model, color });
    if (items.length >= 120) break;
  }
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
