"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { EDITIONS, type Edition } from "@/lib/format";
import { viewEdition } from "@/lib/edition-action-bgcc6";
import { cn } from "@/lib/utils";
import { useDict, useEdition } from "./lang";
import { SlantBg } from "./slant";

export function EditionView({ className }: { className?: string }) {
  const edition = useEdition();
  const t = useDict();
  const path = usePathname();
  const [pending, start] = useTransition();
  const pick = (e: Edition) =>
    start(async () => {
      await viewEdition(e);
      // full reload on purpose: the edition cookie changes the whole layout
      window.location.assign(new URL(`/${path.split("/")[1] ?? ""}`, window.location.origin));
    });
  return (
    <div className={cn("relative isolate flex h-8 shrink-0 border border-transparent text-[0.75rem] font-display font-black lg:h-9 lg:text-[0.8rem]", pending && "opacity-60", className)} role="group" aria-label={t.nav.edition}>
      <SlantBg className="-inset-px border border-line" />
      {EDITIONS.map((e) => (
        <button
          key={e}
          type="button"
          aria-pressed={e === edition}
          disabled={pending}
          onClick={() => e !== edition && pick(e)}
          title={e.toUpperCase()}
          className={cn("relative isolate px-2.5 uppercase transition-colors sm:px-3", e === edition ? "text-ink" : "text-ash hover:text-paper")}
        >
          <SlantBg className={cn("transition-colors", e === edition && "bg-paper")} />
          {e.slice(4)}
        </button>
      ))}
    </div>
  );
}
