import { z } from "zod";
import { colorOptionSchema, installmentOfferSchema, specItemSchema } from "../types";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Минимум 2 символа")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Только латиница, цифры и дефис");

const idSchema = z.string().regex(/^[a-z0-9]{10,40}$/i, "Некорректный идентификатор");

export const productInputSchema = z
  .object({
    id: idSchema.optional(),
    slug: slugSchema,
    nameRu: z.string().trim().min(2, "Укажите название").max(120),
    nameUz: z.string().trim().max(120).default(""),
    descriptionRu: z.string().trim().max(5000).default(""),
    descriptionUz: z.string().trim().max(5000).default(""),
    brandId: idSchema,
    categoryId: idSchema,
    price: z.coerce.number().int("Цена — целое число").min(1, "Укажите цену").max(2_000_000_000),
    currency: z.enum(["UZS", "USD"]).default("UZS"),
    condition: z.enum(["new", "used"]).default("new"),
    batteryHealth: z.coerce.number().int().min(1).max(100).nullable().default(null),
    batteryCycles: z.coerce.number().int().min(0).max(5000).nullable().default(null),
    hasBox: z.boolean().nullable().default(null),
    region: z.string().trim().max(60).default(""),
    conditionNoteRu: z.string().trim().max(200).default(""),
    conditionNoteUz: z.string().trim().max(200).default(""),
    installmentOffers: z.array(installmentOfferSchema).max(6).default([]),
    inStock: z.boolean(),
    isHidden: z.boolean(),
    isFeatured: z.boolean(),
    sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
    storageOptions: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
    /** price per storage option; missing = base price */
    storagePrices: z.record(z.string().max(30), z.coerce.number().int("Цена — целое число").min(1).max(2_000_000_000)).default({}),
    colors: z.array(colorOptionSchema).max(16).default([]),
    specs: z.array(specItemSchema).max(60).default([]),
    /** photos in display order; `color` = HEX of the colour shown (null = all colours) */
    images: z
      .array(
        z.object({
          assetId: idSchema,
          color: z.string().trim().toLowerCase().regex(/^#[0-9a-f]{6}$/).nullable().default(null),
          style: z.enum(["studio", "photo"]).default("studio"),
        }),
      )
      .max(40)
      .default([]),
  });
export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  nameRu: z.string().trim().min(1, "Укажите название").max(60),
  nameUz: z.string().trim().max(60).default(""),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
  isVisible: z.boolean().default(true),
});

export const brandInputSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  name: z.string().trim().min(1, "Укажите название").max(60),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
  isVisible: z.boolean().default(true),
});

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function zodErrors(err: z.ZodError): { error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  const first = err.issues[0];
  return { error: first ? `${first.path.join(".") || "Форма"}: ${first.message}` : "Ошибка валидации", fieldErrors };
}
