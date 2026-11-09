"use client";

import { useEffect } from "react";
import { SlantButton } from "@/components/site/slant";
import { ErrorPage } from "@/components/site/error-page";
import { useDict } from "@/components/site/lang";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useDict();
  useEffect(() => console.error(error), [error]);
  return (
    <ErrorPage code={500} title={t.error.title} text={t.error.text}>
      <SlantButton tone="paper" onClick={reset} className="px-5 py-2.5 text-base">
        {t.error.retry}
      </SlantButton>
      <SlantButton href="/" tone="outline" className="px-5 py-2.5 text-base">
        {t.notFound.home}
      </SlantButton>
    </ErrorPage>
  );
}
