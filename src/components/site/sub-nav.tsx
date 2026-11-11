"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";
import { activeItem } from "@/lib/sections";
import { TabMark } from "./tabs";

export function SubNav({ items }: { items: { href: string; label: string; hidden?: boolean }[] }) {
  const path = usePathname();
  const t = useDict();
  const current = activeItem(items, path);
  return (
    <div className="sub-nav sticky top-16 z-30 border-b border-line bg-ink/95 backdrop-blur lg:top-20">
      <nav className="mx-auto flex max-w-page items-stretch gap-1 overflow-x-auto px-2 sm:gap-6 sm:px-4 lg:px-8 2xl:px-12" aria-label={t.nav.section}>
        {items.map((i) => {
          const active = i === current;
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 shrink-0 items-center px-2 text-[0.8rem] font-display font-bold transition-colors",
                active ? "text-paper" : "text-ash hover:text-paper",
                i.hidden && "opacity-40",
              )}
            >
              {i.label}
              <TabMark id="subnav" active={active} className="inset-x-2 h-0.5 skew-x-0" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
