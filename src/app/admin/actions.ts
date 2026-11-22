"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, startSession, endSession } from "@/lib/auth/server";
import { dummyVerify, hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { CATALOG_TAG } from "@/lib/catalog";
import { SETTINGS_TAG, readSiteContent } from "@/lib/settings";
import { siteContentSchema } from "@/lib/types";
import { logActivity } from "@/lib/admin/activity";
import { deleteIfUnreferenced } from "@/lib/admin/assets";
import {
  brandInputSchema,
  categoryInputSchema,
  productInputSchema,
  zodErrors,
  type ActionResult,
} from "@/lib/admin/schemas";

const refreshCatalog = () => revalidateTag(CATALOG_TAG);

function uniqueError(e: unknown, field: string, message: string): ActionResult | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { ok: false, error: message, fieldErrors: { [field]: message } };
  }
  return null;
}

/* ============================== AUTH ============================== */

export async function loginAction(_prev: { error?: string; username?: string } | undefined, formData: FormData): Promise<{ error?: string; username?: string }> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase().slice(0, 60);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";

  const byIp = rateLimit(`login-ip:${ip}`, 20, 15 * 60_000);
  const byUser = rateLimit(`login-user:${username}`, 8, 15 * 60_000);
  if (!byIp.ok || !byUser.ok) {
    const wait = Math.max(byIp.retryAfterSec, byUser.retryAfterSec);
    return { error: `Слишком много попыток входа. Повторите через ${Math.ceil(wait / 60)} мин.`, username };
  }
  if (!username || !password) return { error: "Введите логин и пароль", username };

  const user = await prisma.adminUser.findUnique({ where: { username } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : await dummyVerify(password);
  if (!user || !valid) return { error: "Неверный логин или пароль", username };

  resetRateLimit(`login-user:${username}`);
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user);
  await logActivity("login", "admin", user.id, `Вход в панель: ${user.username}`, user.username);
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
  if (!(await verifyPassword(current, user.passwordHash))) return { ok: false, error: "Текущий пароль указан неверно" };
  if (next !== confirm) return { ok: false, error: "Новые пароли не совпадают" };
  const problem = passwordProblems(next);
  if (problem) return { ok: false, error: problem };
  const updated = await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), tokenVersion: { increment: 1 } },
  });
  await startSession(updated); // keep this session, invalidate all others
  await logActivity("update", "admin", user.id, "Пароль администратора изменён", admin.username);
  return { ok: true, message: "Пароль изменён. Остальные сессии завершены." };
}

export async function logoutEverywhereAction() {
  const admin = await requireAdmin();
  await prisma.adminUser.update({ where: { id: admin.id }, data: { tokenVersion: { increment: 1 } } });
  await endSession();
  redirect("/admin/login");
}

/* ============================== PRODUCTS ============================== */

export async function saveProductAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...zodErrors(parsed.error) };
  const v = parsed.data;

  const [brand, category] = await Promise.all([
    prisma.brand.findUnique({ where: { id: v.brandId }, select: { id: true } }),
    prisma.category.findUnique({ where: { id: v.categoryId }, select: { id: true } }),
  ]);
  if (!brand) return { ok: false, error: "Бренд не найден", fieldErrors: { brandId: "Бренд не найден" } };
  if (!category) return { ok: false, error: "Категория не найдена", fieldErrors: { categoryId: "Категория не найдена" } };

  const referenced = [...v.imageAssetIds, ...(v.modelAssetId ? [v.modelAssetId] : [])];
  if (referenced.length) {
    const found = await prisma.asset.findMany({ where: { id: { in: referenced } }, select: { id: true, mimeType: true } });
    const byId = new Map(found.map((a) => [a.id, a.mimeType]));
    if (v.imageAssetIds.some((id) => !byId.get(id)?.startsWith("image/"))) return { ok: false, error: "Одно из изображений не найдено" };
    if (v.modelAssetId && !byId.get(v.modelAssetId)?.startsWith("model/")) return { ok: false, error: "3D-модель не найдена" };
  }

  const data = {
    slug: v.slug,
    nameRu: v.nameRu,
    nameUz: v.nameUz,
    descriptionRu: v.descriptionRu,
    descriptionUz: v.descriptionUz,
    price: v.price,
    specialPrice: v.specialPrice && v.specialPrice > 0 ? v.specialPrice : null,
    inStock: v.inStock,
    isHidden: v.isHidden,
    isFeatured: v.isFeatured,
    sortOrder: v.sortOrder,
    storageOptions: v.storageOptions,
    colors: v.colors,
    specs: v.specs,
    model3d: v.model3d,
    modelAssetId: v.modelAssetId,
    brandId: v.brandId,
    categoryId: v.categoryId,
  };

  try {
    let id: string;
    let removedAssets: string[] = [];
    if (v.id) {
      const existing = await prisma.product.findUnique({ where: { id: v.id }, include: { images: true } });
      if (!existing) return { ok: false, error: "Товар не найден" };
      removedAssets = [
        ...existing.images.map((i) => i.assetId).filter((a) => !v.imageAssetIds.includes(a)),
        ...(existing.modelAssetId && existing.modelAssetId !== v.modelAssetId ? [existing.modelAssetId] : []),
      ];
      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId: v.id } }),
        prisma.product.update({
          where: { id: v.id },
          data: { ...data, images: { create: v.imageAssetIds.map((assetId, i) => ({ assetId, sortOrder: i })) } },
        }),
      ]);
      id = v.id;
      const changes: string[] = [];
      if (existing.price !== v.price) changes.push(`цена ${existing.price} → ${v.price}`);
      if (existing.inStock !== v.inStock) changes.push(v.inStock ? "в наличии" : "нет в наличии");
      if (existing.isHidden !== v.isHidden) changes.push(v.isHidden ? "скрыт" : "опубликован");
      await logActivity("update", "product", id, `Изменён «${v.nameRu}»${changes.length ? ` (${changes.join(", ")})` : ""}`, admin.username);
    } else {
      const created = await prisma.product.create({
        data: { ...data, images: { create: v.imageAssetIds.map((assetId, i) => ({ assetId, sortOrder: i })) } },
      });
      id = created.id;
      await logActivity("create", "product", id, `Добавлен «${v.nameRu}»`, admin.username);
    }
    await deleteIfUnreferenced(removedAssets);
    refreshCatalog();
    return { ok: true, data: { id }, message: "Сохранено" };
  } catch (e) {
    const u = uniqueError(e, "slug", "Такой адрес (slug) уже используется другим товаром");
    if (u) return u as ActionResult<{ id: string }>;
    console.error(e);
    return { ok: false, error: "Не удалось сохранить товар" };
  }
}

export async function toggleProductFlagAction(id: string, flag: "inStock" | "isHidden" | "isFeatured", value: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!["inStock", "isHidden", "isFeatured"].includes(flag) || typeof value !== "boolean") return { ok: false, error: "Некорректный запрос" };
  const p = await prisma.product.update({ where: { id }, data: { [flag]: value } }).catch(() => null);
  if (!p) return { ok: false, error: "Товар не найден" };
  const text = {
    inStock: value ? "отмечен «в наличии»" : "отмечен «нет в наличии»",
    isHidden: value ? "скрыт с сайта" : "опубликован",
    isFeatured: value ? "добавлен в хиты" : "убран из хитов",
  }[flag];
  await logActivity(flag === "inStock" ? "stock" : "update", "product", id, `«${p.nameRu}» ${text}`, admin.username);
  refreshCatalog();
  return { ok: true };
}

export async function deleteProductAction(id: string, confirmSlug: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!p) return { ok: false, error: "Товар не найден" };
  if (confirmSlug !== p.slug) return { ok: false, error: "Подтверждение не совпадает" };
  const assets = [...p.images.map((i) => i.assetId), ...(p.modelAssetId ? [p.modelAssetId] : [])];
  await prisma.product.delete({ where: { id } });
  await deleteIfUnreferenced(assets);
  await logActivity("delete", "product", id, `Удалён «${p.nameRu}»`, admin.username);
  refreshCatalog();
  return { ok: true };
}

/* ============================== TAXONOMY ============================== */

export async function saveCategoryAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = categoryInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...zodErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  try {
    if (id) await prisma.category.update({ where: { id }, data });
    else await prisma.category.create({ data });
    await logActivity(id ? "update" : "create", "category", id ?? null, `${id ? "Изменена" : "Создана"} категория «${data.nameRu}»`, admin.username);
    refreshCatalog();
    return { ok: true };
  } catch (e) {
    return uniqueError(e, "slug", "Категория с таким slug уже существует") ?? { ok: false, error: "Не удалось сохранить категорию" };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const c = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!c) return { ok: false, error: "Категория не найдена" };
  if (c._count.products > 0) return { ok: false, error: `В категории ${c._count.products} товар(ов). Перенесите или удалите их, либо скройте категорию.` };
  await prisma.category.delete({ where: { id } });
  await logActivity("delete", "category", id, `Удалена категория «${c.nameRu}»`, admin.username);
  refreshCatalog();
  return { ok: true };
}

export async function saveBrandAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = brandInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...zodErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  try {
    if (id) await prisma.brand.update({ where: { id }, data });
    else await prisma.brand.create({ data });
    await logActivity(id ? "update" : "create", "brand", id ?? null, `${id ? "Изменён" : "Добавлен"} бренд «${data.name}»`, admin.username);
    refreshCatalog();
    return { ok: true };
  } catch (e) {
    return uniqueError(e, "slug", "Бренд с таким slug уже существует") ?? { ok: false, error: "Не удалось сохранить бренд" };
  }
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const b = await prisma.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!b) return { ok: false, error: "Бренд не найден" };
  if (b._count.products > 0) return { ok: false, error: `У бренда ${b._count.products} товар(ов). Сначала измените или удалите их.` };
  await prisma.brand.delete({ where: { id } });
  await logActivity("delete", "brand", id, `Удалён бренд «${b.name}»`, admin.username);
  refreshCatalog();
  return { ok: true };
}

/* ============================== SITE CONTENT ============================== */

export async function saveSiteContentAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = siteContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, ...zodErrors(parsed.error) };
  const next = parsed.data;

  const ids = [next.logoAssetId, next.heroVideoAssetId, next.heroVideoMobileAssetId, next.heroPosterAssetId, ...next.banners.map((b) => b.imageAssetId)].filter(
    (x): x is string => !!x,
  );
  if (ids.length) {
    const found = await prisma.asset.count({ where: { id: { in: ids } } });
    if (found !== new Set(ids).size) return { ok: false, error: "Один из файлов не найден — загрузите его заново" };
  }

  const prev = await readSiteContent();
  await prisma.siteSettings.upsert({ where: { id: 1 }, create: { id: 1, content: next }, update: { content: next } });
  const prevIds = [prev.logoAssetId, prev.heroVideoAssetId, prev.heroVideoMobileAssetId, prev.heroPosterAssetId, ...prev.banners.map((b) => b.imageAssetId)].filter(
    (x): x is string => !!x && !ids.includes(x),
  );
  await deleteIfUnreferenced(prevIds);
  await logActivity("update", "settings", null, "Обновлено содержимое сайта", admin.username);
  revalidateTag(SETTINGS_TAG);
  return { ok: true, message: "Изменения опубликованы" };
}
