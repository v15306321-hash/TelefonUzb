/**
 * Language configuration. To add a new language: add its code here, create a
 * dictionary in ./dictionaries and (optionally) translated DB fields.
 */
export const locales = ["ru", "uz"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";
export const LOCALE_COOKIE = "tuzb_locale";
export const LOCALE_STORAGE_KEY = "tuzb_locale";

export const localeMeta: Record<Locale, { label: string; short: string; flag: string; htmlLang: string; ogLocale: string }> = {
  ru: { label: "Русский", short: "RU", flag: "🇷🇺", htmlLang: "ru", ogLocale: "ru_RU" },
  uz: { label: "O‘zbekcha", short: "UZ", flag: "🇺🇿", htmlLang: "uz", ogLocale: "uz_UZ" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Replace the locale prefix of a pathname: /ru/catalog -> /uz/catalog */
export function switchLocalePath(pathname: string, target: Locale): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) parts[1] = target;
  else parts.splice(1, 0, target);
  const joined = parts.join("/");
  return joined.endsWith("/") && joined.length > 1 ? joined.slice(0, -1) : joined;
}
