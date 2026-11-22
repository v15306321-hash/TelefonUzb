import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCatalogFacets, getVisibleProducts, toCard } from "@/lib/catalog";
import { pick } from "@/lib/localize";
import { getSiteContent, resolveMedia } from "@/lib/settings";
import { assetUrl } from "@/lib/storage";
import { languageAlternates } from "@/lib/seo";
import HeroVideo from "@/components/site/HeroVideo";
import SearchBox from "@/components/site/SearchBox";
import ProductCard from "@/components/site/ProductCard";
import ContactsSection from "@/components/site/ContactsSection";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: { absolute: dict.meta.homeTitle },
    description: dict.meta.homeDescription,
    alternates: languageAlternates(locale, ""),
  };
}

/** Eased gradient stops — avoids the visible "edge" of a linear gradient. */
const HERO_FADE =
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.013) 8.1%, rgba(0,0,0,0.049) 15.5%, rgba(0,0,0,0.104) 22.5%, rgba(0,0,0,0.175) 29%, rgba(0,0,0,0.259) 35.3%, rgba(0,0,0,0.352) 41.2%, rgba(0,0,0,0.45) 47.1%, rgba(0,0,0,0.55) 52.9%, rgba(0,0,0,0.648) 58.8%, rgba(0,0,0,0.741) 64.7%, rgba(0,0,0,0.825) 71%, rgba(0,0,0,0.896) 77.5%, rgba(0,0,0,0.951) 84.5%, rgba(0,0,0,0.987) 91.9%, #000 100%)";

export default async function HomePage({ params }: Params) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const [content, products] = await Promise.all([getSiteContent(), getVisibleProducts()]);
  const media = resolveMedia(content);
  const { categories, brands } = await getCatalogFacets(products);

  const featured = [...products]
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.inStock) - Number(a.inStock))
    .slice(0, 8)
    .map((p) => toCard(p, locale));
  const banners = content.banners.filter((b) => b.isActive);
  const cardLabels = { inStock: dict.product.inStock, outOfStock: dict.product.outOfStock };

  return (
    <div className="page-enter">
      {/* ---------------- HERO ---------------- */}
      <section className="relative isolate flex h-[100svh] min-h-[600px] w-full flex-col overflow-hidden" aria-label={dict.hero.videoLabel}>
        <HeroVideo
          src={media.heroVideo}
          mobileSrc={media.heroVideoMobile}
          poster={media.heroPoster}
          mobilePoster={media.heroPosterMobile}
          label={dict.hero.videoLabel}
        />
        {/* top shade for header legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
        {/* bottom dissolve into the page background */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] sm:h-[62%]" style={{ background: HERO_FADE }} />
        {/* soft scrim behind the headline for legibility over the bright shop window */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_68%,rgba(0,0,0,0.55),transparent_70%)] sm:bg-[radial-gradient(ellipse_55%_40%_at_50%_66%,rgba(0,0,0,0.5),transparent_72%)]" />

        <div className="container-x relative z-10 mt-auto flex flex-col items-center pb-[max(4.5rem,11svh)] text-center">
          <p className="eyebrow mb-4 !text-white/70 animate-fade-up">{dict.hero.eyebrow}</p>
          <h1 className="headline max-w-4xl text-balance text-[2.2rem] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.45)] animate-fade-up [animation-delay:80ms] sm:text-6xl lg:text-7xl">
            {pick(locale, content.heroTitleRu, content.heroTitleUz)}
          </h1>
          <p className="mt-4 max-w-xl text-balance text-[0.98rem] text-white/75 [text-shadow:0_1px_16px_rgba(0,0,0,0.6)] animate-fade-up [animation-delay:160ms] sm:mt-5 sm:text-lg">
            {pick(locale, content.heroSubtitleRu, content.heroSubtitleUz)}
          </p>
          <div className="mt-8 flex w-full justify-center animate-fade-up [animation-delay:240ms] sm:mt-10">
            <SearchBox locale={locale} labels={dict.search} />
          </div>
          <p className="mt-4 text-xs text-white/40 animate-fade-up [animation-delay:320ms]">{dict.search.hints}</p>
        </div>

        <a
          href="#featured"
          className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em] text-white/35 transition-colors hover:text-white/70 sm:flex"
        >
          {dict.hero.scroll}
          <span className="block h-7 w-px animate-pulse bg-gradient-to-b from-white/50 to-transparent" />
        </a>
      </section>

      {/* ---------------- CATEGORIES + FEATURED ---------------- */}
      <section id="featured" className="container-x scroll-mt-20 pt-10 sm:pt-16" aria-labelledby="featured-title">
        <div className="mb-8 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between" data-reveal>
          <div>
            <h2 id="featured-title" className="headline text-4xl sm:text-6xl">
              {dict.home.featuredTitle}
            </h2>
            <p className="mt-3 text-lg text-white/50">{dict.home.featuredSubtitle}</p>
          </div>
          <Link href={`/${locale}/catalog`} className="btn btn-ghost self-start sm:self-auto">
            {dict.home.viewCatalog} <span aria-hidden>→</span>
          </Link>
        </div>

        {categories.length > 0 && (
          <nav aria-label={dict.home.categoriesTitle} className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" data-reveal>
            {categories
              .filter((c) => c.count > 0)
              .map((c) => (
                <Link key={c.id} href={`/${locale}/catalog?category=${c.slug}`} className="chip">
                  {pick(locale, c.nameRu, c.nameUz)}
                  <span className="text-white/35">{c.count}</span>
                </Link>
              ))}
          </nav>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {featured.map((p, i) => (
            <ProductCard key={p.slug} product={p} locale={locale} labels={cardLabels} revealDelay={(i % 4) * 70} />
          ))}
        </div>
      </section>

      {/* ---------------- BANNERS (managed in admin) ---------------- */}
      {banners.length > 0 && (
        <section className="container-x mt-20 grid gap-4 sm:mt-28 md:grid-cols-2">
          {banners.map((b) => {
            const img = assetUrl(b.imageAssetId);
            const inner = (
              <>
                {img && <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover opacity-70 transition-transform duration-700 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="relative mt-auto p-7 sm:p-9">
                  <h3 className="headline text-3xl sm:text-4xl">{pick(locale, b.titleRu, b.titleUz)}</h3>
                  {pick(locale, b.textRu, b.textUz) && <p className="mt-2 max-w-md text-white/65">{pick(locale, b.textRu, b.textUz)}</p>}
                </div>
              </>
            );
            const cls = "group relative flex min-h-[300px] overflow-hidden rounded-[32px] bg-graphite-900 ring-1 ring-white/[0.06]";
            return b.link ? (
              <a key={b.id} href={b.link} className={cls} data-reveal>
                {inner}
              </a>
            ) : (
              <div key={b.id} className={cls} data-reveal>
                {inner}
              </div>
            );
          })}
        </section>
      )}

      {/* ---------------- PERKS ---------------- */}
      <section className="container-x mt-24 sm:mt-36" aria-labelledby="perks-title">
        <h2 id="perks-title" className="headline mb-10 max-w-3xl text-4xl sm:mb-14 sm:text-6xl" data-reveal>
          {dict.home.perksTitle}
        </h2>
        <ul className="grid gap-px overflow-hidden rounded-[32px] bg-white/[0.06] ring-1 ring-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {dict.home.perks.map((perk, i) => (
            <li key={perk.title} className="flex flex-col gap-10 bg-black p-7 sm:p-8" data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
              <span className="text-sm font-semibold tabular-nums text-signal-bright">0{i + 1}</span>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{perk.title}</h3>
                <p className="mt-2 text-white/50">{perk.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- BRANDS ---------------- */}
      {brands.length > 0 && (
        <section className="container-x mt-24 sm:mt-32" aria-labelledby="brands-title">
          <h2 id="brands-title" className="eyebrow mb-6" data-reveal>
            {dict.home.brandsTitle}
          </h2>
          <ul className="flex flex-wrap gap-x-10 gap-y-5" data-reveal>
            {brands.map((b) => (
              <li key={b.id}>
                <Link href={`/${locale}/catalog?brand=${b.slug}`} className="text-2xl font-bold tracking-tight text-white/30 transition-colors hover:text-white sm:text-4xl">
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------- ABOUT ---------------- */}
      <section className="container-x mt-24 sm:mt-36">
        <div className="relative overflow-hidden rounded-[36px] bg-graphite-900 px-6 py-14 ring-1 ring-white/[0.06] sm:px-14 sm:py-20" data-reveal>
          <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-signal/20 blur-[100px]" />
          <div className="relative max-w-3xl">
            <p className="eyebrow mb-5">TELEFON.UZB premium</p>
            <h2 className="headline text-balance text-3xl sm:text-5xl">{pick(locale, content.aboutTitleRu, content.aboutTitleUz)}</h2>
            <p className="mt-6 text-lg leading-relaxed text-white/60">{pick(locale, content.aboutTextRu, content.aboutTextUz)}</p>
            <a href="#contacts" className="btn btn-light mt-9">
              {dict.home.contactCta}
            </a>
          </div>
        </div>
      </section>

      <ContactsSection locale={locale} dict={dict} content={content} />
    </div>
  );
}
