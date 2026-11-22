"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveSiteContentAction } from "@/app/admin/actions";
import type { Banner, ContactItem, SiteContent } from "@/lib/types";
import { Button, Card, Field, Input, Notice, Textarea, Toggle } from "./ui";
import { uploadFile } from "./upload";

const media = (id: string | null) => (id ? `/api/media/${id}` : null);

export default function ContentForm({ initial }: { initial: SiteContent }) {
  const router = useRouter();
  const [c, setC] = useState<SiteContent>(initial);
  const [saving, start] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K]) => setC((s) => ({ ...s, [k]: v }));

  const upload = async (file: File | undefined, kind: "image" | "video", onDone: (id: string) => void) => {
    if (!file) return;
    setMsg(null);
    try {
      setUploading("0%");
      const a = await uploadFile(file, kind, (p) => setUploading(`${Math.round(p * 100)}%`));
      onDone(a.id);
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setUploading(null);
    }
  };

  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await saveSiteContentAction(c);
      setMsg(r.ok ? { tone: "ok", text: r.message ?? "Сохранено" } : { tone: "error", text: r.error });
      if (r.ok) router.refresh();
    });

  const pair = (label: string, ru: keyof SiteContent, uz: keyof SiteContent, multiline = false) => (
    <div className="grid gap-4 md:grid-cols-2">
      {(["ru", "uz"] as const).map((lng) => {
        const key = lng === "ru" ? ru : uz;
        const Comp = multiline ? Textarea : Input;
        return (
          <Field key={lng} label={`${label} (${lng.toUpperCase()})`} hint={lng === "uz" ? "Если пусто — показывается русский текст" : undefined}>
            <Comp value={String(c[key] ?? "")} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => set(key, e.target.value as never)} rows={multiline ? 5 : undefined} />
          </Field>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Контент сайта</h1>
      <p className="mb-8 text-sm text-white/45">Изменения появляются на сайте сразу после сохранения — без повторного деплоя.</p>

      <div className="flex flex-col gap-6">
        <Card title="Логотип и главное видео">
          <div className="grid gap-6 md:grid-cols-2">
            <MediaSlot
              label="Логотип"
              hint="Квадратное изображение (PNG/WebP с прозрачностью), отображается в круге"
              accept="image/png,image/webp,image/jpeg"
              preview={media(c.logoAssetId) ?? "/media/logo.webp"}
              isDefault={!c.logoAssetId}
              type="image"
              round
              disabled={!!uploading}
              onFile={(f) => upload(f, "image", (id) => set("logoAssetId", id))}
              onReset={() => set("logoAssetId", null)}
            />
            <MediaSlot
              label="Фоновое видео (десктоп)"
              hint="MP4 (H.264), без звука, 10–20 сек, до 80 МБ. Рекомендуется до 10 МБ."
              accept="video/mp4,video/webm"
              preview={media(c.heroVideoAssetId) ?? "/media/hero.mp4"}
              isDefault={!c.heroVideoAssetId}
              type="video"
              disabled={!!uploading}
              onFile={(f) => upload(f, "video", (id) => set("heroVideoAssetId", id))}
              onReset={() => set("heroVideoAssetId", null)}
            />
            <MediaSlot
              label="Видео для мобильных (необязательно)"
              hint="Облегчённая версия. Если не задано — используется основное видео."
              accept="video/mp4,video/webm"
              preview={media(c.heroVideoMobileAssetId) ?? (c.heroVideoAssetId ? null : "/media/hero-mobile-43.mp4")}
              isDefault={!c.heroVideoMobileAssetId}
              type="video"
              disabled={!!uploading}
              onFile={(f) => upload(f, "video", (id) => set("heroVideoMobileAssetId", id))}
              onReset={() => set("heroVideoMobileAssetId", null)}
            />
            <MediaSlot
              label="Обложка видео (fallback)"
              hint="Показывается до загрузки видео и если видео недоступно"
              accept="image/jpeg,image/png,image/webp"
              preview={media(c.heroPosterAssetId) ?? (c.heroVideoAssetId ? null : "/media/hero-poster.webp")}
              isDefault={!c.heroPosterAssetId}
              type="image"
              disabled={!!uploading}
              onFile={(f) => upload(f, "image", (id) => set("heroPosterAssetId", id))}
              onReset={() => set("heroPosterAssetId", null)}
            />
          </div>
        </Card>

        <Card title="Главный экран">
          <div className="flex flex-col gap-4">
            {pair("Заголовок", "heroTitleRu", "heroTitleUz")}
            {pair("Подзаголовок", "heroSubtitleRu", "heroSubtitleUz", true)}
          </div>
        </Card>

        <Card title="Блок «О магазине»">
          <div className="flex flex-col gap-4">
            {pair("Заголовок", "aboutTitleRu", "aboutTitleUz")}
            {pair("Текст", "aboutTextRu", "aboutTextUz", true)}
          </div>
        </Card>

        <Card
          title="Контакты"
          actions={
            <Button size="sm" onClick={() => set("contacts", [...c.contacts, { labelRu: "", labelUz: "", phone: "+998 " }])} disabled={c.contacts.length >= 10}>
              + Номер
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            {c.contacts.map((ct, i) => {
              const upd = (patch: Partial<ContactItem>) => set("contacts", c.contacts.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <Input placeholder="Назначение (RU)" value={ct.labelRu} onChange={(e) => upd({ labelRu: e.target.value })} />
                  <Input placeholder="Назначение (UZ)" value={ct.labelUz} onChange={(e) => upd({ labelUz: e.target.value })} />
                  <Input placeholder="+998 90 000 0000" type="tel" value={ct.phone} onChange={(e) => upd({ phone: e.target.value })} />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => i > 0 && set("contacts", c.contacts.map((x, j) => (j === i - 1 ? c.contacts[i] : j === i ? c.contacts[i - 1] : x)))} aria-label="Выше">↑</Button>
                    <Button size="sm" variant="danger" onClick={() => set("contacts", c.contacts.filter((_, j) => j !== i))} aria-label="Удалить">×</Button>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-white/35">Первый номер — главный: используется в шапке и кнопке «Уточнить наличие». Номер с назначением «Рассрочка» — для кнопки рассрочки.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Ссылка на местоположение магазина" hint="Telegram, Google Maps, Yandex Maps и т.п.">
              <Input type="url" value={c.locationUrl} onChange={(e) => set("locationUrl", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Telegram (необязательно)">
                <Input type="url" value={c.telegramUrl} onChange={(e) => set("telegramUrl", e.target.value)} placeholder="https://t.me/…" />
              </Field>
              <Field label="Instagram (необязательно)">
                <Input type="url" value={c.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} placeholder="https://instagram.com/…" />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {pair("Адрес", "addressRu", "addressUz")}
            {pair("Режим работы", "workHoursRu", "workHoursUz")}
          </div>
        </Card>

        <Card
          title="Рекламные баннеры"
          actions={
            <Button
              size="sm"
              disabled={c.banners.length >= 10}
              onClick={() => set("banners", [...c.banners, { id: Math.random().toString(36).slice(2, 10), titleRu: "", titleUz: "", textRu: "", textUz: "", link: "", imageAssetId: null, isActive: true }])}
            >
              + Баннер
            </Button>
          }
        >
          {!c.banners.length && <p className="text-sm text-white/35">Баннеров нет. Активные баннеры показываются на главной странице после блока товаров.</p>}
          <div className="flex flex-col gap-5">
            {c.banners.map((b, i) => {
              const upd = (patch: Partial<Banner>) => set("banners", c.banners.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={b.id} className="grid gap-4 rounded-2xl border border-white/[0.08] p-4 md:grid-cols-[220px_1fr]">
                  <MediaSlot
                    label="Изображение"
                    accept="image/jpeg,image/png,image/webp"
                    preview={media(b.imageAssetId)}
                    isDefault={!b.imageAssetId}
                    type="image"
                    disabled={!!uploading}
                    onFile={(f) => upload(f, "image", (id) => upd({ imageAssetId: id }))}
                    onReset={() => upd({ imageAssetId: null })}
                  />
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input placeholder="Заголовок (RU)" value={b.titleRu} onChange={(e) => upd({ titleRu: e.target.value })} />
                      <Input placeholder="Заголовок (UZ)" value={b.titleUz} onChange={(e) => upd({ titleUz: e.target.value })} />
                      <Input placeholder="Текст (RU)" value={b.textRu} onChange={(e) => upd({ textRu: e.target.value })} />
                      <Input placeholder="Текст (UZ)" value={b.textUz} onChange={(e) => upd({ textUz: e.target.value })} />
                    </div>
                    <Input placeholder="Ссылка (необязательно), напр. /ru/catalog?brand=apple" value={b.link} onChange={(e) => upd({ link: e.target.value })} />
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Toggle label="Показывать на сайте" checked={b.isActive} onChange={(x) => upd({ isActive: x })} />
                      </div>
                      <Button variant="danger" size="sm" onClick={() => set("banners", c.banners.filter((_, j) => j !== i))}>Удалить</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="sticky bottom-4 z-30 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-graphite-850/95 p-3 pl-5 ring-1 ring-white/10 backdrop-blur-xl">
        <div className="min-w-0 flex-1 text-sm">
          {uploading ? <span className="text-white/60">Загрузка файла: {uploading}</span> : msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : <span className="text-white/40">Не забудьте сохранить изменения.</span>}
        </div>
        <Button variant="light" className="h-11 px-6" onClick={save} loading={saving} disabled={!!uploading}>
          Сохранить и опубликовать
        </Button>
      </div>
    </div>
  );
}

function MediaSlot({
  label,
  hint,
  accept,
  preview,
  isDefault,
  type,
  round,
  disabled,
  onFile,
  onReset,
}: {
  label: string;
  hint?: string;
  accept: string;
  preview: string | null;
  isDefault: boolean;
  type: "image" | "video";
  round?: boolean;
  disabled?: boolean;
  onFile: (f: File | undefined) => void;
  onReset: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.8rem] font-medium text-white/60">{label}</p>
      <div className={`relative grid place-items-center overflow-hidden bg-black/50 ring-1 ring-white/[0.08] ${round ? "aspect-square w-32 rounded-full" : "aspect-video w-full rounded-2xl"}`}>
        {preview ? (
          type === "video" ? (
            <video src={preview} muted loop autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className={`h-full w-full ${round ? "object-cover" : "object-contain"}`} />
          )
        ) : (
          <span className="text-xs text-white/30">Нет файла</span>
        )}
      </div>
      {hint && <p className="text-xs text-white/35">{hint}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="light" disabled={disabled} onClick={() => input.current?.click()}>
          {isDefault ? "Загрузить" : "Заменить"}
        </Button>
        {!isDefault && (
          <Button size="sm" onClick={onReset}>
            Сбросить
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
