import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { pick, telHref } from "@/lib/localize";
import type { SiteContent } from "@/lib/types";
import { PhoneIcon } from "./Header";

export default function ContactsSection({
  locale,
  dict,
  content,
  as: Heading = "h2",
}: {
  locale: Locale;
  dict: Dictionary;
  content: SiteContent;
  as?: "h1" | "h2";
}) {
  const address = pick(locale, content.addressRu, content.addressUz);
  const hours = pick(locale, content.workHoursRu, content.workHoursUz);
  return (
    <section id="contacts" className="container-x scroll-mt-24 py-20 sm:py-28" aria-labelledby="contacts-title">
      <div className="mb-10 max-w-2xl sm:mb-14" data-reveal>
        <p className="eyebrow mb-4">TELEFON.UZB</p>
        <Heading id="contacts-title" className="headline text-4xl sm:text-6xl">
          {dict.contacts.title}
        </Heading>
        <p className="mt-4 text-lg text-white/55">{dict.contacts.subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {content.contacts.map((c, i) => (
            <li key={c.phone} data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
              <a
                href={telHref(c.phone)}
                className="group flex h-full flex-col justify-between gap-8 rounded-[28px] bg-graphite-900 p-6 ring-1 ring-white/[0.06] transition-colors duration-300 hover:bg-graphite-850 hover:ring-white/15"
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/50">{pick(locale, c.labelRu, c.labelUz)}</span>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-white transition-colors duration-300 group-hover:bg-signal">
                    <PhoneIcon />
                  </span>
                </span>
                <span className="whitespace-nowrap text-xl font-semibold tracking-tight text-white sm:text-lg 2xl:text-xl">{c.phone}</span>
              </a>
            </li>
          ))}
        </ul>

        <div data-reveal className="relative flex flex-col justify-between gap-8 overflow-hidden rounded-[28px] bg-graphite-900 p-6 ring-1 ring-white/[0.06] sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-signal/25 blur-3xl" />
          <div className="relative">
            <h3 className="text-2xl font-semibold tracking-tight">{dict.contacts.findUs}</h3>
            <p className="mt-2 text-white/55">{dict.contacts.findUsText}</p>
            <dl className="mt-6 grid gap-4 text-sm">
              {address && (
                <div>
                  <dt className="text-white/40">{dict.contacts.address}</dt>
                  <dd className="mt-1 text-white/90">{address}</dd>
                </div>
              )}
              {hours && (
                <div>
                  <dt className="text-white/40">{dict.contacts.hours}</dt>
                  <dd className="mt-1 text-white/90">{hours}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <a href={content.locationUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <PinIcon />
              {dict.contacts.showLocation}
            </a>
            {content.telegramUrl && (
              <a href={content.telegramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                {dict.contacts.telegram}
              </a>
            )}
            {content.instagramUrl && (
              <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                {dict.contacts.instagram}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
