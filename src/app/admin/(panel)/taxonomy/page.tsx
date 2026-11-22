import { prisma } from "@/lib/db";
import TaxonomyManager from "@/components/admin/TaxonomyManager";

export const metadata = { title: "Категории и бренды" };

export default async function TaxonomyPage() {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameRu: "asc" }], include: { _count: { select: { products: true } } } }),
    prisma.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Категории и бренды</h1>
      <p className="mb-8 text-sm text-white/45">Скрытые категории не показываются в каталоге вместе со своими товарами. Скрытые бренды не показываются в фильтрах и на главной.</p>
      <TaxonomyManager
        categories={categories.map((c) => ({ id: c.id, slug: c.slug, nameRu: c.nameRu, nameUz: c.nameUz, sortOrder: c.sortOrder, isVisible: c.isVisible, count: c._count.products }))}
        brands={brands.map((b) => ({ id: b.id, slug: b.slug, name: b.name, sortOrder: b.sortOrder, isVisible: b.isVisible, count: b._count.products }))}
      />
    </div>
  );
}
