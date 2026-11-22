import "server-only";
import { prisma } from "../db";
import { assetUrl } from "../storage";
import { parseColors, parseModel3d, parseSpecs } from "../types";
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
    include: { images: { orderBy: { sortOrder: "asc" } }, modelAsset: { select: { id: true, filename: true, size: true } } },
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
    specialPrice: p.specialPrice ? String(p.specialPrice) : "",
    inStock: p.inStock,
    isHidden: p.isHidden,
    isFeatured: p.isFeatured,
    sortOrder: String(p.sortOrder),
    storageOptions: p.storageOptions,
    colors: parseColors(p.colors),
    specs: parseSpecs(p.specs),
    model3d: parseModel3d(p.model3d),
    model: p.modelAsset ? { id: p.modelAsset.id, url: assetUrl(p.modelAsset.id)!, filename: p.modelAsset.filename, size: p.modelAsset.size } : null,
    images: p.images.map((i) => ({ id: i.assetId, url: assetUrl(i.assetId)! })),
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
  specialPrice: "",
  inStock: true,
  isHidden: false,
  isFeatured: false,
  sortOrder: "0",
  storageOptions: [],
  colors: [{ nameRu: "Чёрный", nameUz: "Qora", hex: "#1d1d1f" }],
  specs: [],
  model3d: { kind: "phone", layout: "pro-triangle", frame: "aluminium" },
  model: null,
  images: [],
});
