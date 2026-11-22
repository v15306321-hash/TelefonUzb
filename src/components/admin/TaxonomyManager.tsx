"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteBrandAction, deleteCategoryAction, saveBrandAction, saveCategoryAction } from "@/app/admin/actions";
import { slugify } from "./ProductForm";
import { Badge, Button, Card, ConfirmDialog, Input, Notice } from "./ui";

type Cat = { id?: string; slug: string; nameRu: string; nameUz: string; sortOrder: number; isVisible: boolean; count?: number };
type Br = { id?: string; slug: string; name: string; sortOrder: number; isVisible: boolean; count?: number };

export default function TaxonomyManager({ categories, brands }: { categories: Cat[]; brands: Br[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <CategoryList items={categories} />
      <BrandList items={brands} />
    </div>
  );
}

function useMutation() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setMsg({ tone: "error", text: r.error ?? "Ошибка" });
      else {
        setMsg({ tone: "ok", text: okText });
        after?.();
        router.refresh();
      }
    });
  return { pending, msg, run };
}

function CategoryList({ items }: { items: Cat[] }) {
  const { pending, msg, run } = useMutation();
  const [editing, setEditing] = useState<Cat | null>(null);
  const [del, setDel] = useState<Cat | null>(null);
  const blank: Cat = { slug: "", nameRu: "", nameUz: "", sortOrder: (items.at(-1)?.sortOrder ?? 0) + 10, isVisible: true };

  return (
    <Card title="Категории" actions={<Button size="sm" variant="light" onClick={() => setEditing(blank)}>+ Категория</Button>}>
      {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      {editing && (
        <form
          className="mb-5 grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveCategoryAction(editing), "Категория сохранена", () => setEditing(null));
          }}
        >
          <Input placeholder="Название (RU)" value={editing.nameRu} required onChange={(e) => setEditing({ ...editing, nameRu: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} />
          <Input placeholder="Название (UZ)" value={editing.nameUz} onChange={(e) => setEditing({ ...editing, nameUz: e.target.value })} />
          <Input placeholder="slug" value={editing.slug} required onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase() })} />
          <Input placeholder="Порядок" inputMode="numeric" value={String(editing.sortOrder)} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value.replace(/[^\d-]/g, "")) || 0 })} />
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={editing.isVisible} onChange={(e) => setEditing({ ...editing, isVisible: e.target.checked })} className="h-4 w-4 accent-white" />
            Показывать в каталоге
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" onClick={() => setEditing(null)}>Отмена</Button>
            <Button type="submit" size="sm" variant="light" loading={pending}>Сохранить</Button>
          </div>
        </form>
      )}
      <ul className="divide-y divide-white/[0.06]">
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                {c.nameRu} <span className="text-white/40">/ {c.nameUz || <span className="text-amber-300/80">нет UZ</span>}</span>
              </p>
              <p className="text-xs text-white/40">
                /{c.slug} · товаров: {c.count} · порядок {c.sortOrder}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => saveCategoryAction({ ...c, isVisible: !c.isVisible }), c.isVisible ? "Категория скрыта" : "Категория показана")}
              >
                {c.isVisible ? <Badge tone="ok">видима</Badge> : <Badge tone="muted">скрыта</Badge>}
              </button>
              <Button size="sm" onClick={() => setEditing(c)}>Изменить</Button>
              <Button size="sm" variant="danger" onClick={() => setDel(c)}>×</Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!del}
        title={`Удалить категорию «${del?.nameRu}»?`}
        confirmLabel="Удалить"
        loading={pending}
        onClose={() => setDel(null)}
        onConfirm={() => del?.id && run(() => deleteCategoryAction(del.id!), "Категория удалена", () => setDel(null))}
      >
        {del?.count ? `В категории ${del.count} товар(ов) — удаление будет отклонено. Скройте категорию или перенесите товары.` : "Действие нельзя отменить."}
      </ConfirmDialog>
    </Card>
  );
}

function BrandList({ items }: { items: Br[] }) {
  const { pending, msg, run } = useMutation();
  const [editing, setEditing] = useState<Br | null>(null);
  const [del, setDel] = useState<Br | null>(null);
  const blank: Br = { slug: "", name: "", sortOrder: (items.at(-1)?.sortOrder ?? 0) + 10, isVisible: true };

  return (
    <Card title="Бренды" actions={<Button size="sm" variant="light" onClick={() => setEditing(blank)}>+ Бренд</Button>}>
      {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      {editing && (
        <form
          className="mb-5 grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveBrandAction(editing), "Бренд сохранён", () => setEditing(null));
          }}
        >
          <Input placeholder="Название" value={editing.name} required onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} />
          <Input placeholder="slug" value={editing.slug} required onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase() })} />
          <Input placeholder="Порядок" inputMode="numeric" value={String(editing.sortOrder)} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value.replace(/[^\d-]/g, "")) || 0 })} />
          <label className="flex items-center gap-2 text-sm text-white/70 sm:col-span-2">
            <input type="checkbox" checked={editing.isVisible} onChange={(e) => setEditing({ ...editing, isVisible: e.target.checked })} className="h-4 w-4 accent-white" />
            Показывать в фильтрах и на главной
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" onClick={() => setEditing(null)}>Отмена</Button>
            <Button type="submit" size="sm" variant="light" loading={pending}>Сохранить</Button>
          </div>
        </form>
      )}
      <ul className="divide-y divide-white/[0.06]">
        {items.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">{b.name}</p>
              <p className="text-xs text-white/40">
                /{b.slug} · товаров: {b.count}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={pending} onClick={() => run(() => saveBrandAction({ ...b, isVisible: !b.isVisible }), b.isVisible ? "Бренд скрыт" : "Бренд показан")}>
                {b.isVisible ? <Badge tone="ok">виден</Badge> : <Badge tone="muted">скрыт</Badge>}
              </button>
              <Button size="sm" onClick={() => setEditing(b)}>Изменить</Button>
              <Button size="sm" variant="danger" onClick={() => setDel(b)}>×</Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!del}
        title={`Удалить бренд «${del?.name}»?`}
        confirmLabel="Удалить"
        loading={pending}
        onClose={() => setDel(null)}
        onConfirm={() => del?.id && run(() => deleteBrandAction(del.id!), "Бренд удалён", () => setDel(null))}
      >
        {del?.count ? `У бренда ${del.count} товар(ов) — удаление будет отклонено.` : "Действие нельзя отменить."}
      </ConfirmDialog>
    </Card>
  );
}
