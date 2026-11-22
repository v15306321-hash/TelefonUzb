import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { t } from "@/i18n/format";
import { effectivePrice, getProductBySlug, getVisibleProducts, toCard } from "@/lib/catalog";
import { formatPrice, pick, telHref } from "@/lib/localize";
import { getSiteContent } from "@/lib/settings";
import { languageAlternates } from "@/lib/seo";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import ProductShowcase from "@/components/site/ProductShowcase";
import ProductCard from "@/components/site/ProductCard";
import { PhoneIcon } from "@/components/site/Header";
import { PinIcon } from "@/components/site/ContactsSection";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const dict = getDictionary(locale);
  const name = pick(locale, p.nameRu, p.nameUz);
  const description = t(dict.meta.productDescription, {
    name,
    price: formatPrice(effectivePrice(p), locale),
    availability: p.inStock ? dict.product.inStock : dict.product.outOfStock,
  });
  return {
    title: name,
    description,
    alternates: languageAlternates(locale, `/product/${p.slug}`),
    openGraph: { title: name, description, type: "website", images: p.images[0] ? [{ url: p.images[0].url, alt: name }, OG_IMAGE] : [OG_IMAGE] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const [p, content, all] = await Promise.all([getProductBySlug(slug), getSiteContent(), getVisibleProducts()]);
  if (!p) notFound();

  const name = pick(locale, p.nameRu, p.nameUz);
  const description = pick(locale, p.descriptionRu, p.descriptionUz);
  const special = p.specialPrice && p.specialPrice < p.price ? p.specialPrice : null;
  const mainPhone = content.contacts[0]?.phone;
  const installmentPhone = content.contacts.find((c) => /рассроч/i.test(c.labelRu))?.phone ?? content.contacts[2]?.phone;

  const related = all
    .filter((x) => x.id !== p.id && (x.category.id === p.category.id || x.brand.id === p.brand.id))
    .sort((a, b) => Number(b.brand.id === p.brand.id) - Number(a.brand.id === p.brand.id))
    .slice(0, 4)
    .map((x) => toCard(x, locale));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    brand: { "@type": "Brand", name: p.brand.name },
    description: description || undefined,
    image: p.images.map((i) => `${SITE_URL}${i.url}`),
    offers: {
      "@type": "Offer",
      priceCurrency: "UZS",
      price: effectivePrice(p),
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/${locale}/product/${p.slug}`,
    },
  };

  return (
    <div className="page-enter container-x pb-24 pt-24 sm:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav className="mb-6 text-sm" aria-label="breadcrumbs">
        <Link href={`/${locale}/catalog`} className="inline-flex items-center gap-2 text-white/50 transition-colors hover:text-white">
          <span aria-hidden>←</span> {dict.product.backToCatalog}
        </Link>
      </nav>

      <ProductShowcase
        name={name}
        images={p.images}
        colors={p.colors.map((c) => ({ name: pick(locale, c.nameRu, c.nameUz), hex: c.hex }))}
        storageOptions={p.storageOptions}
        labels={{
          color: dict.product.color,
          storage: dict.product.storage,
          photos: dict.product.photos,
          prevPhoto: dict.product.prevPhoto,
          nextPhoto: dict.product.nextPhoto,
          openPhoto: dict.product.openPhoto,
          closePhoto: dict.product.closePhoto,
        }}
        header={
          <div className="animate-fade-up">
            <Link href={`/${locale}/catalog?brand=${p.brand.slug}`} className="eyebrow hover:text-white">
              {p.brand.name}
            </Link>
            <h1 className="headline mt-3 text-4xl sm:text-5xl xl:text-6xl">{name}</h1>
            <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="text-3xl font-semibold tracking-tight">{formatPrice(special ?? p.price, locale)}</span>
              {special && (
                <>
                  <span className="pb-1 text-lg text-white/35 line-through" aria-label={dict.product.oldPrice}>
                    {formatPrice(p.price, locale)}
                  </span>
                  <span className="mb-1.5 rounded-full bg-signal px-2.5 py-1 text-xs font-semibold">{dict.product.specialPrice}</span>
                </>
              )}
            </div>
            <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${p.inStock ? "bg-ok/10 text-ok" : "bg-white/5 text-white/50"}`}>
              <span className={`h-2 w-2 rounded-full ${p.inStock ? "bg-ok shadow-[0_0_12px] shadow-ok" : "bg-white/30"}`} />
              {p.inStock ? dict.product.inStock : dict.product.outOfStock}
            </p>
          </div>
        }
        actions={
          <div className="mt-9 flex flex-col gap-3">
            {mainPhone && (
              <a href={telHref(mainPhone)} className="btn btn-primary w-full !py-4 text-base">
                <PhoneIcon />
                {dict.product.contactCta}
              </a>
            )}
            <div className="grid grid-cols-2 gap-3">
              {installmentPhone && (
                <a href={telHref(installmentPhone)} className="btn btn-ghost !px-3 text-sm">
                  {dict.product.installments}
                </a>
              )}
              <a href={content.locationUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !px-3 text-sm">
                <PinIcon />
                {dict.product.location}
              </a>
            </div>
            <p className="text-xs text-white/35">{dict.product.chooseHint}</p>
          </div>
        }
      >
        {p.specs.length > 0 && (
          <section className="mt-12" aria-labelledby="specs-title">
            <h2 id="specs-title" className="mb-4 text-xl font-semibold tracking-tight">
              {dict.product.specs}
            </h2>
            <dl className="divide-y divide-white/[0.07] overflow-hidden rounded-3xl bg-graphite-900 ring-1 ring-white/[0.06]">
              {p.specs.map((s, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-5 py-3.5 text-sm">
                  <dt className="text-white/45">{pick(locale, s.labelRu, s.labelUz)}</dt>
                  <dd className="text-white/90">{pick(locale, s.valueRu, s.valueUz)}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-5 py-3.5 text-sm">
                <dt className="text-white/45">{dict.product.category}</dt>
                <dd className="text-white/90">{pick(locale, p.category.nameRu, p.category.nameUz)}</dd>
              </div>
            </dl>
          </section>
        )}
        {description && (
          <section className="mt-10" aria-labelledby="desc-title">
            <h2 id="desc-title" className="mb-3 text-xl font-semibold tracking-tight">
              {dict.product.description}
            </h2>
            <div className="whitespace-pre-line leading-relaxed text-white/60">{description}</div>
          </section>
        )}
      </ProductShowcase>

      {related.length > 0 && (
        <section className="mt-24 sm:mt-32" aria-labelledby="related-title">
          <h2 id="related-title" className="headline mb-8 text-3xl sm:text-5xl" data-reveal>
            {dict.product.related}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((r, i) => (
              <ProductCard key={r.slug} product={r} locale={locale} labels={{ inStock: dict.product.inStock, outOfStock: dict.product.outOfStock }} revealDelay={i * 60} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
