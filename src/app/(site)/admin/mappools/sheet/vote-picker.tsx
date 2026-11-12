"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, SquareCheck } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { scoreColor } from "@/lib/score-color";
import { errorText } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import { voteSuggestion } from "./actions";

const STEPS = Array.from({ length: 10 }, (_, k) => k + 1);
// the bar and the note fold out of the button and back into it
const FOLD = "grid transition-[grid-template-columns,grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

export function VotePicker({ id, mine, mineNote, onDraft }: { id: number; mine: number | null; mineNote: string; onDraft?: (n: number | null, saved: number | null) => void }) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState({ n: mine, note: mineNote });
  const [draft, setDraft] = useState(mine);
  const [note, setNote] = useState(mineNote);
  const [failed, setFailed] = useState<string | null>(null);
  const [needNote, setNeedNote] = useState(false);
  const [pending, start] = useTransition();
  const [seen, setSeen] = useState({ mine, mineNote });
  const noteRef = useRef<HTMLInputElement>(null);
  const dirty = draft !== null && (draft !== saved.n || note.trim() !== saved.note);
  if (seen.mine !== mine || seen.mineNote !== mineNote) {
    setSeen({ mine, mineNote });
    if (!dirty) {
      setSaved({ n: mine, note: mineNote });
      setDraft(mine);
      setNote(mineNote);
    }
  }
  const ready = dirty && note.trim().length >= 1;

  const close = () => {
    setOpen(false);
    setFailed(null);
    setNeedNote(false);
    setDraft(saved.n);
    setNote(saved.note);
    onDraft?.(saved.n, saved.n);
  };

  const press = () => {
    if (!open) return setOpen(true);
    if (!dirty) return close();
    if (!ready || draft === null) {
      if (dirty) setNeedNote(true);
      return noteRef.current?.focus();
    }
    const n = draft;
    const text = note.trim();
    setFailed(null);
    start(async () => {
      const r = await voteSuggestion(id, n, text).catch(() => null);
      if (r?.ok) {
        setSaved({ n, note: text });
        setNote(text);
        onDraft?.(n, n);
        setOpen(false);
      } else setFailed(r?.error === "taken" ? t.admin.voteTaken : errorText(t, r?.error));
    });
  };

  const voted = saved.n !== null;
  return (
    <div className="flex max-w-full flex-col items-end" onKeyDown={(e) => e.key === "Escape" && open && close()}>
      <div className="flex max-w-full items-center justify-end">
        <div className={cn(FOLD, open ? "opacity-100" : "opacity-0")} style={{ gridTemplateColumns: open ? "1fr" : "0fr" }} inert={!open}>
          <div className="min-w-0 overflow-hidden">
            <div className="flex h-10 items-center gap-3 pr-3">
              <div className="w-32 shrink-0 sm:w-52">
                <div className="relative h-6">
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
                            head && "-translate-y-0.5",
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
                <div className="mt-0.5 flex justify-between px-1 text-[0.6rem] leading-none font-display font-bold text-ash">
                  <span>{t.admin.rateBad}</span>
                  <span>{t.admin.rateGreat}</span>
                </div>
              </div>
              <span className={cn("heading-slam w-12 shrink-0 text-center text-2xl leading-none", draft === null ? "text-ash" : "text-paper")}>
                {draft ?? "?"}
                <span className="text-[0.65rem] font-display font-bold text-ash">/10</span>
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={press}
          disabled={pending}
          aria-expanded={open}
          className={cn(
            "group relative isolate flex min-h-10 w-24 shrink-0 items-center justify-center text-xs font-display font-bold transition-[color,scale] duration-200 active:scale-[0.97] disabled:opacity-60",
            open ? (ready ? "text-rose-hi" : "text-paper/70 hover:text-paper") : voted ? "text-balkan-hi" : "text-rose-hi",
          )}
        >
          <SlantBg
            className={cn(
              "border transition-[border-color] duration-200",
              open
                ? ready
                  ? failed
                    ? "border-rose-deep"
                    : "border-rose group-hover:border-rose-hi"
                  : "border-paper/35 group-hover:border-paper/60"
                : voted
                  ? "border-balkan group-hover:border-balkan-hi"
                  : "border-rose group-hover:border-rose-hi",
            )}
          />
          <span className="flex items-center gap-1.5">
            {voted ? <Pencil className="size-3.5" /> : <SquareCheck className="size-3.5" />}
            {pending ? t.admin.saving : open ? (voted ? t.admin.updateVote : t.admin.voteBtn) : voted ? t.admin.voted : t.admin.voteBtn}
          </span>
        </button>
      </div>
      <div className={cn(FOLD, "w-full", open ? "opacity-100" : "opacity-0")} style={{ gridTemplateRows: open ? "1fr" : "0fr" }} inert={!open}>
        <div className="-mx-2 min-h-0 overflow-hidden px-2">
          <div className="pt-2 pb-1.5">
            <span data-field className={cn("adm-field adm-tight w-full", needNote && "before:!border-2 before:!border-rose")}>
              <input
                ref={noteRef}
                className="adm-bare"
                value={note}
                maxLength={300}
                placeholder={t.admin.voteNote}
                aria-label={t.admin.voteNote}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNeedNote(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && press()}
              />
            </span>
            {failed && <p className="mt-1.5 text-xs font-display font-bold text-rose-hi">{failed}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
