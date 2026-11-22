"use client";

import { useSyncExternalStore } from "react";
import { telegramLink, telegramTopic } from "@/lib/telegram";

type Labels = { button: string; general: string; product: string };

/**
 * "Write in Telegram": opens the store's chat with a ready message — the product, storage and colour
 * the visitor has selected, plus the page link.
 */
export default function TelegramButton({ url, labels, variant = "floating" }: { url: string; labels: Labels; variant?: "floating" | "inline" }) {
  const topic = useSyncExternalStore(telegramTopic.subscribe, telegramTopic.get, () => null);
  if (!url) return null;
  const text = topic ? labels.product.replace("{product}", topic) : labels.general;
  const href = telegramLink(url, text);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // add the page address at click time so the seller sees exactly what was opened
    e.currentTarget.href = telegramLink(url, topic ? `${text}\n${window.location.href}` : text);
  };

  if (variant === "inline") {
    return (
      <a href={href} onClick={onClick} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !px-3 text-sm">
        <TelegramIcon className="h-4 w-4 text-[#2AABEE]" />
        Telegram
      </a>
    );
  }

  return (
    <a
      href={href}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={labels.button}
      title={labels.button}
      className="group fixed right-4 z-40 flex h-14 items-center gap-2.5 rounded-full bg-[#2AABEE] pl-4 pr-4 text-white shadow-[0_10px_30px_-8px_rgba(42,171,238,0.65)] ring-1 ring-white/20 transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-[#229ED9] sm:right-6 lg:pr-5"
      style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
    >
      <TelegramIcon className="h-6 w-6" />
      <span className="hidden text-sm font-semibold lg:inline">{labels.button}</span>
    </a>
  );
}

export function TelegramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.94 4.3 18.7 19.6c-.24 1.08-.88 1.35-1.78.84l-4.93-3.63-2.38 2.29c-.26.26-.48.48-.99.48l.35-5.02 9.14-8.26c.4-.35-.09-.55-.62-.2L6.2 13.2 1.33 11.7c-1.06-.33-1.08-1.06.22-1.57L20.6 2.8c.88-.32 1.65.2 1.34 1.5Z" />
    </svg>
  );
}
