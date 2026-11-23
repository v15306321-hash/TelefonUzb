import "server-only";
import { prisma } from "../db";
import { assetUrl } from "../storage";
import { parseColors, parseInstallmentOffers, parseSpecs, parseStoragePrices } from "../types";
import type { ProductFormValue } from "@/components/admin/ProductForm";

export async function loadFormOptions() {
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameRu: "asc" }], select: { id: true, nameRu: true } }),
  ]);
  return { brands, categories };
}

export async function loadProductForm(id: string): Promise<ProductFormValue | null> {
  const p = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    nameRu: p.nameRu,
    nameUz: p.nameUz,
    descriptionRu: p.descriptionRu,
    descriptionUz: p.descriptionUz,
    brandId: p.brandId,
    categoryId: p.categoryId,
    price: String(p.price),
    storagePrices: Object.fromEntries(Object.entries(parseStoragePrices(p.storagePrices, p.storageOptions)).map(([k, n]) => [k, String(n)])),
    currency: p.currency === "USD" ? "USD" : "UZS",
    condition: p.condition === "used" ? "used" : "new",
    batteryHealth: p.batteryHealth != null ? String(p.batteryHealth) : "",
    batteryCycles: p.batteryCycles != null ? String(p.batteryCycles) : "",
    hasBox: p.hasBox == null ? "" : p.hasBox ? "yes" : "no",
    region: p.region,
    conditionNoteRu: p.conditionNoteRu,
    conditionNoteUz: p.conditionNoteUz,
    installmentOffers: parseInstallmentOffers(p.installmentOffers).map((o) => ({ down: String(o.down), months: String(o.months), monthly: String(o.monthly) })),
    inStock: p.inStock,
    isHidden: p.isHidden,
    isFeatured: p.isFeatured,
    sortOrder: String(p.sortOrder),
    storageOptions: p.storageOptions,
    colors: parseColors(p.colors),
    specs: parseSpecs(p.specs),
    images: p.images.map((i) => ({ id: i.assetId, url: assetUrl(i.assetId)!, color: i.colorKey?.toLowerCase() ?? null, style: i.style === "photo" ? "photo" : "studio" })),
  };
}

export const emptyProductForm = (brandId = "", categoryId = ""): ProductFormValue => ({
  slug: "",
  nameRu: "",
  nameUz: "",
  descriptionRu: "",
  descriptionUz: "",
  brandId,
  categoryId,
  price: "",
  storagePrices: {},
  currency: "UZS",
  condition: "new",
  batteryHealth: "",
  batteryCycles: "",
  hasBox: "",
  region: "",
  conditionNoteRu: "",
  conditionNoteUz: "",
  installmentOffers: [],
  inStock: true,
  isHidden: false,
  isFeatured: false,
  sortOrder: "0",
  storageOptions: [],
  colors: [{ nameRu: "Чёрный", nameUz: "Qora", hex: "#1d1d1f" }],
  specs: [],
  images: [],
});
