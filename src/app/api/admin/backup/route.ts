import { NextResponse } from "next/server";
import { adminFromRequest } from "@/lib/auth/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** JSON export of the catalog & settings (without binary files) — quick manual backup. */
export async function GET(req: Request) {
  const admin = await adminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const [categories, brands, products, images, settings, assets] = await Promise.all([
    prisma.category.findMany(),
    prisma.brand.findMany(),
    prisma.product.findMany(),
    prisma.productImage.findMany(),
    prisma.siteSettings.findMany(),
    prisma.asset.findMany({ select: { id: true, filename: true, mimeType: true, size: true, driver: true, storageKey: true, width: true, height: true, createdAt: true } }),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, categories, brands, products, images, settings, assets }, null, 2);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="telefonuzb-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
