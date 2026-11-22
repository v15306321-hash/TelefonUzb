import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getVisibleProducts } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getVisibleProducts().catch(() => []);
  const entry = (path: string, lastModified?: string, priority = 0.7): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}/ru${path}`,
    lastModified: lastModified ?? new Date().toISOString(),
    priority,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
  });
  const pages = [entry("", undefined, 1), entry("/catalog", undefined, 0.9), entry("/contacts", undefined, 0.6)];
  const items = products.map((p) => entry(`/product/${p.slug}`, p.createdAt, 0.8));
  // one entry per language version
  return [...pages, ...items].flatMap((e) =>
    locales.map((l) => ({ ...e, url: e.url.replace(`${SITE_URL}/ru`, `${SITE_URL}/${l}`) })),
  );
}
