"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveProductAction } from "@/app/admin/actions";
import { normalize } from "@/lib/search";
import type { ColorOption, SpecItem } from "@/lib/types";
import { Badge, Button, Card, Field, Input, Notice, Select, Textarea, Toggle } from "./ui";
import { uploadFile } from "./upload";
import PhotoLibrary from "./PhotoLibrary";

export type ProductFormValue = {
  id?: string;
  slug: string;
  nameRu: string;
  nameUz: string;
  descriptionRu: string;
  descriptionUz: string;
  brandId: string;
  categoryId: string;
  price: string;
  /** price per storage option (empty = base price) */
  storagePrices: Record<string, string>;
  currency: "UZS" | "USD";
  condition: "new" | "used";
  batteryHealth: string;
  batteryCycles: string;
  hasBox: "" | "yes" | "no";
  region: string;
  conditionNoteRu: string;
  conditionNoteUz: string;
  /** this unit's own installment terms */
  installmentOffers: { down: string; months: string; monthly: string }[];
  inStock: boolean;
  isHidden: boolean;
  isFeatured: boolean;
  sortOrder: string;
  storageOptions: string[];
  colors: ColorOption[];
  specs: SpecItem[];
  /** photos in display order; color = HEX of the product colour shown (null = all colours) */
  images: { id: string; url: string; color: string | null; style: "studio" | "photo" }[];
};

const SPEC_TEMPLATE: SpecItem[] = [
  { labelRu: "Экран", labelUz: "Ekran", valueRu: "", valueUz: "" },
  { labelRu: "Процессор", labelUz: "Protsessor", valueRu: "", valueUz: "" },
  { labelRu: "Основная камера", labelUz: "Asosiy kamera", valueRu: "", valueUz: "" },
  { labelRu: "Фронтальная камера", labelUz: "Old kamera", valueRu: "", valueUz: "" },
  { labelRu: "Аккумулятор", labelUz: "Batareya", valueRu: "", valueUz: "" },
  { labelRu: "Операционная система", labelUz: "Operatsion tizim", valueRu: "", valueUz: "" },
  { labelRu: "SIM-карты", labelUz: "SIM-kartalar", valueRu: "", valueUz: "" },
  { labelRu: "Вес", labelUz: "Og‘irligi", valueRu: "", valueUz: "" },
];
const STORAGE_PRESETS = ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB", "2 TB"];

export function slugify(s: string) {
  return normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function ProductForm({
  initial,
  brands,
  categories,
}: {
  initial: ProductFormValue;
  brands: { id: string; name: string }[];
  categories: { id: string; nameRu: string }[];
}) {
  const router = useRouter();
  const [v, setV] = useState<ProductFormValue>(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [saving, startSave] = useTransition();
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [uploadColor, setUploadColor] = useState<string>(""); // colour assigned to newly uploaded photos
  const [libraryOpen, setLibraryOpen] = useState(false);

  const set = <K extends keyof ProductFormValue>(key: K, value: ProductFormValue[K]) => setV((s) => ({ ...s, [key]: value }));
  const err = (k: string) => fieldErrors[k];
  const busy = saving || !!uploading;

  const onImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setResult(null);
    try {
      for (const [i, f] of Array.from(files).entries()) {
        setUploading(`Фото ${i + 1}/${files.length}: 0%`);
        const a = await uploadFile(f, "image", (p) => setUploading(`Фото ${i + 1}/${files.length}: ${Math.round(p * 100)}%`));
        setV((s) => ({ ...s, images: [...s.images, { id: a.id, url: a.url, color: uploadColor || null, style: "studio" as const }] }));
      }
    } catch (e) {
      setResult({ tone: "error", text: (e as Error).message });
    } finally {
      setUploading(null);
      if (imageInput.current) imageInput.current.value = "";
    }
  };

  /** keep photo ↔ colour links valid when a colour is edited or removed */
  const setColors = (colors: ColorOption[], renamed?: { from: string; to: string }) =>
    setV((s) => {
      const hexes = new Set(colors.map((c) => c.hex.toLowerCase()));
      const images = s.images.map((img) => {
        if (renamed && img.color === renamed.from.toLowerCase()) return { ...img, color: renamed.to.toLowerCase() };
        return img.color && !hexes.has(img.color) ? { ...img, color: null } : img;
      });
      return { ...s, colors, images };
    });

  const moveImage = (i: number, d: -1 | 1) =>
    setV((s) => {
      const imgs = [...s.images];
      const j = i + d;
      if (j < 0 || j >= imgs.length) return s;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...s, images: imgs };
    });

  const save = () => {
    setResult(null);
    setFieldErrors({});
    startSave(async () => {
      const payload = {
        id: v.id,
        slug: v.slug,
        nameRu: v.nameRu,
        nameUz: v.nameUz,
        descriptionRu: v.descriptionRu,
        descriptionUz: v.descriptionUz,
        brandId: v.brandId,
        categoryId: v.categoryId,
        price: v.price.replace(/\s/g, ""),
        storagePrices: Object.fromEntries(
          v.storageOptions.map((o) => [o, (v.storagePrices[o] ?? "").replace(/\s/g, "")] as const).filter(([, n]) => n),
        ),
        currency: v.currency,
        condition: v.condition,
        batteryHealth: v.batteryHealth.trim() ? v.batteryHealth.trim() : null,
        batteryCycles: v.batteryCycles.trim() ? v.batteryCycles.trim() : null,
        hasBox: v.hasBox === "" ? null : v.hasBox === "yes",
        region: v.region,
        conditionNoteRu: v.conditionNoteRu,
        conditionNoteUz: v.conditionNoteUz,
        installmentOffers: v.installmentOffers
          .filter((o) => o.months.trim() && o.monthly.trim())
          .map((o) => ({ down: o.down.replace(/\s/g, "") || "0", months: o.months.trim(), monthly: o.monthly.replace(/\s/g, "") })),
        inStock: v.inStock,
        isHidden: v.isHidden,
        isFeatured: v.isFeatured,
        sortOrder: v.sortOrder || "0",
        storageOptions: v.storageOptions,
        colors: v.colors,
        specs: v.specs.filter((s) => s.valueRu.trim()),
        images: v.images.map((i) => ({ assetId: i.id, color: i.color, style: i.style })),
      };
      const r = await saveProductAction(payload);
      if (!r.ok) {
        setResult({ tone: "error", text: r.error });
        setFieldErrors(r.fieldErrors ?? {});
        return;
      }
      setResult({ tone: "ok", text: "Сохранено. Изменения уже на сайте." });
      if (!v.id && r.data?.id) router.replace(`/admin/products/${r.data.id}?created=1`);
      else router.refresh();
    });
  };


  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/products" className="text-sm text-white/45 hover:text-white">
            ← Все товары
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{v.id ? v.nameRu || "Товар" : "Новый товар"}</h1>
        </div>
        {v.id && !v.isHidden && (
          <a href={`/ru/product/${initial.slug}`} target="_blank" rel="noopener" className="text-sm text-white/55 hover:text-white">
            Открыть на сайте ↗
          </a>
        )}
      </div>

      <div className="grid gap-6">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Основное">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Название (RU) *" error={err("nameRu")}>
                <Input
                  value={v.nameRu}
                  aria-invalid={!!err("nameRu")}
                  onChange={(e) => {
                    const nameRu = e.target.value;
                    setV((s) => ({ ...s, nameRu, slug: slugTouched ? s.slug : slugify(nameRu) }));
                  }}
                  placeholder="Apple iPhone 17 Pro Max"
                />
              </Field>
              <Field label="Название (UZ)" hint="Если пусто — используется русское название" error={err("nameUz")}>
                <Input value={v.nameUz} onChange={(e) => set("nameUz", e.target.value)} placeholder="Apple iPhone 17 Pro Max" />
              </Field>
              <Field label="Адрес страницы (slug) *" hint={`/ru/product/${v.slug || "…"}`} error={err("slug")}>
                <Input
                  value={v.slug}
                  aria-invalid={!!err("slug")}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase());
                  }}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Бренд *" error={err("brandId")}>
                  <Select value={v.brandId} onChange={(e) => set("brandId", e.target.value)} aria-invalid={!!err("brandId")}>
                    <option value="">— выберите —</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Категория *" error={err("categoryId")}>
                  <Select value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} aria-invalid={!!err("categoryId")}>
                    <option value="">— выберите —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameRu}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Цена и наличие">
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem_1fr]">
              <Field label={`Цена, ${v.currency === "USD" ? "$" : "сум"} *`} hint="Базовая цена. Для разных объёмов памяти цены задаются ниже, в «Варианты памяти»" error={err("price")}>
                <Input inputMode="numeric" value={v.price} onChange={(e) => set("price", e.target.value.replace(/[^\d\s]/g, ""))} aria-invalid={!!err("price")} />
              </Field>
              <Field label="Валюта">
                <Select value={v.currency} onChange={(e) => set("currency", e.target.value === "USD" ? "USD" : "UZS")}>
                  <option value="UZS">сум</option>
                  <option value="USD">$ USD</option>
                </Select>
              </Field>
              <Field label="Порядок сортировки" hint="Меньше — выше в каталоге">
                <Input inputMode="numeric" value={v.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/[^\d-]/g, ""))} />
              </Field>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Toggle label="В наличии" description="Статус на сайте" checked={v.inStock} onChange={(x) => set("inStock", x)} />
              <Toggle label="Скрыть с сайта" description="Без удаления" checked={v.isHidden} onChange={(x) => set("isHidden", x)} />
              <Toggle label="Хит / новинка" description="Показ на главной" checked={v.isFeatured} onChange={(x) => set("isFeatured", x)} />
            </div>
          </Card>

          <Card title="Состояние и рассрочка аппарата">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Состояние">
                <Select value={v.condition} onChange={(e) => set("condition", e.target.value === "used" ? "used" : "new")}>
                  <option value="new">Новый</option>
                  <option value="used">Б/у</option>
                </Select>
              </Field>
              {v.condition === "used" && (
                <>
                  <Field label="Ёмкость аккумулятора, %" error={err("batteryHealth")}>
                    <Input inputMode="numeric" value={v.batteryHealth} onChange={(e) => set("batteryHealth", e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="97" />
                  </Field>
                  <Field label="Циклы зарядки" hint="Необязательно" error={err("batteryCycles")}>
                    <Input inputMode="numeric" value={v.batteryCycles} onChange={(e) => set("batteryCycles", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="125" />
                  </Field>
                  <Field label="Коробка">
                    <Select value={v.hasBox} onChange={(e) => set("hasBox", e.target.value as ProductFormValue["hasBox"])}>
                      <option value="">Не указано</option>
                      <option value="yes">Есть</option>
                      <option value="no">Нет</option>
                    </Select>
                  </Field>
                  <Field label="Регион / модель" hint="Например: AF/A (SIM + eSIM)">
                    <Input value={v.region} maxLength={60} onChange={(e) => set("region", e.target.value)} placeholder="LL/A" />
                  </Field>
                  <div />
                  <Field label="Комментарий о состоянии (RU)">
                    <Input value={v.conditionNoteRu} maxLength={200} onChange={(e) => set("conditionNoteRu", e.target.value)} placeholder="Почти идеальное" />
                  </Field>
                  <Field label="Комментарий о состоянии (UZ)">
                    <Input value={v.conditionNoteUz} maxLength={200} onChange={(e) => set("conditionNoteUz", e.target.value)} placeholder="Deyarli ideal" />
                  </Field>
                </>
              )}
            </div>

            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Рассрочка для этого аппарата</p>
                  <p className="text-xs text-white/40">Как в посте: первый взнос и ежемесячный платёж ({v.currency === "USD" ? "$" : "сум"}). Если пусто — работает общий калькулятор.</p>
                </div>
                <Button
                  size="sm"
                  type="button"
                  disabled={v.installmentOffers.length >= 6}
                  onClick={() => set("installmentOffers", [...v.installmentOffers, { down: "", months: v.installmentOffers.length ? "6" : "3", monthly: "" }])}
                >
                  + Вариант
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {v.installmentOffers.map((o, i) => {
                  const upd = (patch: Partial<typeof o>) => set("installmentOffers", v.installmentOffers.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <div key={i} className="grid grid-cols-[1fr_5.5rem_1fr_auto] items-end gap-2">
                      <Field label={i === 0 ? "Первый взнос" : ""}>
                        <Input inputMode="numeric" value={o.down} onChange={(e) => upd({ down: e.target.value.replace(/[^\d\s]/g, "") })} placeholder="600" aria-label="Первый взнос" />
                      </Field>
                      <Field label={i === 0 ? "Месяцев" : ""}>
                        <Input inputMode="numeric" value={o.months} onChange={(e) => upd({ months: e.target.value.replace(/\D/g, "").slice(0, 2) })} aria-label="Месяцев" />
                      </Field>
                      <Field label={i === 0 ? "В месяц" : ""}>
                        <Input inputMode="numeric" value={o.monthly} onChange={(e) => upd({ monthly: e.target.value.replace(/[^\d\s]/g, "") })} placeholder="236" aria-label="Платёж в месяц" />
                      </Field>
                      <Button size="sm" variant="danger" type="button" onClick={() => set("installmentOffers", v.installmentOffers.filter((_, j) => j !== i))} aria-label="Удалить вариант">
                        ×
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card title="Описание">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Описание (RU)">
                <Textarea rows={6} value={v.descriptionRu} onChange={(e) => set("descriptionRu", e.target.value)} />
              </Field>
              <Field label="Описание (UZ)" hint="Если пусто — показывается русское описание">
                <Textarea rows={6} value={v.descriptionUz} onChange={(e) => set("descriptionUz", e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title="Варианты памяти">
            <p className="mb-3 text-xs text-white/45">У каждого объёма — своя цена. Пустое поле — базовая цена. В каталоге показывается «от» самой низкой цены.</p>
            <div className="flex flex-col gap-2">
              {v.storageOptions.map((s, i) => (
                <div key={s} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-2">
                  <span className="truncate rounded-xl bg-white/10 px-3 py-2 text-sm font-medium">{s}</span>
                  <Input
                    inputMode="numeric"
                    placeholder={v.price ? `${v.price} (базовая)` : "Цена, сум"}
                    value={v.storagePrices[s] ?? ""}
                    onChange={(e) => set("storagePrices", { ...v.storagePrices, [s]: e.target.value.replace(/[^\d\s]/g, "") })}
                    aria-label={`Цена для ${s}, сум`}
                    aria-invalid={!!err(`storagePrices.${s}`)}
                  />
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      const rest = { ...v.storagePrices };
                      delete rest[s];
                      setV((st) => ({ ...st, storageOptions: st.storageOptions.filter((_, j) => j !== i), storagePrices: rest }));
                    }}
                    aria-label={`Убрать ${s}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {!v.storageOptions.length && <span className="text-sm text-white/35">Не указаны</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {STORAGE_PRESETS.filter((p) => !v.storageOptions.includes(p)).map((p) => (
                <Button key={p} size="sm" type="button" onClick={() => set("storageOptions", [...v.storageOptions, p])}>
                  + {p}
                </Button>
              ))}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.currentTarget.elements.namedItem("custom") as HTMLInputElement) ?? null;
                  const val = input?.value.trim();
                  if (val && !v.storageOptions.includes(val)) set("storageOptions", [...v.storageOptions, val]);
                  if (input) input.value = "";
                }}
              >
                <Input name="custom" placeholder="Свой вариант, напр. 12/256 GB" className="!h-8 w-56 text-xs" maxLength={30} />
                <Button size="sm" type="submit">Добавить</Button>
              </form>
            </div>
          </Card>

          <Card title="Цвета" actions={<Button size="sm" type="button" onClick={() => setColors([...v.colors, { nameRu: "", nameUz: "", hex: "#1d1d1f" }])}>+ Цвет</Button>}>
            <div className="flex flex-col gap-3">
              {v.colors.map((c, i) => (
                <div key={i} className="grid grid-cols-[44px_1fr_1fr_auto] items-center gap-2 sm:grid-cols-[44px_1fr_1fr_120px_auto]">
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) => setColors(v.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)), { from: c.hex, to: e.target.value })}
                    className="h-11 w-11 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
                    aria-label="Цвет"
                  />
                  <Input placeholder="Название (RU)" value={c.nameRu} onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, nameRu: e.target.value } : x)))} aria-invalid={!!err(`colors.${i}.nameRu`)} />
                  <Input placeholder="Название (UZ)" value={c.nameUz} onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, nameUz: e.target.value } : x)))} />
                  <Input className="hidden sm:block" value={c.hex} onChange={(e) => setColors(v.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)), { from: c.hex, to: e.target.value })} aria-invalid={!!err(`colors.${i}.hex`)} />
                  <Button size="sm" variant="danger" type="button" onClick={() => setColors(v.colors.filter((_, j) => j !== i))} aria-label="Удалить цвет">
                    ×
                  </Button>
                </div>
              ))}
              {!v.colors.length && <p className="text-sm text-white/35">Добавьте цвета, затем привяжите к ним фотографии ниже.</p>}
            </div>
          </Card>

          <Card
            title="Характеристики"
            actions={
              <div className="flex gap-2">
                <Button
                  size="sm"
                  type="button"
                  onClick={() => set("specs", [...v.specs, ...SPEC_TEMPLATE.filter((t) => !v.specs.some((s) => s.labelRu === t.labelRu))])}
                >
                  Шаблон
                </Button>
                <Button size="sm" type="button" onClick={() => set("specs", [...v.specs, { labelRu: "", labelUz: "", valueRu: "", valueUz: "" }])}>
                  + Строка
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-3">
              {v.specs.length > 0 && (
                <div className="hidden grid-cols-[1fr_1fr_1.4fr_1.4fr_auto] gap-2 text-xs text-white/35 md:grid">
                  <span>Параметр (RU)</span>
                  <span>Параметр (UZ)</span>
                  <span>Значение (RU)</span>
                  <span>Значение (UZ)</span>
                  <span className="w-[42px]" />
                </div>
              )}
              {v.specs.map((s, i) => {
                const upd = (patch: Partial<SpecItem>) => set("specs", v.specs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] p-2 md:grid-cols-[1fr_1fr_1.4fr_1.4fr_auto] md:border-0 md:p-0">
                    <Input placeholder="Параметр (RU)" value={s.labelRu} onChange={(e) => upd({ labelRu: e.target.value })} />
                    <Input placeholder="Параметр (UZ)" value={s.labelUz} onChange={(e) => upd({ labelUz: e.target.value })} />
                    <Input placeholder="Значение (RU)" value={s.valueRu} onChange={(e) => upd({ valueRu: e.target.value })} />
                    <Input placeholder="Значение (UZ)" value={s.valueUz} onChange={(e) => upd({ valueUz: e.target.value })} />
                    <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
                      <Button size="sm" type="button" onClick={() => i > 0 && set("specs", v.specs.map((x, j) => (j === i - 1 ? v.specs[i] : j === i ? v.specs[i - 1] : x)))} aria-label="Выше">
                        ↑
                      </Button>
                      <Button size="sm" variant="danger" type="button" onClick={() => set("specs", v.specs.filter((_, j) => j !== i))} aria-label="Удалить">
                        ×
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!v.specs.length && <p className="text-sm text-white/35">Нажмите «Шаблон», чтобы добавить стандартный набор характеристик. Пустые значения не сохраняются.</p>}
            </div>
          </Card>

          <Card
            title="Фотографии"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {v.colors.length > 0 && (
                  <Select value={uploadColor} onChange={(e) => setUploadColor(e.target.value)} className="!h-8 w-48 text-xs" aria-label="Цвет для новых фото">
                    <option value="">Новые фото: все цвета</option>
                    {v.colors.map((c) => (
                      <option key={c.hex} value={c.hex.toLowerCase()}>Новые фото: {c.nameRu || c.hex}</option>
                    ))}
                  </Select>
                )}
                <Button size="sm" type="button" disabled={busy} onClick={() => setLibraryOpen(true)}>
                  Из библиотеки
                </Button>
                <Button size="sm" variant="light" type="button" disabled={busy} onClick={() => imageInput.current?.click()}>
                  Загрузить фото
                </Button>
              </div>
            }
          >
            <PhotoLibrary
              open={libraryOpen}
              onClose={() => setLibraryOpen(false)}
              initialQuery={v.nameRu.replace(/^Apple\s+/i, "").replace(/\s+\d+(\/\d+)?\s*(GB|TB)$/i, "")}
              taken={new Set(v.images.map((i) => i.id))}
              onPick={(items) =>
                setV((s) => ({
                  ...s,
                  images: [...s.images, ...items.filter((it) => !s.images.some((x) => x.id === it.id)).map((it) => ({ id: it.id, url: it.url, color: uploadColor || null, style: "studio" as const }))],
                }))
              }
            />
            <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => onImages(e.target.files)} />
            {v.images.length ? (
              <>
                <p className="mb-4 text-xs text-white/40">
                  Привяжите каждое фото к цвету: на странице товара при выборе цвета показываются только его фото (и фото «для всех цветов»). Первое фото — обложка в каталоге. Для б/у аппарата первым поставьте живое фото, за ним — фото той же модели на белом фоне.
                </p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {v.images.map((img, i) => {
                    const colorHex = img.color;
                    return (
                      <li key={img.id} className="group relative overflow-hidden rounded-2xl bg-graphite-850 ring-1 ring-white/[0.08]">
                        <div className="relative aspect-[4/5] bg-white">
                          <Image src={img.url} alt="" fill sizes="220px" className={img.style === "photo" ? "object-cover" : "object-contain"} />
                        </div>
                        {i === 0 && <span className="absolute left-2 top-2"><Badge tone="neutral">Обложка</Badge></span>}
                        <div className="flex flex-col gap-1.5 border-t border-white/[0.06] p-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/25" style={{ background: colorHex ?? "conic-gradient(#e33,#ec3,#3c6,#39e,#a4e,#e33)" }} />
                            <Select
                              value={colorHex ?? ""}
                              onChange={(e) => set("images", v.images.map((x) => (x.id === img.id ? { ...x, color: e.target.value || null } : x)))}
                              className="!h-8 !px-2 !pr-7 text-xs"
                              aria-label="Цвет на фото"
                            >
                              <option value="">Все цвета</option>
                              {v.colors.map((c) => (
                                <option key={c.hex} value={c.hex.toLowerCase()}>{c.nameRu || c.hex}</option>
                              ))}
                            </Select>
                          </div>
                          <Select
                            value={img.style}
                            onChange={(e) => set("images", v.images.map((x) => (x.id === img.id ? { ...x, style: e.target.value === "photo" ? "photo" : "studio" } : x)))}
                            className="!h-8 !px-2 !pr-7 text-xs"
                            aria-label="Тип фото"
                          >
                            <option value="studio">На белом фоне</option>
                            <option value="photo">Живое фото (во весь кадр)</option>
                          </Select>
                          <div className="flex justify-between gap-1">
                            <div className="flex gap-1">
                              <Button size="sm" type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Влево">←</Button>
                              <Button size="sm" type="button" onClick={() => moveImage(i, 1)} disabled={i === v.images.length - 1} aria-label="Вправо">→</Button>
                            </div>
                            <Button size="sm" variant="danger" type="button" onClick={() => set("images", v.images.filter((x) => x.id !== img.id))} aria-label="Удалить фото">
                              ×
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-white/35">JPG, PNG, WebP или AVIF до 12 МБ. Изображения автоматически оптимизируются. Загрузите для каждого цвета фото в разных ракурсах.</p>
            )}
          </Card>
        </div>
      </div>


      {/* sticky save bar */}
      <div className="sticky bottom-4 z-30 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-graphite-850/95 p-3 pl-5 ring-1 ring-white/10 backdrop-blur-xl">
          <div className="min-w-0 flex-1 text-sm">
            {uploading ? (
              <span className="text-white/60">Загрузка: {uploading}</span>
            ) : result ? (
              <Notice tone={result.tone}>{result.text}</Notice>
            ) : (
              <span className="text-white/40">Изменения публикуются на сайте сразу после сохранения.</span>
            )}
          </div>
          <Button variant="light" onClick={save} loading={saving} disabled={busy} className="h-11 px-6">
            {v.id ? "Сохранить изменения" : "Создать товар"}
          </Button>
        </div>
      </div>
    </div>
  );
}
