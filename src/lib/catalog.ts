import "server-only";
import { unstable_cache } from "next/cache";
import type { Locale } from "@/i18n/config";
import { prisma } from "./db";
import { pick } from "./localize";
import { buildDoc, searchDocs } from "./search";
import { assetUrl } from "./storage";
import { parseColors, parseModel3d, parseSpecs, type ColorOption, type Model3DConfig, type SpecItem } from "./types";

export const CATALOG_TAG = "catalog";

export type CatalogImage = { url: string; width: number | null; height: number | null };

export type CatalogProduct = {
  id: string;
  slug: string;
  nameRu: string;
  nameUz: string;
  descriptionRu: string;
  descriptionUz: string;
  price: number;
  specialPrice: number | null;
  inStock: boolean;
  isFeatured: boolean;
  sortOrder: number;
  storageOptions: string[];
  colors: ColorOption[];
  specs: SpecItem[];
  model3d: Model3DConfig;
  modelUrl: string | null;
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
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameRu: p.nameRu,
      nameUz: p.nameUz,
      descriptionRu: p.descriptionRu,
      descriptionUz: p.descriptionUz,
      price: p.price,
      specialPrice: p.specialPrice,
      inStock: p.inStock,
      isFeatured: p.isFeatured,
      sortOrder: p.sortOrder,
      storageOptions: p.storageOptions,
      colors: parseColors(p.colors),
      specs: parseSpecs(p.specs),
      model3d: parseModel3d(p.model3d),
      modelUrl: assetUrl(p.modelAssetId),
      images: p.images.map((i) => ({ url: assetUrl(i.asset.id)!, width: i.asset.width, height: i.asset.height })),
      brand: p.brand,
      category: p.category,
      createdAt: p.createdAt.toISOString(),
    }));
  },
  ["visible-products-v1"],
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

export function effectivePrice(p: Pick<CatalogProduct, "price" | "specialPrice">) {
  return p.specialPrice && p.specialPrice > 0 && p.specialPrice < p.price ? p.specialPrice : p.price;
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
      sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      break;
    case "price_desc":
      sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
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
  specialPrice: number | null;
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
    specialPrice: p.specialPrice && p.specialPrice < p.price ? p.specialPrice : null,
    inStock: p.inStock,
    image: p.images[0] ?? null,
    colors: p.colors.map((c) => c.hex).slice(0, 5),
  };
}
