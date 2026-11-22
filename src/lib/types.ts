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

export const deviceKinds = ["phone", "tablet"] as const;
export const cameraLayouts = [
  "pro-triangle",
  "dual-diagonal",
  "dual-vertical",
  "vertical-trio",
  "horizontal-bar",
  "square-quad",
  "round-module",
  "single",
] as const;
export const frameFinishes = ["titanium", "aluminium", "polished"] as const;
/** Exact device models with dedicated 3D geometry (see components/viewer/device-specs.ts). */
export const devicePresets = ["iphone-11", "iphone-13", "iphone-13-pro", "iphone-15", "iphone-17-pro"] as const;

export const model3dSchema = z.object({
  kind: z.enum(deviceKinds).default("phone"),
  layout: z.enum(cameraLayouts).default("pro-triangle"),
  frame: z.enum(frameFinishes).default("aluminium"),
  preset: z.enum(devicePresets).optional(),
});
export type Model3DConfig = z.infer<typeof model3dSchema>;

export function parseColors(value: unknown): ColorOption[] {
  const r = z.array(colorOptionSchema).safeParse(value);
  return r.success ? r.data : [];
}
export function parseSpecs(value: unknown): SpecItem[] {
  const r = z.array(specItemSchema).safeParse(value);
  return r.success ? r.data : [];
}
export function parseModel3d(value: unknown): Model3DConfig {
  const r = model3dSchema.safeParse(value ?? {});
  return r.success ? r.data : model3dSchema.parse({});
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
};
