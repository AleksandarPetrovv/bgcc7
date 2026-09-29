"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { scoreColor } from "@/lib/score-color";
import { cn } from "@/lib/utils";
import { voteSuggestion } from "./actions";

const STEPS = Array.from({ length: 10 }, (_, k) => k + 1);

export function VotePicker({ id, mine, onDraft }: { id: number; mine: number | null; onDraft?: (n: number | null, saved: number | null) => void }) {
  const t = useDict();
  const [saved, setSaved] = useState(mine);
  const [draft, setDraft] = useState(mine);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const dirty = draft !== null && draft !== saved;

  const submit = () => {
    if (!dirty || draft === null) return;
    const n = draft;
    setFailed(false);
    start(async () => {
      const r = await voteSuggestion(id, n).catch(() => null);
      if (r?.ok) {
        setSaved(n);
        onDraft?.(n, n);
      } else setFailed(true);
    });
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:w-auto sm:flex-nowrap">
      <div className="w-full min-w-0 sm:w-52">
        <div className="relative h-7">
          <div className="pointer-events-none flex h-full gap-[3px] px-1" aria-hidden>
            {STEPS.map((n) => {
              const on = draft !== null && n <= draft;
              const head = n === draft;
              return (
                <span
                  key={n}
                  className={cn(
                    "flex-1 -skew-x-12 border transition-[background-color,border-color,transform,box-shadow] duration-150",
                    on ? "border-transparent" : "border-line bg-ink/60",
                    head && "-translate-y-0.5 shadow-[2px_2px_0_0_var(--color-ink)]",
                  )}
                  style={on && draft !== null ? { background: scoreColor(draft), opacity: head ? 1 : 0.45 } : undefined}
                />
              );
            })}
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={draft ?? 5}
            aria-label={t.admin.yourVote}
            aria-valuetext={draft === null ? t.admin.notRated : `${draft}/10`}
            onChange={(e) => {
              const n = Number(e.target.value);
              setDraft(n);
              onDraft?.(n, saved);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="vote-hit absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="mt-1 flex justify-between px-1 text-[0.6rem] font-black uppercase tracking-[0.12em] text-ash">
          <span>{t.admin.rateBad}</span>
          <span>{t.admin.rateGreat}</span>
        </div>
      </div>
      <span className={cn("heading-slam w-12 shrink-0 text-right text-2xl leading-none", draft === null ? "text-ash" : "text-paper")}>
        {draft === null ? (
          <span className="font-sans text-[0.65rem] font-bold text-ash">?/10</span>
        ) : (
          <>
            {draft}
            <span className="font-sans text-[0.65rem] font-bold text-ash">/10</span>
          </>
        )}
      </span>
      {saved !== null && !dirty ? (
        <span className="flex min-h-10 w-24 shrink-0 -skew-x-12 items-center justify-center border border-balkan/60 text-xs font-black uppercase text-balkan">
          <span className="flex skew-x-12 items-center gap-1.5">
            <Check className="size-3.5" strokeWidth={3} /> {t.admin.voted}
          </span>
        </span>
      ) : (
        <Btn type="button" small tone={dirty ? "rose" : "outline"} disabled={!dirty || pending} onClick={submit} className={cn("w-24 shrink-0", failed && "bg-rose-deep")}>
          {pending ? t.admin.saving : saved === null ? t.admin.voteBtn : t.admin.updateVote}
        </Btn>
      )}
    </div>
  );
}
