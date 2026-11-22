import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { ProductCardData } from "@/lib/catalog";
import { formatPrice } from "@/lib/localize";
import SkeletonImage from "./SkeletonImage";

export default function ProductCard({
  product: p,
  locale,
  labels,
  priority = false,
  revealDelay = 0,
}: {
  product: ProductCardData;
  locale: Locale;
  labels: { inStock: string; outOfStock: string };
  priority?: boolean;
  revealDelay?: number;
}) {
  return (
    <Link
      href={`/${locale}/product/${p.slug}`}
      data-reveal
      style={{ ["--reveal-delay" as string]: `${revealDelay}ms` }}
      className="group relative flex flex-col overflow-hidden rounded-[28px] bg-graphite-900 ring-1 ring-white/[0.06] transition-[box-shadow,background-color] duration-500 hover:bg-graphite-850 hover:ring-white/15"
    >
      {/* product shot on a light studio panel, as on official product photos */}
      <div className="relative m-1.5 aspect-square overflow-hidden rounded-[22px] bg-white sm:m-2">
        {p.image ? (
          <SkeletonImage
            src={p.image.url}
            alt={p.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-2 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04] sm:p-5"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-4xl font-bold text-black/10">{p.brand}</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-5 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-white/40">{p.brand}</span>
        <h3 className="line-clamp-2 text-[0.98rem] font-semibold leading-snug tracking-[-0.01em] text-white sm:text-[1.05rem]">{p.name}</h3>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5 pt-3">
          <div className="flex flex-col">
            {p.priceFrom && locale === "ru" && <span className="text-[0.7rem] text-white/40">от</span>}
            <span className="text-[0.95rem] font-semibold text-white sm:text-base">
              {formatPrice(p.price, locale)}
              {p.priceFrom && locale === "uz" && <span className="font-normal text-white/40">dan</span>}
            </span>
          </div>
          <span className={`flex items-center gap-1.5 text-[0.72rem] ${p.inStock ? "text-ok" : "text-white/40"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${p.inStock ? "bg-ok" : "bg-white/30"}`} />
            {p.inStock ? labels.inStock : labels.outOfStock}
          </span>
        </div>
        {p.colors.length > 1 && (
          <div className="mt-2 flex gap-1.5" aria-hidden>
            {p.colors.map((c) => (
              <span key={c} className="h-3 w-3 rounded-full ring-1 ring-white/20" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
