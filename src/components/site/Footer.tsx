import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { pick, telHref } from "@/lib/localize";
import type { SiteContent } from "@/lib/types";
import Logo from "./Logo";

export default function Footer({ locale, dict, content, logo }: { locale: Locale; dict: Dictionary; content: SiteContent; logo: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/[0.07] bg-black">
      <div className="container-x grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <Logo src={logo} size={44} />
            <span className="text-lg font-extrabold tracking-tight">
              TELEFON.UZB <span className="text-xs font-semibold text-signal-bright">premium</span>
            </span>
          </Link>
          <p className="max-w-xs text-sm text-white/45">{dict.footer.tagline}</p>
        </div>
        <nav aria-label={dict.footer.navTitle}>
          <h2 className="eyebrow mb-4">{dict.footer.navTitle}</h2>
          <ul className="grid gap-2.5 text-sm">
            <li><Link className="text-white/70 hover:text-white" href={`/${locale}`}>{dict.nav.home}</Link></li>
            <li><Link className="text-white/70 hover:text-white" href={`/${locale}/catalog`}>{dict.nav.catalog}</Link></li>
            <li><Link className="text-white/70 hover:text-white" href={`/${locale}/contacts`}>{dict.nav.contacts}</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="eyebrow mb-4">{dict.footer.contactsTitle}</h2>
          <ul className="grid gap-3 text-sm">
            {content.contacts.map((c) => (
              <li key={c.phone} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="text-white/45">{pick(locale, c.labelRu, c.labelUz)}</span>
                <a className="font-medium text-white/85 hover:text-white" href={telHref(c.phone)}>{c.phone}</a>
              </li>
            ))}
            <li className="pt-1">
              <a className="text-signal-bright hover:underline" href={content.locationUrl} target="_blank" rel="noopener noreferrer">
                {dict.contacts.showLocation} ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container-x border-t border-white/[0.06] py-6 text-xs text-white/35">
        © {year} TELEFON.UZB premium. {dict.footer.rights}
      </div>
    </footer>
  );
}
