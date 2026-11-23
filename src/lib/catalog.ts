import "server-only";
import { unstable_cache } from "next/cache";
import type { Locale } from "@/i18n/config";
import { prisma } from "./db";
import { pick } from "./localize";
import { buildDoc, searchDocs } from "./search";
import { assetUrl } from "./storage";
import { asCurrency, parseColors, parseInstallmentOffers, parseSpecs, parseStoragePrices, type ColorOption, type Currency, type InstallmentOffer, type SpecItem } from "./types";

export const CATALOG_TAG = "catalog";

/**
 * `color` = HEX of the product colour the photo shows (null = any colour).
 * `style`: "studio" — product on white, shown whole; "photo" — live shot that fills the frame.
 */
export type CatalogImage = { url: string; width: number | null; height: number | null; color: string | null; style: "studio" | "photo" };

/** Used-phone details for one particular unit. */
export type UnitCondition = {
  used: boolean;
  batteryHealth: number | null;
  batteryCycles: number | null;
  hasBox: boolean | null;
  region: string;
  noteRu: string;
  noteUz: string;
};

/** Rough UZS value of 1 USD — used only to order a mixed-currency list by price. */
const USD_SORT_RATE = 12_500;
export const priceSortKey = (p: { price: number; currency: Currency }) => (p.currency === "USD" ? p.price * USD_SORT_RATE : p.price);

export type CatalogProduct = {
  id: string;
  slug: string;
  nameRu: string;
  nameUz: string;
  descriptionRu: string;
  descriptionUz: string;
  /** lowest price ("from") */
  price: number;
  /** true when storage options have different prices */
  priceVaries: boolean;
  currency: Currency;
  condition: UnitCondition;
  /** installment terms for this unit (empty → the site-wide calculator is used) */
  installmentOffers: InstallmentOffer[];
  inStock: boolean;
  isFeatured: boolean;
  sortOrder: number;
  storageOptions: string[];
  /** price for every storage option (falls back to the base price) */
  storagePrices: Record<string, number>;
  colors: ColorOption[];
  specs: SpecItem[];
  images: CatalogImage[];
  brand: { id: string; slug: string; name: string };
  category: { id: string; slug: string; nameRu: string; nameUz: string };
  createdAt: string;
};

export type CatalogCategory = { id: string; slug: string; nameRu: string; nameUz: string; count: number };
export type CatalogBrand = { id: string; slug: string; name: string; count: number };

/** All publicly visible products (cached, invalidated by admin mutations via revalidateTag). */
export const getVisibleProducts = unstable_cache(
  async (): Promise<CatalogProduct[]> => {
    const rows = await prisma.product.findMany({
      where: { isHidden: false, category: { isVisible: true } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        brand: { select: { id: true, slug: true, name: true } },
        category: { select: { id: true, slug: true, nameRu: true, nameUz: true } },
        images: { orderBy: { sortOrder: "asc" }, include: { asset: { select: { id: true, width: true, height: true } } } },
      },
    });
    return rows.map((p) => {
      const custom = parseStoragePrices(p.storagePrices, p.storageOptions);
      const storagePrices = Object.fromEntries(p.storageOptions.map((o) => [o, custom[o] ?? p.price]));
      const all = Object.values(storagePrices);
      return {
      id: p.id,
      slug: p.slug,
      nameRu: p.nameRu,
      nameUz: p.nameUz,
      descriptionRu: p.descriptionRu,
      descriptionUz: p.descriptionUz,
      price: all.length ? Math.min(...all) : p.price,
      priceVaries: new Set(all).size > 1,
      currency: asCurrency(p.currency),
      condition: {
        used: p.condition === "used",
        batteryHealth: p.batteryHealth,
        batteryCycles: p.batteryCycles,
        hasBox: p.hasBox,
        region: p.region,
        noteRu: p.conditionNoteRu,
        noteUz: p.conditionNoteUz,
      },
      installmentOffers: parseInstallmentOffers(p.installmentOffers),
      inStock: p.inStock,
      isFeatured: p.isFeatured,
      sortOrder: p.sortOrder,
      storageOptions: p.storageOptions,
      storagePrices,
      colors: parseColors(p.colors),
      specs: parseSpecs(p.specs),
      images: p.images.map((i) => ({ url: assetUrl(i.asset.id)!, width: i.asset.width, height: i.asset.height, color: i.colorKey?.toLowerCase() ?? null, style: i.style === "photo" ? "photo" : "studio" })),
      brand: p.brand,
      category: p.category,
      createdAt: p.createdAt.toISOString(),
      };
    });
  },
  ["visible-products-v4"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

export const getTaxonomy = unstable_cache(
  async () => {
    const [categories, brands] = await Promise.all([
      prisma.category.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { nameRu: "asc" }] }),
      prisma.brand.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    ]);
    return {
      categories: categories.map((c) => ({ id: c.id, slug: c.slug, nameRu: c.nameRu, nameUz: c.nameUz })),
      brands: brands.map((b) => ({ id: b.id, slug: b.slug, name: b.name })),
    };
  },
  ["taxonomy-v1"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

export async function getCatalogFacets(products: CatalogProduct[]) {
  const { categories, brands } = await getTaxonomy();
  const catCount = new Map<string, number>();
  const brandCount = new Map<string, number>();
  for (const p of products) {
    catCount.set(p.category.id, (catCount.get(p.category.id) ?? 0) + 1);
    brandCount.set(p.brand.id, (brandCount.get(p.brand.id) ?? 0) + 1);
  }
  return {
    categories: categories.map((c) => ({ ...c, count: catCount.get(c.id) ?? 0 })) as CatalogCategory[],
    brands: brands.map((b) => ({ ...b, count: brandCount.get(b.id) ?? 0 })).filter((b) => b.count > 0) as CatalogBrand[],
  };
}

export type CatalogQuery = {
  q?: string;
  category?: string;
  brands?: string[];
  sort?: "popular" | "price_asc" | "price_desc" | "newest";
  inStock?: boolean;
};

export function searchProducts(products: CatalogProduct[], query: string): CatalogProduct[] {
  const docs = products.map((p) =>
    buildDoc(
      p.id,
      [p.nameRu, p.nameUz, p.brand.name],
      [
        p.category.nameRu,
        p.category.nameUz,
        ...p.storageOptions,
        ...p.colors.flatMap((c) => [c.nameRu, c.nameUz]),
        ...p.specs.flatMap((s) => [s.valueRu, s.valueUz]),
        p.descriptionRu.slice(0, 400),
      ],
    ),
  );
  const ids = searchDocs(docs, query);
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)!).filter(Boolean);
}

export function queryCatalog(products: CatalogProduct[], q: CatalogQuery): CatalogProduct[] {
  let list = q.q?.trim() ? searchProducts(products, q.q) : products;
  if (q.category) list = list.filter((p) => p.category.slug === q.category);
  if (q.brands?.length) list = list.filter((p) => q.brands!.includes(p.brand.slug));
  if (q.inStock) list = list.filter((p) => p.inStock);
  const sorted = [...list];
  switch (q.sort) {
    case "price_asc":
      sorted.sort((a, b) => priceSortKey(a) - priceSortKey(b));
      break;
    case "price_desc":
      sorted.sort((a, b) => priceSortKey(b) - priceSortKey(a));
      break;
    case "newest":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    default:
      // relevance for text queries, otherwise curated order with in-stock first
      if (!q.q?.trim()) sorted.sort((a, b) => Number(b.inStock) - Number(a.inStock));
  }
  return sorted;
}

export async function getProductBySlug(slug: string) {
  const products = await getVisibleProducts();
  return products.find((p) => p.slug === slug) ?? null;
}

/** Shape sent to client components (card / suggestions): localized and minimal. */
export type ProductCardData = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  /** show the price as "from …" */
  priceFrom: boolean;
  currency: Currency;
  used: boolean;
  batteryHealth: number | null;
  inStock: boolean;
  image: CatalogImage | null;
  colors: string[];
};

export function toCard(p: CatalogProduct, locale: Locale): ProductCardData {
  return {
    slug: p.slug,
    name: pick(locale, p.nameRu, p.nameUz),
    brand: p.brand.name,
    category: pick(locale, p.category.nameRu, p.category.nameUz),
    price: p.price,
    priceFrom: p.priceVaries,
    currency: p.currency,
    used: p.condition.used,
    batteryHealth: p.condition.batteryHealth,
    inStock: p.inStock,
    image: p.images[0] ?? null,
    colors: p.colors.map((c) => c.hex).slice(0, 5),
  };
}
