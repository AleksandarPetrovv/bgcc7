"use client";

import { createContext, useContext, useTransition } from "react";
import { dicts, LANGS, type Lang } from "@/lib/i18n/dict";
import { setLang } from "@/lib/i18n/actions";
import { cn } from "@/lib/utils";

const LangContext = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useDict = () => dicts[useContext(LangContext)];

export function LangSwitch() {
  const lang = useLang();
  const t = useDict();
  const [pending, start] = useTransition();
  return (
    <div className={cn("flex overflow-hidden border border-ink/40", pending && "opacity-60")} role="group" aria-label={t.footer.language}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === lang}
          disabled={pending}
          onClick={() => l !== lang && start(() => setLang(l))}
          className={cn("min-h-8 px-2.5 uppercase transition-colors", l === lang ? "bg-ink text-paper" : "hover:bg-ink/10")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
