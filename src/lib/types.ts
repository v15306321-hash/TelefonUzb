import { z } from "zod";

/* ---------- Product JSON fields ---------- */

export const colorOptionSchema = z.object({
  nameRu: z.string().trim().min(1).max(60),
  nameUz: z.string().trim().max(60).default(""),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "HEX, например #1d1d1f"),
});
export type ColorOption = z.infer<typeof colorOptionSchema>;

export const specItemSchema = z.object({
  labelRu: z.string().trim().min(1).max(80),
  labelUz: z.string().trim().max(80).default(""),
  valueRu: z.string().trim().min(1).max(200),
  valueUz: z.string().trim().max(200).default(""),
});
export type SpecItem = z.infer<typeof specItemSchema>;

export const CURRENCIES = ["UZS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const asCurrency = (v: unknown): Currency => (v === "USD" ? "USD" : "UZS");

/** Installment terms for one particular unit: down payment + N monthly payments (product currency). */
export const installmentOfferSchema = z.object({
  down: z.coerce.number().int().min(0).max(2_000_000_000),
  months: z.coerce.number().int().min(1).max(60),
  monthly: z.coerce.number().int().min(1).max(2_000_000_000),
});
export type InstallmentOffer = z.infer<typeof installmentOfferSchema>;

export function parseInstallmentOffers(value: unknown): InstallmentOffer[] {
  const r = z.array(installmentOfferSchema).safeParse(value);
  return r.success ? r.data : [];
}

/** { "256 GB": 12500000 } — only positive integer prices for listed options are kept. */
export function parseStoragePrices(value: unknown, options: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const o of options) {
    const n = (value as Record<string, unknown>)[o];
    if (typeof n === "number" && Number.isInteger(n) && n > 0) out[o] = n;
  }
  return out;
}

export function parseColors(value: unknown): ColorOption[] {
  const r = z.array(colorOptionSchema).safeParse(value);
  return r.success ? r.data : [];
}
export function parseSpecs(value: unknown): SpecItem[] {
  const r = z.array(specItemSchema).safeParse(value);
  return r.success ? r.data : [];
}
/* ---------- Site settings ---------- */

const loc = (max: number) => z.string().trim().max(max).default("");

export const contactSchema = z.object({
  labelRu: z.string().trim().min(1).max(60),
  labelUz: loc(60),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Неверный формат номера"),
});
export type ContactItem = z.infer<typeof contactSchema>;

export const bannerSchema = z.object({
  id: z.string().min(1).max(40),
  titleRu: z.string().trim().min(1).max(120),
  titleUz: loc(120),
  textRu: loc(300),
  textUz: loc(300),
  link: z.string().trim().max(300).default(""),
  imageAssetId: z.string().max(40).nullable().default(null),
  isActive: z.boolean().default(true),
});
export type Banner = z.infer<typeof bannerSchema>;

export const installmentPlanSchema = z.object({
  months: z.coerce.number().int("Срок — целое число месяцев").min(1).max(60),
  /** markup over the cash price, % */
  markup: z.coerce.number().min(0).max(300),
});
export type InstallmentPlan = z.infer<typeof installmentPlanSchema>;

export const DEFAULT_INSTALLMENT_PLANS: InstallmentPlan[] = [
  { months: 3, markup: 0 },
  { months: 6, markup: 0 },
  { months: 12, markup: 0 },
];

export const siteContentSchema = z.object({
  logoAssetId: z.string().max(40).nullable().default(null),
  heroVideoAssetId: z.string().max(40).nullable().default(null),
  heroVideoMobileAssetId: z.string().max(40).nullable().default(null),
  heroPosterAssetId: z.string().max(40).nullable().default(null),
  heroTitleRu: loc(120),
  heroTitleUz: loc(120),
  heroSubtitleRu: loc(300),
  heroSubtitleUz: loc(300),
  aboutTitleRu: loc(120),
  aboutTitleUz: loc(120),
  aboutTextRu: loc(1200),
  aboutTextUz: loc(1200),
  addressRu: loc(200),
  addressUz: loc(200),
  workHoursRu: loc(120),
  workHoursUz: loc(120),
  locationUrl: z.string().trim().url().max(300),
  telegramUrl: z.string().trim().max(300).default(""),
  instagramUrl: z.string().trim().max(300).default(""),
  contacts: z.array(contactSchema).max(10),
  banners: z.array(bannerSchema).max(10).default([]),
  installmentEnabled: z.boolean().default(true),
  installmentPlans: z.array(installmentPlanSchema).max(6).default(DEFAULT_INSTALLMENT_PLANS),
});
export type SiteContent = z.infer<typeof siteContentSchema>;

export const defaultSiteContent: SiteContent = {
  logoAssetId: null,
  heroVideoAssetId: null,
  heroVideoMobileAssetId: null,
  heroPosterAssetId: null,
  heroTitleRu: "Технологии, которые хочется держать в руках",
  heroTitleUz: "Qo‘lda ushlagingiz keladigan texnologiyalar",
  heroSubtitleRu: "Оригинальные смартфоны, планшеты и аксессуары. Гарантия, рассрочка и живая консультация в магазине.",
  heroSubtitleUz: "Original smartfonlar, planshetlar va aksessuarlar. Kafolat, muddatli to‘lov va do‘konda jonli maslahat.",
  aboutTitleRu: "Магазин, в который приходят за уверенностью",
  aboutTitleUz: "Ishonch uchun keladigan do‘kon",
  aboutTextRu:
    "TELEFON.UZB premium — физический магазин смартфонов и мобильной техники. Только оригинальные устройства, честные цены и помощь с выбором. Приходите посмотреть технику вживую или позвоните — уточним наличие за пару минут.",
  aboutTextUz:
    "TELEFON.UZB premium — smartfonlar va mobil texnika do‘koni. Faqat original qurilmalar, halol narxlar va tanlashda yordam. Texnikani jonli ko‘rish uchun keling yoki qo‘ng‘iroq qiling — mavjudligini bir necha daqiqada aniqlaymiz.",
  addressRu: "",
  addressUz: "",
  workHoursRu: "Ежедневно, 09:00 – 21:00",
  workHoursUz: "Har kuni, 09:00 – 21:00",
  locationUrl: "https://t.me/telefonuzb_lokatsiya",
  telegramUrl: "",
  instagramUrl: "",
  contacts: [
    { labelRu: "Главный номер", labelUz: "Asosiy raqam", phone: "+998 98 809 6677" },
    { labelRu: "Ташкент", labelUz: "Toshkent", phone: "+998 90 351 5114" },
    { labelRu: "Рассрочка", labelUz: "Muddatli to‘lov", phone: "+998 98 155 1990" },
  ],
  banners: [],
  installmentEnabled: true,
  installmentPlans: DEFAULT_INSTALLMENT_PLANS,
};
