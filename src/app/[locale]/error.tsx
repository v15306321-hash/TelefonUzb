"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import ru from "@/i18n/dictionaries/ru";
import uz from "@/i18n/dictionaries/uz";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ locale: string }>();
  const dict = params?.locale === "uz" ? uz : ru;
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container-x grid min-h-[80svh] place-items-center py-32 text-center">
      <div>
        <h1 className="headline text-3xl sm:text-5xl">{dict.errors.genericTitle}</h1>
        <p className="mt-4 text-white/50">{dict.errors.genericText}</p>
        <button type="button" onClick={reset} className="btn btn-light mt-8">{dict.errors.retry}</button>
      </div>
    </div>
  );
}
