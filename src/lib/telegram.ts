/** Telegram deep links with a prefilled message + a tiny store for "what the visitor is looking at". */

const USERNAME_LINK = /^https?:\/\/(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{4,32})\/?$/i;

/** `https://t.me/<user>?text=…` opens the chat with the message typed in; other links are returned as is. */
export function telegramLink(base: string, text?: string): string {
  const m = base.trim().match(USERNAME_LINK);
  if (m && text) return `https://t.me/${m[1]}?text=${encodeURIComponent(text)}`;
  return base.trim();
}

let topic: string | null = null;
const listeners = new Set<() => void>();

export const telegramTopic = {
  get: () => topic,
  set(next: string | null) {
    if (next === topic) return;
    topic = next;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
