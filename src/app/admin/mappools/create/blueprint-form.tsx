"use client";

import { useState } from "react";
import { Lock, Minus, Plus } from "lucide-react";
import { ActionForm } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { MODS } from "@/lib/data";
import type { ActionResult } from "@/lib/roles";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

const label = (mod: string, i: number) => `${MODS[mod].short}${mod === "Tiebreaker" ? "" : i + 1}`;

export function BlueprintForm({ action, mods, initial, tb }: { action: Action; mods: string[]; initial: Record<string, number>; tb: boolean }) {
  const t = useDict();
  const [counts, setCounts] = useState(() => Object.fromEntries(mods.map((m) => [m, initial[m] ?? 0])) as Record<string, number>);
  const set = (m: string, n: number) => setCounts((c) => ({ ...c, [m]: Math.max(0, Math.min(99, Math.floor(n) || 0)) }));

  return (
    <ActionForm action={action} submit={t.admin.saveLayout} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {mods.map((m, k) => {
          const c = MODS[m].color;
          return (
            <div key={m} style={{ "--i": k, "--s": "0.06s", "--d": "0.2s" } as React.CSSProperties} className="in-up relative overflow-hidden border border-line bg-coal">
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: c }} aria-hidden />
              <div className="flex items-center gap-3 py-3 pl-5 pr-3">
                <div className="min-w-0 flex-1">
                  <div className="heading-slam text-2xl leading-none" style={{ color: c }}>
                    {MODS[m].short}
                  </div>
                  <div className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-ash">{MODS[m].label}</div>
                </div>
                <div className="flex h-10 shrink-0 -skew-x-12">
                  <button
                    type="button"
                    onClick={() => set(m, counts[m] - 1)}
                    disabled={counts[m] === 0}
                    aria-label={`${MODS[m].short} −`}
                    className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-paper/40 hover:bg-white/[0.06] hover:text-paper disabled:opacity-30"
                  >
                    <Minus className="size-4 skew-x-12" strokeWidth={3} />
                  </button>
                  <span className="grid h-10 w-14 place-items-center border-y border-line bg-ink/60">
                    <input
                      name={m}
                      type="number"
                      min={0}
                      max={99}
                      value={counts[m]}
                      onChange={(e) => set(m, Number(e.target.value))}
                      aria-label={MODS[m].label}
                      className="adm-bare num h-full w-full skew-x-12 appearance-none border-0 bg-transparent p-0 text-center text-2xl font-black leading-none text-paper outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => set(m, counts[m] + 1)}
                    aria-label={`${MODS[m].short} +`}
                    className="grid h-10 w-10 place-items-center border text-white transition-[filter] hover:brightness-110"
                    style={{ background: c, borderColor: c }}
                  >
                    <Plus className="size-4 skew-x-12" strokeWidth={3} />
                  </button>
                </div>
              </div>
              <div className="flex min-h-9 flex-wrap gap-1 border-t border-line bg-ink/40 px-5 py-2">
                {counts[m] === 0 ? (
                  <span className="text-[0.65rem] font-bold uppercase text-ash">{t.admin.noSlots}</span>
                ) : (
                  Array.from({ length: counts[m] }, (_, i) => (
                    <span key={i} className="num -skew-x-12 border px-1.5 py-0.5 text-[0.65rem] font-black" style={{ borderColor: c, color: c }}>
                      <span className="inline-block skew-x-12">{label(m, i)}</span>
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
        {tb && (
          <div className="in-up relative flex items-center gap-3 overflow-hidden border border-dashed border-line bg-coal py-3 pl-5 pr-4 [--d:0.5s]">
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: MODS.Tiebreaker.color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="heading-slam text-2xl leading-none" style={{ color: MODS.Tiebreaker.color }}>
                TB
              </div>
              <div className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-ash">{t.admin.tbFixed}</div>
            </div>
            <Lock className="size-4 text-ash" />
          </div>
        )}
      </div>
    </ActionForm>
  );
}
