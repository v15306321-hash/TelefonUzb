import Link from "next/link";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";

export default async function NotFound() {
  const h = await headers();
  const path = h.get("x-pathname") ?? "";
  const seg = path.split("/")[1];
  const locale = isLocale(seg) ? seg : defaultLocale;
  const dict = getDictionary(locale);
  return (
    <div className="container-x grid min-h-[80svh] place-items-center py-32 text-center">
      <div>
        <p className="text-[7rem] font-bold leading-none tracking-tighter text-white/10 sm:text-[10rem]">404</p>
        <h1 className="headline mt-2 text-3xl sm:text-5xl">{dict.errors.notFoundTitle}</h1>
        <p className="mx-auto mt-4 max-w-md text-white/50">{dict.errors.notFoundText}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href={`/${locale}`} className="btn btn-light">{dict.errors.backHome}</Link>
          <Link href={`/${locale}/catalog`} className="btn btn-ghost">{dict.errors.toCatalog}</Link>
        </div>
      </div>
    </div>
  );
}
