"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { saveProductAction } from "@/app/admin/actions";
import { normalize } from "@/lib/search";
import { cameraLayouts, deviceKinds, frameFinishes, type ColorOption, type Model3DConfig, type SpecItem } from "@/lib/types";
import ProductViewer from "@/components/viewer/ProductViewer";
import RenderFromModel from "./RenderFromModel";
import { Badge, Button, Card, Field, Input, Notice, Select, Textarea, Toggle } from "./ui";
import { formatBytes, uploadFile } from "./upload";

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
  specialPrice: string;
  inStock: boolean;
  isHidden: boolean;
  isFeatured: boolean;
  sortOrder: string;
  storageOptions: string[];
  colors: ColorOption[];
  specs: SpecItem[];
  model3d: Model3DConfig;
  model: { id: string; url: string; filename: string; size: number } | null;
  images: { id: string; url: string }[];
};

const LAYOUT_LABELS: Record<Model3DConfig["layout"], string> = {
  "pro-triangle": "Три камеры треугольником (iPhone Pro)",
  "dual-diagonal": "Две камеры по диагонали (iPhone)",
  "vertical-trio": "Три камеры вертикально (Galaxy S)",
  "horizontal-bar": "Горизонтальная панель (Pixel / iPhone Air)",
  "square-quad": "Квадратный блок 2×2 (Xiaomi / Redmi)",
  "round-module": "Круглый модуль (Xiaomi Ultra / OnePlus)",
  single: "Одна камера (планшеты)",
};
const KIND_LABELS: Record<Model3DConfig["kind"], string> = { phone: "Смартфон", tablet: "Планшет" };
const FRAME_LABELS: Record<Model3DConfig["frame"], string> = { titanium: "Титан (матовый)", aluminium: "Алюминий", polished: "Полированная сталь" };

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
  const [renderMode, setRenderMode] = useState<"pair" | "back" | null>(null);
  const [previewColor, setPreviewColor] = useState(0);
  const imageInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductFormValue>(key: K, value: ProductFormValue[K]) => setV((s) => ({ ...s, [key]: value }));
  const err = (k: string) => fieldErrors[k];
  const busy = saving || !!uploading || !!renderMode;

  const onImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setResult(null);
    try {
      for (const [i, f] of Array.from(files).entries()) {
        setUploading(`Фото ${i + 1}/${files.length}: 0%`);
        const a = await uploadFile(f, "image", (p) => setUploading(`Фото ${i + 1}/${files.length}: ${Math.round(p * 100)}%`));
        setV((s) => ({ ...s, images: [...s.images, { id: a.id, url: a.url }] }));
      }
    } catch (e) {
      setResult({ tone: "error", text: (e as Error).message });
    } finally {
      setUploading(null);
      if (imageInput.current) imageInput.current.value = "";
    }
  };

  const onModel = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setResult(null);
    try {
      setUploading("3D-модель: 0%");
      const a = await uploadFile(f, "model", (p) => setUploading(`3D-модель: ${Math.round(p * 100)}%`));
      set("model", { id: a.id, url: a.url, filename: a.filename, size: a.size });
    } catch (e) {
      setResult({ tone: "error", text: (e as Error).message });
    } finally {
      setUploading(null);
      if (modelInput.current) modelInput.current.value = "";
    }
  };

  const onRendered = useCallback(async (blob: Blob) => {
    setRenderMode(null);
    try {
      setUploading("Сохранение изображения…");
      const a = await uploadFile(blob, "image", undefined, `render-${Date.now()}.png`);
      setV((s) => ({ ...s, images: [...s.images, { id: a.id, url: a.url }] }));
    } catch (e) {
      setResult({ tone: "error", text: (e as Error).message });
    } finally {
      setUploading(null);
    }
  }, []);
  const onRenderError = useCallback((e: Error) => {
    setRenderMode(null);
    setResult({ tone: "error", text: e.message });
  }, []);

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
        specialPrice: v.specialPrice.replace(/\s/g, "") ? v.specialPrice.replace(/\s/g, "") : null,
        inStock: v.inStock,
        isHidden: v.isHidden,
        isFeatured: v.isFeatured,
        sortOrder: v.sortOrder || "0",
        storageOptions: v.storageOptions,
        colors: v.colors,
        specs: v.specs.filter((s) => s.valueRu.trim()),
        model3d: v.model3d,
        modelAssetId: v.model?.id ?? null,
        imageAssetIds: v.images.map((i) => i.id),
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

  const previewHex = v.colors[previewColor]?.hex ?? v.colors[0]?.hex ?? "#2b2b2e";
  const viewerKey = useMemo(() => `${v.model?.id ?? "proc"}`, [v.model?.id]);

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

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
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
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Цена, сум *" error={err("price")}>
                <Input inputMode="numeric" value={v.price} onChange={(e) => set("price", e.target.value.replace(/[^\d\s]/g, ""))} aria-invalid={!!err("price")} />
              </Field>
              <Field label="Специальная цена, сум" hint="Акция: показывается вместо обычной" error={err("specialPrice")}>
                <Input inputMode="numeric" value={v.specialPrice} onChange={(e) => set("specialPrice", e.target.value.replace(/[^\d\s]/g, ""))} aria-invalid={!!err("specialPrice")} />
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
            <div className="flex flex-wrap gap-2">
              {v.storageOptions.map((s, i) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 py-1.5 pl-3 pr-1.5 text-sm">
                  {s}
                  <button type="button" className="grid h-5 w-5 place-items-center rounded-full text-white/50 hover:bg-white/15 hover:text-white" onClick={() => set("storageOptions", v.storageOptions.filter((_, j) => j !== i))} aria-label={`Убрать ${s}`}>
                    ×
                  </button>
                </span>
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

          <Card title="Цвета" actions={<Button size="sm" type="button" onClick={() => set("colors", [...v.colors, { nameRu: "", nameUz: "", hex: "#1d1d1f" }])}>+ Цвет</Button>}>
            <div className="flex flex-col gap-3">
              {v.colors.map((c, i) => (
                <div key={i} className="grid grid-cols-[44px_1fr_1fr_auto] items-center gap-2 sm:grid-cols-[44px_1fr_1fr_120px_auto]">
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))}
                    className="h-11 w-11 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
                    aria-label="Цвет"
                  />
                  <Input placeholder="Название (RU)" value={c.nameRu} onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, nameRu: e.target.value } : x)))} aria-invalid={!!err(`colors.${i}.nameRu`)} />
                  <Input placeholder="Название (UZ)" value={c.nameUz} onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, nameUz: e.target.value } : x)))} />
                  <Input className="hidden sm:block" value={c.hex} onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} aria-invalid={!!err(`colors.${i}.hex`)} />
                  <Button size="sm" variant="danger" type="button" onClick={() => set("colors", v.colors.filter((_, j) => j !== i))} aria-label="Удалить цвет">
                    ×
                  </Button>
                </div>
              ))}
              {!v.colors.length && <p className="text-sm text-white/35">Добавьте цвета — первый используется в 3D-модели по умолчанию.</p>}
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
              <div className="flex flex-wrap gap-2">
                <Button size="sm" type="button" disabled={busy} onClick={() => setRenderMode("pair")} title="Студийный снимок спереди и сзади из 3D-модели">
                  Сгенерировать из 3D
                </Button>
                <Button size="sm" variant="light" type="button" disabled={busy} onClick={() => imageInput.current?.click()}>
                  Загрузить фото
                </Button>
              </div>
            }
          >
            <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => onImages(e.target.files)} />
            {v.images.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {v.images.map((img, i) => (
                  <li key={img.id} className="group relative overflow-hidden rounded-2xl bg-graphite-850 ring-1 ring-white/[0.08]">
                    <div className="relative aspect-square bg-[#f5f5f7]">
                      <Image src={img.url} alt="" fill sizes="200px" className="object-contain p-2" />
                    </div>
                    {i === 0 && <span className="absolute left-2 top-2"><Badge tone="neutral">Главное</Badge></span>}
                    <div className="flex justify-between gap-1 border-t border-white/[0.06] p-1.5">
                      <div className="flex gap-1">
                        <Button size="sm" type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Влево">←</Button>
                        <Button size="sm" type="button" onClick={() => moveImage(i, 1)} disabled={i === v.images.length - 1} aria-label="Вправо">→</Button>
                      </div>
                      <Button size="sm" variant="danger" type="button" onClick={() => set("images", v.images.filter((x) => x.id !== img.id))} aria-label="Удалить фото">
                        ×
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/35">JPG, PNG, WebP или AVIF до 12 МБ. Изображения автоматически оптимизируются. Первое фото — обложка в каталоге.</p>
            )}
          </Card>
        </div>

        {/* ---------- 3D column ---------- */}
        <div className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
          <Card title="3D-модель">
            <div className="relative -mx-2 -mt-2 mb-4 h-[360px] overflow-hidden rounded-2xl bg-gradient-to-b from-black/30 to-black">
              <ProductViewer
                key={viewerKey}
                config={v.model3d}
                color={previewHex}
                modelUrl={v.model?.url}
                fallbackImage={v.images[0] ? { url: v.images[0].url, width: null, height: null } : null}
                alt="Предпросмотр 3D"
                labels={{ dragHint: "Потяните, чтобы повернуть", loading: "Загрузка…", fallback: "WebGL недоступен" }}
              />
            </div>
            {v.colors.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {v.colors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPreviewColor(i)}
                    className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-graphite-900 ${i === previewColor ? "ring-white" : "ring-transparent"}`}
                    style={{ background: c.hex }}
                    aria-label={c.nameRu || c.hex}
                  />
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-white/[0.08] p-4">
              <p className="text-sm font-medium">Файл модели (GLB / GLTF)</p>
              {v.model ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-white/60">
                    {v.model.filename} · {formatBytes(v.model.size)}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" type="button" onClick={() => modelInput.current?.click()} disabled={busy}>Заменить</Button>
                    <Button size="sm" variant="danger" type="button" onClick={() => set("model", null)}>×</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-xs text-white/40">
                    Пока файл не загружен, используется процедурная 3D-модель по параметрам ниже. Рекомендуется GLB со сжатием Draco/Meshopt, до 60 МБ.
                  </p>
                  <Button size="sm" variant="light" className="mt-3" type="button" onClick={() => modelInput.current?.click()} disabled={busy}>
                    Загрузить GLB / GLTF
                  </Button>
                </>
              )}
              <input ref={modelInput} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" hidden onChange={(e) => onModel(e.target.files)} />
            </div>

            <div className={`mt-4 grid gap-3 ${v.model ? "opacity-50" : ""}`}>
              <Field label="Тип устройства">
                <Select value={v.model3d.kind} onChange={(e) => set("model3d", { ...v.model3d, kind: e.target.value as Model3DConfig["kind"] })}>
                  {deviceKinds.map((k) => (
                    <option key={k} value={k}>{KIND_LABELS[k]}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Блок камер">
                <Select value={v.model3d.layout} onChange={(e) => set("model3d", { ...v.model3d, layout: e.target.value as Model3DConfig["layout"] })}>
                  {cameraLayouts.map((k) => (
                    <option key={k} value={k}>{LAYOUT_LABELS[k]}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Материал рамки">
                <Select value={v.model3d.frame} onChange={(e) => set("model3d", { ...v.model3d, frame: e.target.value as Model3DConfig["frame"] })}>
                  {frameFinishes.map((k) => (
                    <option key={k} value={k}>{FRAME_LABELS[k]}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>
        </div>
      </div>

      {renderMode && <RenderFromModel config={v.model3d} color={previewHex} modelUrl={v.model?.url} mode={renderMode} onDone={onRendered} onError={onRenderError} />}

      {/* sticky save bar */}
      <div className="sticky bottom-4 z-30 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-graphite-850/95 p-3 pl-5 ring-1 ring-white/10 backdrop-blur-xl">
          <div className="min-w-0 flex-1 text-sm">
            {uploading ? (
              <span className="text-white/60">Загрузка: {uploading}</span>
            ) : renderMode ? (
              <span className="text-white/60">Рендеринг изображения из 3D…</span>
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
