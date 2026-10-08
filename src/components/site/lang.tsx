"use client";

import { createContext, useContext, useTransition } from "react";
import { LANGS, type Lang } from "@/lib/i18n/dict";
import { dictFor } from "@/lib/i18n/dict7";
import { usePathname } from "next/navigation";
import { EDITIONS, type Edition } from "@/lib/format";
import { setLang } from "@/lib/i18n/actions";
import { viewEdition } from "@/lib/edition-action";
import { cn } from "@/lib/utils";

const LangContext = createContext<{ lang: Lang; edition: Edition }>({ lang: "en", edition: "bgcc6" });

export function LangProvider({ lang, edition, children }: { lang: Lang; edition: Edition; children: React.ReactNode }) {
  return <LangContext.Provider value={{ lang, edition }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext).lang;
export const useEdition = () => useContext(LangContext).edition;
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

export function EditionView({ className }: { className?: string }) {
  const edition = useEdition();
  const t = useDict();
  const path = usePathname();
  const [pending, start] = useTransition();
  const pick = (e: Edition) =>
    start(async () => {
      await viewEdition(e);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/${path.split("/")[1] ?? ""}`);
    });
  return (
    <div className={cn("flex h-8 shrink-0 -skew-x-12 border border-line text-[0.75rem] font-black lg:h-9 lg:text-[0.8rem]", pending && "opacity-60", className)} role="group" aria-label={t.nav.edition}>
      {EDITIONS.map((e) => (
        <button
          key={e}
          type="button"
          aria-pressed={e === edition}
          disabled={pending}
          onClick={() => e !== edition && pick(e)}
          className={cn("px-2.5 uppercase tracking-wide transition-colors sm:px-3", e === edition ? "bg-paper text-ink" : "text-ash hover:text-paper")}
        >
          <span className="inline-block skew-x-12">
            <span className="hidden sm:inline">bgcc</span>
            {e.slice(4)}
          </span>
        </button>
      ))}
    </div>
  );
}
