import type { Locale } from "@/i18n/config";

/**
 * Pick a localized value. Russian is the source language and the fallback
 * when a translation for the requested locale is empty.
 */
export function pick(locale: Locale, ru: string | null | undefined, uz: string | null | undefined): string {
  if (locale === "uz" && uz && uz.trim()) return uz;
  return ru ?? "";
}

/** Pick a localized field from an object with `${base}Ru` / `${base}Uz` keys. */
export function pickField<T extends Record<string, unknown>>(locale: Locale, obj: T, base: string): string {
  const ru = obj[`${base}Ru`];
  const uz = obj[`${base}Uz`];
  return pick(locale, typeof ru === "string" ? ru : "", typeof uz === "string" ? uz : "");
}

export function formatPrice(value: number, locale: Locale, currency: "UZS" | "USD" = "UZS"): string {
  const n = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value).replace(/ | /g, " ");
  if (currency === "USD") return `${n} $`;
  return locale === "uz" ? `${n} so‘m` : `${n} сум`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
