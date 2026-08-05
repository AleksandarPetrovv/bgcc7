"use client";

import { useState } from "react";
import { Check, Undo2, X } from "lucide-react";
import { Tag } from "./page";
import { useDict } from "./lang";
import { signups, fmtNum, flagUrl } from "@/lib/data";

export function ScreeningQueue() {
  const t = useDict();
  const [decided, setDecided] = useState<Record<number, "approved" | "denied">>({});
  return (
    <div className="divide-y divide-line border border-line">
      {signups.slice(8, 14).map((p) => {
        const d = decided[p.userId];
        return (
          <div key={p.userId} className="flex min-h-12 items-center gap-3 px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatar} alt="" className="size-9" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(p.country)} alt="" className="h-2.5" />
            <span className="font-bold">{p.username}</span>
            <span className="num text-ash">#{fmtNum(p.rank)}</span>
            <span className="ml-auto flex items-center gap-1.5">
              {d ? (
                <>
                  <Tag tone={d === "approved" ? "balkan" : "rose"}>{t.status[d]}</Tag>
                  <button
                    type="button"
                    aria-label="Undo"
                    onClick={() => setDecided((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => Number(id) !== p.userId)))}
                    className="p-1 text-ash transition hover:text-paper"
                  >
                    <Undo2 className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setDecided({ ...decided, [p.userId]: "approved" })}
                    className="flex items-center gap-1 bg-balkan px-2 py-1 text-xs font-black uppercase text-ink transition hover:bg-paper"
                  >
                    <Check className="size-3.5" /> {t.admin.approve}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecided({ ...decided, [p.userId]: "denied" })}
                    className="flex items-center gap-1 border border-rose px-2 py-1 text-xs font-black uppercase text-rose-hi transition hover:bg-rose/10"
                  >
                    <X className="size-3.5" /> {t.admin.deny}
                  </button>
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
