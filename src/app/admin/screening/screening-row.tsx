"use client";

import { useActionState } from "react";
import { InView } from "@/components/site/in-view";
import { Check, Undo2, X } from "lucide-react";
import { ActionForm, Btn, inputCls } from "@/components/admin/form";
import { Tag } from "@/components/site/page";
import { useDict } from "@/components/site/lang";
import type { RegRow } from "@/db/registrations";
import { flagUrl, fmtNum } from "@/lib/data";
import { osuUser } from "@/lib/links";
import { cn } from "@/lib/utils";
import { decide, removeRegistration } from "./actions";

const TAG = { pending: "paper", approved: "balkan", denied: "rose" } as const;

export function ScreeningRow({ p, signedAt, i }: { p: RegRow; signedAt: string; i: number }) {
  const t = useDict();
  const [state, action, pending] = useActionState(decide.bind(null, p.osuId), null);
  const stats = [
    p.rank !== null && `#${fmtNum(p.rank)}`,
    p.countryRank !== null && `${p.country} #${p.countryRank}`,
    p.pp !== null && `${fmtNum(Math.round(p.pp))}pp`,
    p.accuracy !== null && `${p.accuracy.toFixed(2)}%`,
  ].filter(Boolean);
  return (
    <InView self className="in-left-far border border-line bg-coal" style={{ "--i": i < 12 ? i : 0, "--s": "0.05s", "--d": "0.35s" } as React.CSSProperties}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.avatarUrl && <img src={p.avatarUrl} alt="" className="in-spin size-10 [--d:0.45s]" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.country && <img src={flagUrl(p.country)} alt={p.country} className="h-2.5" />}
            <a href={osuUser(p.osuId)} target="_blank" rel="noreferrer" className="truncate font-black hover:text-rose-hi">
              {p.username}
            </a>
            <span className="in-slam inline-flex [--d:0.6s]">
              <Tag tone={TAG[p.status]}>{t.status[p.status]}</Tag>
            </span>
            {p.seeded && <span className="text-[0.6rem] font-black uppercase text-ash">{t.admin.test}</span>}
          </div>
          <div className="in-wipe num text-sm text-paper/70 [--d:0.55s]">
            {stats.join(" · ")} <span className="text-xs text-ash">· {t.admin.signedAt} {signedAt}</span>
          </div>
        </div>
        <ActionForm action={removeRegistration.bind(null, p.osuId)} submit={t.admin.removeReg} ghost confirm={t.admin.confirmRemoveReg} className="ml-auto" />
      </div>
      <form action={action} className={cn("in-up flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5 [--d:0.65s]", pending && "opacity-60")}>
        <input name="note" defaultValue={p.note ?? ""} maxLength={300} placeholder={t.admin.note} aria-label={t.admin.note} className={cn(inputCls, "w-full sm:w-auto sm:min-w-40 sm:flex-1")} />
        <Btn name="status" value={p.status} disabled={pending} tone="outline" small>
          {t.admin.save}
        </Btn>
        {p.status !== "approved" && (
          <Btn name="status" value="approved" disabled={pending} tone="balkan" small>
            <Check className="size-4" /> {t.admin.approve}
          </Btn>
        )}
        {p.status !== "denied" && (
          <Btn name="status" value="denied" disabled={pending} tone="danger" small>
            <X className="size-4" /> {t.admin.deny}
          </Btn>
        )}
        {p.status !== "pending" && (
          <Btn name="status" value="pending" disabled={pending} tone="outline" small>
            <Undo2 className="size-4" /> {t.admin.reset}
          </Btn>
        )}
        {state && !pending && !state.ok && <span className="text-xs font-bold uppercase tracking-wide text-rose-hi">{state.error === "note" ? t.admin.denyNote : t.admin.error}</span>}
      </form>
    </InView>
  );
}
