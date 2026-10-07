"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { dicts } from "@/lib/i18n/dict";

const noop = () => () => {};

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const lang = useSyncExternalStore(
    noop,
    () => (/(?:^|;\s*)lang=bg/.test(document.cookie) ? "bg" : "en"),
    () => "en" as const,
  );
  useEffect(() => console.error(error), [error]);
  const t = dicts[lang];
  return (
    <html lang={lang}>
      <body className="flex min-h-screen items-center bg-ink text-paper">
        <main className="mx-auto w-full max-w-page px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="num text-[clamp(5rem,16vw,10rem)] font-black leading-[0.85] text-rose">500</div>
          <h1 className="mt-4 text-[clamp(2rem,6vw,3.5rem)] font-black uppercase leading-none">{t.error.title}</h1>
          <p className="mt-3 max-w-[46ch] text-pretty text-lg text-paper/70">{t.error.text}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={reset} className="-skew-x-12 bg-paper px-5 py-2.5 font-black uppercase text-ink">
              <span className="inline-block skew-x-12">{t.error.retry}</span>
            </button>
            <Link href="/" className="-skew-x-12 border border-paper/40 px-5 py-2.5 font-black uppercase">
              <span className="inline-block skew-x-12">{t.notFound.home}</span>
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
