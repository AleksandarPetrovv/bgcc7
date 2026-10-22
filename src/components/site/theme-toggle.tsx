"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "./lang";

const html = () => document.documentElement;
const subscribe = (cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(html(), { attributes: true, attributeFilter: ["class"] });
  return () => o.disconnect();
};

const set = (on: boolean) => {
  html().classList.toggle("dark", on);
  document.cookie = `theme=${on ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
};

export function ThemeToggle({ className }: { className?: string }) {
  const t = useDict();
  const dark = useSyncExternalStore(subscribe, () => html().classList.contains("dark"), () => null);
  return (
    <div className={cn("flex h-8 shrink-0 -skew-x-12 border border-line lg:h-9", className)} role="group" aria-label={t.nav.theme}>
      {[false, true].map((on) => (
        <button
          key={String(on)}
          type="button"
          aria-pressed={dark === null ? undefined : dark === on}
          aria-label={on ? t.nav.dark : t.nav.light}
          title={on ? t.nav.dark : t.nav.light}
          onClick={() => set(on)}
          className={cn(
            "grid w-8 place-items-center transition-colors lg:w-9",
            on ? "text-ash hover:text-paper dark:bg-paper dark:text-ink dark:hover:text-ink" : "bg-paper text-ink dark:bg-transparent dark:text-ash dark:hover:text-paper",
          )}
        >
          {on ? <Moon className="size-4 skew-x-12" strokeWidth={2.4} /> : <Sun className="size-4 skew-x-12" strokeWidth={2.4} />}
        </button>
      ))}
    </div>
  );
}
