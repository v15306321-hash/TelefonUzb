import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { plural, t } from "@/i18n/format";
import { getCatalogFacets, getVisibleProducts, queryCatalog, toCard, type CatalogQuery } from "@/lib/catalog";
import { pick } from "@/lib/localize";
import { languageAlternates } from "@/lib/seo";
import CatalogFilters from "@/components/site/CatalogFilters";
import ProductCard from "@/components/site/ProductCard";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const sp = await searchParams;
  const filtered = Object.keys(sp).length > 0;
  return {
    title: dict.meta.catalogTitle,
    description: dict.meta.catalogDescription,
    alternates: languageAlternates(locale, "/catalog"),
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const SORTS = ["popular", "price_asc", "price_desc", "newest"] as const;

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const sp = await searchParams;

  const sortParam = one(sp.sort);
  const query: CatalogQuery = {
    q: one(sp.q).slice(0, 100),
    category: one(sp.category),
    brands: one(sp.brand).split(",").filter(Boolean),
    sort: (SORTS as readonly string[]).includes(sortParam) ? (sortParam as CatalogQuery["sort"]) : "popular",
    inStock: one(sp.stock) === "1",
  };

  const products = await getVisibleProducts();
  const { categories, brands } = await getCatalogFacets(products);
  const list = queryCatalog(products, query).map((p) => toCard(p, locale));
  const activeCategory = categories.find((c) => c.slug === query.category);

  return (
    <div className="page-enter container-x pb-24 pt-28 sm:pt-36">
      <header className="mb-10 sm:mb-14">
        <h1 className="headline text-5xl sm:text-7xl">{activeCategory ? pick(locale, activeCategory.nameRu, activeCategory.nameUz) : dict.catalog.title}</h1>
        <p className="mt-4 max-w-xl text-lg text-white/50">
          {query.q ? t(dict.catalog.searchFor, { q: query.q }) : dict.catalog.subtitle}
        </p>
      </header>

      <Suspense>
        <CatalogFilters
          categories={categories.filter((c) => c.count > 0).map((c) => ({ slug: c.slug, label: pick(locale, c.nameRu, c.nameUz), count: c.count }))}
          brands={brands.map((b) => ({ slug: b.slug, label: b.name, count: b.count }))}
          labels={{
            ...dict.catalog,
            searchPlaceholder: dict.search.placeholder,
            searchLabel: dict.search.label,
            clear: dict.search.clear,
          }}
        />
      </Suspense>

      <p className="mb-6 mt-10 text-sm text-white/40" aria-live="polite">
        {plural(locale, list.length, { one: dict.catalog.resultsOne, few: dict.catalog.resultsFew, many: dict.catalog.resultsMany })}
      </p>

      {list.length ? (
        <div className="catalog-grid grid grid-cols-2 gap-3 transition-opacity duration-300 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {list.map((p, i) => (
            <ProductCard key={p.slug} product={p} locale={locale} priority={i < 4} labels={{ inStock: dict.product.inStock, outOfStock: dict.product.outOfStock, used: dict.product.used, sold: dict.product.sold, batteryShort: dict.product.batteryShort }} revealDelay={(i % 4) * 60} />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-[32px] bg-graphite-900 px-6 py-24 text-center ring-1 ring-white/[0.06]">
          <p className="text-2xl font-semibold tracking-tight">{dict.catalog.empty}</p>
          <p className="mt-2 text-white/50">{dict.catalog.emptyHint}</p>
          <Link href={`/${locale}/catalog`} className="btn btn-light mt-8">
            {dict.catalog.reset}
          </Link>
        </div>
      )}
    </div>
  );
}
