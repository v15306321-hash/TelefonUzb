import type { Locale } from "./config";

/** Simple "{key}" template interpolation. */
export function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function plural(locale: Locale, n: number, forms: { one: string; few: string; many: string }): string {
  const rule = new Intl.PluralRules(locale === "uz" ? "uz" : "ru").select(n);
  const tpl = rule === "one" ? forms.one : rule === "few" ? forms.few : forms.many;
  return t(tpl, { n });
}
