"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button, Input } from "./ui";

type Item = { id: string; url: string; model: string; color: string | null };

/** Pick white-background photos that are already in the database (no re-upload). */
export default function PhotoLibrary({ open, onClose, onPick, initialQuery, taken }: { open: boolean; onClose: () => void; onPick: (items: Item[]) => void; initialQuery: string; taken: Set<string> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState(initialQuery);
  const [items, setItems] = useState<Item[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setQ(initialQuery);
      setPicked([]);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/admin/library?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d) => setItems(d.items ?? []))
        .catch(() => undefined);
    }, 200);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, open]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(56rem,calc(100vw-2rem))] max-w-none rounded-3xl bg-graphite-900 p-0 text-white ring-1 ring-white/10 backdrop:bg-black/70"
      aria-label="Библиотека фото"
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Библиотека фото</h2>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white" aria-label="Закрыть">✕</button>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Модель или цвет, например «15 pro синий»" autoFocus />
        <p className="text-xs text-white/40">Фото на белом фоне, которые уже есть на сайте. Выберите нужные — они добавятся после ваших фото.</p>
        <div className="grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
          {items === null && <p className="col-span-full text-sm text-white/40">Загрузка…</p>}
          {items?.length === 0 && <p className="col-span-full text-sm text-white/40">Ничего не найдено</p>}
          {items?.map((it) => {
            const on = picked.includes(it.id);
            const used = taken.has(it.id);
            return (
              <button
                key={it.id}
                type="button"
                disabled={used}
                onClick={() => toggle(it.id)}
                className={`relative overflow-hidden rounded-2xl bg-white text-left ring-2 transition disabled:opacity-35 ${on ? "ring-signal-bright" : "ring-transparent hover:ring-white/40"}`}
                aria-pressed={on}
                title={`${it.model}${it.color ? `, ${it.color}` : ""}`}
              >
                <span className="relative block aspect-square">
                  <Image src={it.url} alt="" fill sizes="160px" className="object-contain p-1" />
                </span>
                <span className="block truncate bg-black/80 px-2 py-1 text-[0.68rem] text-white/80">
                  {it.model.replace(/^Apple\s+/, "")}
                  {it.color ? ` · ${it.color}` : ""}
                </span>
                {on && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-signal text-xs font-bold">{picked.indexOf(it.id) + 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>Отмена</Button>
          <Button
            type="button"
            variant="light"
            disabled={!picked.length}
            onClick={() => {
              const byId = new Map((items ?? []).map((i) => [i.id, i]));
              onPick(picked.map((id) => byId.get(id)!).filter(Boolean));
              onClose();
            }}
          >
            Добавить {picked.length ? `(${picked.length})` : ""}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
