"use client";

import { useEffect } from "react";
import { SlantButton } from "@/components/site/page";
import { useDict } from "@/components/site/lang";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useDict();
  useEffect(() => console.error(error), [error]);
  return (
    <section className="grain relative flex min-h-[70vh] items-center overflow-hidden">
      <div
        className="pointer-events-none absolute right-[4%] top-1/2 -translate-y-1/2 select-none font-display text-[clamp(14rem,34vw,30rem)] font-black italic leading-[0.8] text-white/[0.03]"
        aria-hidden
      >
        500
      </div>
      <div className="relative mx-auto w-full max-w-page px-4 sm:px-6 lg:px-10 2xl:px-14">
        <div className="num text-[clamp(5rem,16vw,10rem)] leading-[0.85] text-rose">500</div>
        <h1 className="heading-slam mt-4 text-[clamp(2rem,6vw,3.5rem)]">{t.error.title}</h1>
        <p className="mt-3 max-w-[46ch] text-pretty text-lg text-paper/70">{t.error.text}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <SlantButton tone="paper" onClick={reset} className="px-5 py-2.5 text-base">
            {t.error.retry}
          </SlantButton>
          <SlantButton href="/" tone="outline" className="px-5 py-2.5 text-base">
            {t.notFound.home}
          </SlantButton>
        </div>
      </div>
    </section>
  );
}
