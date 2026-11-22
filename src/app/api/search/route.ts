import { NextResponse } from "next/server";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getVisibleProducts, searchProducts, toCard } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 100);
  const lp = url.searchParams.get("locale");
  const locale = isLocale(lp) ? lp : defaultLocale;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 8, 1), 24);
  if (q.trim().length < 1) return NextResponse.json({ items: [], total: 0 });
  try {
    const found = searchProducts(await getVisibleProducts(), q);
    return NextResponse.json(
      { items: found.slice(0, limit).map((p) => toCard(p, locale)), total: found.length },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
    );
  } catch (e) {
    console.error("search failed", e);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
