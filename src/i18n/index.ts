import "server-only";
import type { Locale } from "./config";
import ru, { type Dictionary } from "./dictionaries/ru";
import uz from "./dictionaries/uz";

const dictionaries: Record<Locale, Dictionary> = { ru, uz };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? ru;
}
export type { Dictionary };
