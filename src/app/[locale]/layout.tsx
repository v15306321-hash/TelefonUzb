import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, localeMeta, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getSiteContent, resolveMedia } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import LocaleSync from "@/components/site/LocaleSync";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.homeTitle, template: `%s · ${dict.meta.siteName}` },
    description: dict.meta.homeDescription,
    applicationName: dict.meta.siteName,
    openGraph: {
      siteName: dict.meta.siteName,
      locale: localeMeta[locale].ogLocale,
      type: "website",
      images: [{ url: "/media/hero-poster.webp", width: 1280, height: 720 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const content = await getSiteContent();
  const media = resolveMedia(content);
  const mainPhone = content.contacts[0]?.phone ?? "";

  return (
    <html lang={localeMeta[locale].htmlLang} suppressHydrationWarning>
      <body className="min-h-dvh bg-black">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black">
          {dict.nav.skipToContent}
        </a>
        <Header locale={locale} logo={media.logo} mainPhone={mainPhone} labels={{ ...dict.nav, ...dict.lang }} />
        <main id="main">{children}</main>
        <Footer locale={locale} dict={dict} content={content} logo={media.logo} />
        <LocaleSync locale={locale} />
      </body>
    </html>
  );
}
