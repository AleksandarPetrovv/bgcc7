"use client";

import { useActionState } from "react";
import { Check, Undo2, X } from "lucide-react";
import { ActionForm, ghostBtnCls, inputCls } from "@/components/admin/form";
import { Tag } from "@/components/site/page";
import { useDict } from "@/components/site/lang";
import type { RegRow } from "@/db/registrations";
import { flagUrl, fmtNum } from "@/lib/data";
import { osuUser } from "@/lib/links";
import { cn } from "@/lib/utils";
import { decide, removeRegistration } from "./actions";

const TAG = { pending: "paper", approved: "balkan", denied: "rose" } as const;

export function ScreeningRow({ p, signedAt }: { p: RegRow; signedAt: string }) {
  const t = useDict();
  const [state, action, pending] = useActionState(decide.bind(null, p.osuId), null);
  const stats = [
    p.rank !== null && `#${fmtNum(p.rank)}`,
    p.countryRank !== null && `${p.country} #${p.countryRank}`,
    p.pp !== null && `${fmtNum(Math.round(p.pp))}pp`,
    p.accuracy !== null && `${p.accuracy.toFixed(2)}%`,
  ].filter(Boolean);
  return (
    <div className="border border-line bg-coal">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.avatarUrl && <img src={p.avatarUrl} alt="" className="size-10" />}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.country && <img src={flagUrl(p.country)} alt={p.country} className="h-2.5" />}
            <a href={osuUser(p.osuId)} target="_blank" rel="noreferrer" className="truncate font-black hover:text-rose-hi">
              {p.username}
            </a>
            <Tag tone={TAG[p.status]}>{t.status[p.status]}</Tag>
            {p.seeded && <span className="text-[0.6rem] font-black uppercase text-ash">{t.admin.test}</span>}
          </div>
          <div className="num text-sm text-paper/70">
            {stats.join(" · ")} <span className="text-xs text-ash">· {t.admin.signedAt} {signedAt}</span>
          </div>
        </div>
        <ActionForm action={removeRegistration.bind(null, p.osuId)} submit={t.admin.removeReg} ghost confirm={t.admin.confirmRemoveReg} className="ml-auto" />
      </div>
      <form action={action} className={cn("flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5", pending && "opacity-60")}>
        <input name="note" defaultValue={p.note ?? ""} maxLength={300} placeholder={t.admin.note} aria-label={t.admin.note} className={cn(inputCls, "min-w-40 flex-1")} />
        <button name="status" value={p.status} disabled={pending} className={ghostBtnCls}>
          {t.admin.save}
        </button>
        {p.status !== "approved" && (
          <button name="status" value="approved" disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 bg-balkan px-3 text-xs font-black uppercase text-ink transition hover:bg-paper">
            <Check className="size-4" /> {t.admin.approve}
          </button>
        )}
        {p.status !== "denied" && (
          <button name="status" value="denied" disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 border border-rose px-3 text-xs font-black uppercase text-rose-hi transition hover:bg-rose/10">
            <X className="size-4" /> {t.admin.deny}
          </button>
        )}
        {p.status !== "pending" && (
          <button name="status" value="pending" disabled={pending} className={ghostBtnCls}>
            <Undo2 className="size-4" /> {t.admin.reset}
          </button>
        )}
        {state && !pending && !state.ok && <span className="text-xs font-bold text-rose-hi">{t.admin.error}</span>}
      </form>
    </div>
  );
}
