"use client";

import { createContext, useContext, useTransition } from "react";
import { LANGS, type Lang } from "@/lib/i18n/dict";
import { dictFor } from "@/lib/i18n/dict7";
import type { Edition } from "@/lib/format";
import { setLang } from "@/lib/i18n/actions";
import { cn } from "@/lib/utils";

const LangContext = createContext<{ lang: Lang; edition: Edition }>({ lang: "en", edition: "bgcc6" });

export function LangProvider({ lang, edition, children }: { lang: Lang; edition: Edition; children: React.ReactNode }) {
  return <LangContext.Provider value={{ lang, edition }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext).lang;
export const useDict = () => {
  const { lang, edition } = useContext(LangContext);
  return dictFor(lang, edition);
};

export function LangSwitch() {
  const lang = useLang();
  const t = useDict();
  const [pending, start] = useTransition();
  return (
    <div className={cn("flex h-9 -skew-x-12 border border-line text-[0.8rem] font-black", pending && "opacity-60")} role="group" aria-label={t.footer.language}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === lang}
          disabled={pending}
          onClick={() => l !== lang && start(() => setLang(l))}
          className={cn("px-3.5 uppercase tracking-wide transition-colors", l === lang ? "bg-paper text-ink" : "text-ash hover:text-paper")}
        >
          <span className="inline-block skew-x-12">{l}</span>
        </button>
      ))}
    </div>
  );
}
