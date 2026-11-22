"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/admin/actions";

const items = [
  { href: "/admin", label: "Обзор", icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" },
  { href: "/admin/products", label: "Товары", icon: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h2" },
  { href: "/admin/taxonomy", label: "Категории и бренды", icon: "M4 6h16M4 12h10M4 18h6" },
  { href: "/admin/content", label: "Контент сайта", icon: "M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4" },
  { href: "/admin/account", label: "Аккаунт и данные", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0" },
];

export default function AdminNav({ username }: { username: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <aside className="sticky top-0 z-40 border-b border-white/[0.07] bg-black/85 backdrop-blur-xl lg:h-dvh lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center justify-between px-4 lg:h-auto lg:flex-col lg:items-stretch lg:px-5 lg:py-7">
        <Link href="/admin" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/logo.webp" alt="" width={36} height={36} className="h-9 w-9 rounded-full" />
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight">TELEFON.UZB</span>
            <span className="block text-[0.7rem] text-white/40">Админ-панель</span>
          </span>
        </Link>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-white/12 px-3 py-1.5 text-sm lg:hidden" aria-expanded={open}>
          Меню
        </button>
      </div>
      <nav className={`${open ? "block" : "hidden"} px-3 pb-4 lg:block lg:pb-0`}>
        <ul className="flex flex-col gap-0.5">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(it.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive(it.href) ? "bg-white/[0.09] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={it.icon} />
                </svg>
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-white/[0.07] px-3 pt-5 text-xs text-white/40 lg:mt-10">
          <p>
            Вы вошли как <span className="text-white/75">{username}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/ru" target="_blank" rel="noopener" className="rounded-full border border-white/12 px-3 py-1.5 text-white/70 hover:text-white">
              Открыть сайт ↗
            </a>
            <form action={logoutAction}>
              <button type="submit" className="rounded-full border border-white/12 px-3 py-1.5 text-white/70 hover:border-signal hover:text-signal-bright">
                Выйти
              </button>
            </form>
          </div>
        </div>
      </nav>
    </aside>
  );
}
