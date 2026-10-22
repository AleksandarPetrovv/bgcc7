"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { EDITIONS, type Edition } from "@/lib/format";
import { viewEdition } from "@/lib/edition-action-bgcc6";
import { cn } from "@/lib/utils";
import { useDict, useEdition } from "./lang";

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
