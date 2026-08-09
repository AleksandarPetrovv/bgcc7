"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EyeOff } from "lucide-react";
import { useDict } from "./lang";
import { sectionOf } from "@/lib/sections";

export function HiddenBar({ hidden }: { hidden: string[] }) {
  const t = useDict();
  const s = sectionOf(usePathname());
  if (!s || !hidden.includes(s)) return null;
  return (
    <div className="flex items-center gap-3 border-b border-line bg-slate px-4 py-2 text-xs font-bold text-paper/80 sm:px-6">
      <EyeOff className="size-4 shrink-0 text-rose-hi" />
      <span>
        <span className="font-black uppercase text-paper">{t.admin.hidden}.</span> {t.admin.hiddenText}
      </span>
      <Link href="/admin/phase" className="ml-auto shrink-0 font-black uppercase text-rose-hi hover:text-paper">
        {t.admin.change}
      </Link>
    </div>
  );
}
