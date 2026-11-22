"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProductAction, toggleProductFlagAction } from "@/app/admin/actions";
import { Button, ConfirmDialog, Input } from "./ui";

export default function ProductRowActions({ id, slug, name, inStock, isHidden }: { id: string; slug: string; name: string; inStock: boolean; isHidden: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");

  const toggle = (flag: "inStock" | "isHidden", value: boolean) =>
    start(async () => {
      const r = await toggleProductFlagAction(id, flag, value);
      if (!r.ok) alert(r.error);
      router.refresh();
    });

  return (
    <>
      <td className="px-3 py-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => toggle("inStock", !inStock)}
          title="Нажмите, чтобы изменить"
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${inStock ? "bg-ok/12 text-ok hover:bg-ok/20" : "bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"}`}
        >
          {inStock ? "В наличии" : "Нет в наличии"}
        </button>
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => toggle("isHidden", !isHidden)}
          title={isHidden ? "Опубликовать" : "Скрыть с сайта"}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${isHidden ? "bg-white/5 text-white/45 hover:bg-white/10" : "bg-white/10 text-white/85 hover:bg-white/15"}`}
        >
          {isHidden ? "Скрыт" : "Опубликован"}
        </button>
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          {!isHidden && (
            <a href={`/ru/product/${slug}`} target="_blank" rel="noopener" className="grid h-8 place-items-center rounded-full border border-white/12 px-3 text-xs text-white/70 hover:text-white">
              ↗
            </a>
          )}
          <Link href={`/admin/products/${id}`} className="grid h-8 place-items-center rounded-full border border-white/12 px-3 text-xs text-white/85 hover:border-white/30">
            Изменить
          </Link>
          <Button size="sm" variant="danger" onClick={() => setConfirmOpen(true)}>
            Удалить
          </Button>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title={`Удалить «${name}»?`}
          confirmLabel="Удалить навсегда"
          loading={pending}
          confirmDisabled={typed.trim() !== slug}
          onClose={() => {
            setConfirmOpen(false);
            setTyped("");
            setError("");
          }}
          onConfirm={() =>
            start(async () => {
              const r = await deleteProductAction(id, typed.trim());
              if (!r.ok) setError(r.error);
              else {
                setConfirmOpen(false);
                router.refresh();
              }
            })
          }
        >
          <p>Товар, его фотографии и 3D-модель будут удалены без возможности восстановления. Если нужно временно убрать товар с сайта — используйте «Скрыть».</p>
          <p className="mt-4">
            Для подтверждения введите адрес товара: <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">{slug}</code>
          </p>
          <Input className="mt-2" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus aria-label="Подтверждение" />
          {error && <p className="mt-2 text-signal-bright">{error}</p>}
        </ConfirmDialog>
      </td>
    </>
  );
}
