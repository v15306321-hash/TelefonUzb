import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/localize";
import { normalize } from "@/lib/search";
import { assetUrl } from "@/lib/storage";
import ProductRowActions from "@/components/admin/ProductRowActions";

export const metadata = { title: "Товары" };

type SP = Promise<Record<string, string | undefined>>;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const where: Prisma.ProductWhereInput = {};
  if (sp.category) where.categoryId = sp.category;
  if (sp.brand) where.brandId = sp.brand;
  if (sp.stock === "in") where.inStock = true;
  if (sp.stock === "out") where.inStock = false;
  if (sp.visibility === "hidden") where.isHidden = true;
  if (sp.visibility === "visible") where.isHidden = false;

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sp.sort === "price_asc"
      ? [{ price: "asc" }]
      : sp.sort === "price_desc"
        ? [{ price: "desc" }]
        : sp.sort === "oldest"
          ? [{ createdAt: "asc" }]
          : sp.sort === "updated"
            ? [{ updatedAt: "desc" }]
            : [{ createdAt: "desc" }];

  const [rows, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameRu: "asc" }] }),
    prisma.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  const nq = normalize(q);
  const products = nq
    ? rows.filter((p) => normalize(`${p.nameRu} ${p.nameUz} ${p.brand.name} ${p.slug}`).includes(nq))
    : rows;

  const sel = "h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-white/30";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Товары</h1>
          <p className="mt-1 text-sm text-white/45">Найдено: {products.length}</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary !py-2.5 text-sm">
          + Добавить товар
        </Link>
      </div>

      <form className="mb-5 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={q} placeholder="Поиск по названию, бренду…" className={`${sel} min-w-[220px] flex-1`} type="search" />
        <select name="category" defaultValue={sp.category ?? ""} className={sel} aria-label="Категория">
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.nameRu}</option>
          ))}
        </select>
        <select name="brand" defaultValue={sp.brand ?? ""} className={sel} aria-label="Бренд">
          <option value="">Все бренды</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select name="stock" defaultValue={sp.stock ?? ""} className={sel} aria-label="Наличие">
          <option value="">Любое наличие</option>
          <option value="in">В наличии</option>
          <option value="out">Нет в наличии</option>
        </select>
        <select name="visibility" defaultValue={sp.visibility ?? ""} className={sel} aria-label="Видимость">
          <option value="">Видимые и скрытые</option>
          <option value="visible">Только видимые</option>
          <option value="hidden">Только скрытые</option>
        </select>
        <select name="sort" defaultValue={sp.sort ?? "newest"} className={sel} aria-label="Сортировка">
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="updated">Недавно изменённые</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
        </select>
        <button className="h-10 rounded-xl bg-white px-4 text-sm font-medium text-black">Применить</button>
        {Object.values(sp).some(Boolean) && (
          <Link href="/admin/products" className="grid h-10 place-items-center px-2 text-sm text-white/50 hover:text-white">
            Сбросить
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-3xl bg-graphite-900 ring-1 ring-white/[0.07]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-white/[0.07] text-left text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-5 py-3 font-medium">Товар</th>
                <th className="px-3 py-3 font-medium">Категория</th>
                <th className="px-3 py-3 font-medium">Цена</th>
                <th className="px-3 py-3 font-medium">Наличие</th>
                <th className="px-3 py-3 font-medium">На сайте</th>
                <th className="px-5 py-3 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {products.map((p) => {
                const img = p.images[0] ? assetUrl(p.images[0].assetId) : null;
                return (
                  <tr key={p.id} className={`transition-colors hover:bg-white/[0.02] ${p.isHidden ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f5f5f7]">
                          {img && <Image src={img} alt="" fill sizes="48px" className="object-contain p-1" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-white hover:underline">{p.nameRu}</span>
                          <span className="block text-xs text-white/40">
                            {p.brand.name} · /{p.slug} {!p.nameUz && <span className="text-amber-300/80">· нет UZ-названия</span>}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-white/60">{p.category.nameRu}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {p.specialPrice ? (
                        <>
                          <span className="block text-signal-bright">{formatPrice(p.specialPrice, "ru")}</span>
                          <span className="block text-xs text-white/35 line-through">{formatPrice(p.price, "ru")}</span>
                        </>
                      ) : (
                        formatPrice(p.price, "ru")
                      )}
                    </td>
                    <ProductRowActions id={p.id} slug={p.slug} name={p.nameRu} inStock={p.inStock} isHidden={p.isHidden} />
                  </tr>
                );
              })}
              {!products.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-white/40">
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
