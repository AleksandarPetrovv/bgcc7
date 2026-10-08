"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { scoreColor } from "@/lib/score-color";
import { cn } from "@/lib/utils";
import { voteSuggestion } from "./actions";

const STEPS = Array.from({ length: 10 }, (_, k) => k + 1);

export function VotePicker({ id, mine, mineNote, onDraft }: { id: number; mine: number | null; mineNote: string; onDraft?: (n: number | null, saved: number | null) => void }) {
  const t = useDict();
  const [saved, setSaved] = useState({ n: mine, note: mineNote });
  const [draft, setDraft] = useState(mine);
  const [note, setNote] = useState(mineNote);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const [seen, setSeen] = useState({ mine, mineNote });
  const dirty = draft !== null && (draft !== saved.n || note.trim() !== saved.note);
  if (seen.mine !== mine || seen.mineNote !== mineNote) {
    setSeen({ mine, mineNote });
    if (!dirty) {
      setSaved({ n: mine, note: mineNote });
      setDraft(mine);
      setNote(mineNote);
    }
  }
  const ready = dirty && note.trim().length >= 2;

  const submit = () => {
    if (!ready || draft === null) return;
    const n = draft;
    const text = note.trim();
    setFailed(false);
    start(async () => {
      const r = await voteSuggestion(id, n, text).catch(() => null);
      if (r?.ok) {
        setSaved({ n, note: text });
        setNote(text);
        onDraft?.(n, n);
      } else setFailed(true);
    });
  };

  return (
    <div className="flex w-full flex-col gap-2 sm:w-[25rem]">
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:flex-nowrap">
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
                      "flex-1 -skew-x-12 border transition-[background-color,border-color,transform,box-shadow,translate,scale,rotate] duration-150",
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
                onDraft?.(n, saved.n);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
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
        {saved.n !== null && !dirty ? (
          <span className="flex min-h-10 w-24 shrink-0 -skew-x-12 items-center justify-center border border-balkan/60 text-xs font-black uppercase text-balkan">
            <span className="flex skew-x-12 items-center gap-1.5">
              <Check className="size-3.5" strokeWidth={3} /> {t.admin.voted}
            </span>
          </span>
        ) : (
          <Btn type="button" small tone={ready ? "rose" : "outline"} disabled={!ready || pending} onClick={submit} className={cn("w-24 shrink-0", failed && "bg-rose-deep")}>
            {pending ? t.admin.saving : saved.n === null ? t.admin.voteBtn : t.admin.updateVote}
          </Btn>
        )}
      </div>
      <span className={cn("adm-field adm-tight w-full", draft !== null && dirty && note.trim().length < 2 && "border-rose/60")}>
        <input
          className="adm-bare"
          value={note}
          maxLength={300}
          placeholder={t.admin.voteNote}
          aria-label={t.admin.voteNote}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </span>
    </div>
  );
}
