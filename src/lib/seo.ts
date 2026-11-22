import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { SITE_URL } from "./site";

/** canonical + hreflang alternates for a path without locale prefix ("" for home, "/catalog"...). */
export function languageAlternates(locale: Locale, path: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `${SITE_URL}/${l}${path}`;
  languages["x-default"] = `${SITE_URL}/ru${path}`;
  return { canonical: `${SITE_URL}/${locale}${path}`, languages };
}
