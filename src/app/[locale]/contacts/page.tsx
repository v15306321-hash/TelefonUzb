import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getSiteContent } from "@/lib/settings";
import { languageAlternates } from "@/lib/seo";
import ContactsSection from "@/components/site/ContactsSection";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.meta.contactsTitle, description: dict.meta.contactsDescription, alternates: languageAlternates(locale, "/contacts") };
}

export default async function ContactsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const content = await getSiteContent();
  return (
    <div className="page-enter pt-16 sm:pt-20">
      <ContactsSection locale={locale} dict={dict} content={content} as="h1" />
    </div>
  );
}
