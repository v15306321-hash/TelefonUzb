import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/localize";
import { Badge, Card } from "@/components/admin/ui";

export const metadata = { title: "Обзор" };

const dt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" });

export default async function Dashboard() {
  const [total, inStock, outOfStock, hidden, categories, brands, latest, activity] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { inStock: true } }),
    prisma.product.count({ where: { inStock: false } }),
    prisma.product.count({ where: { isHidden: true } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { brand: true } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, where: { action: { notIn: ["login", "seed-photo"] } } }),
  ]);

  const stats = [
    { label: "Всего товаров", value: total, href: "/admin/products" },
    { label: "В наличии", value: inStock, href: "/admin/products?stock=in", tone: "text-ok" },
    { label: "Нет в наличии", value: outOfStock, href: "/admin/products?stock=out", tone: "text-amber-300" },
    { label: "Категорий", value: categories, href: "/admin/taxonomy" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Обзор магазина</h1>
          <p className="mt-1 text-sm text-white/45">
            Брендов: {brands} · Скрыто с сайта: {hidden}
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary !py-2.5 text-sm">
          + Добавить товар
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-3xl bg-graphite-900 p-5 ring-1 ring-white/[0.07] transition hover:ring-white/20">
            <p className="text-sm text-white/45">{s.label}</p>
            <p className={`mt-3 text-4xl font-semibold tabular-nums tracking-tight ${s.tone ?? ""}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Последние добавленные товары" actions={<Link href="/admin/products?sort=newest" className="text-xs text-white/50 hover:text-white">Все →</Link>}>
          <ul className="divide-y divide-white/[0.06]">
            {latest.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-white">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.nameRu}</span>
                    <span className="text-xs text-white/40">
                      {p.brand.name} · {dt.format(p.createdAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm tabular-nums text-white/70">{formatPrice(p.specialPrice ?? p.price, "ru")}</span>
                    {p.isHidden ? <Badge tone="muted">скрыт</Badge> : p.inStock ? <Badge tone="ok">в наличии</Badge> : <Badge tone="warn">нет</Badge>}
                  </span>
                </Link>
              </li>
            ))}
            {!latest.length && <li className="py-3 text-sm text-white/40">Товаров пока нет</li>}
          </ul>
        </Card>

        <Card title="Последние изменения в каталоге">
          <ol className="relative flex flex-col gap-4 border-l border-white/10 pl-5">
            {activity.map((a) => (
              <li key={a.id} className="relative">
                <span className={`absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ${a.action === "delete" ? "bg-signal-bright" : a.action === "create" ? "bg-ok" : "bg-white/40"}`} />
                <p className="text-sm text-white/85">{a.summary}</p>
                <p className="text-xs text-white/35">
                  {dt.format(a.createdAt)}
                  {a.actor ? ` · ${a.actor}` : ""}
                </p>
              </li>
            ))}
            {!activity.length && <li className="text-sm text-white/40">Изменений пока не было</li>}
          </ol>
        </Card>
      </div>
    </div>
  );
}
