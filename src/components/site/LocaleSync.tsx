"use client";

import { useEffect } from "react";
import { LOCALE_COOKIE, LOCALE_STORAGE_KEY, type Locale } from "@/i18n/config";

/**
 * Keeps the language preference persistent: the cookie is used by the server to
 * pick the language for "/", localStorage is a backup if cookies were cleared.
 * Only an explicit choice (switcher or visiting a localized URL) is remembered.
 */
export default function LocaleSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    const hasCookie = document.cookie.split("; ").some((c) => c.startsWith(`${LOCALE_COOKIE}=`));
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {}
    if (!hasCookie && stored) {
      document.cookie = `${LOCALE_COOKIE}=${stored}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
