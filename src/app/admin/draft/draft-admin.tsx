"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Lock, Pause, Play, RotateCcw, Undo2, X } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { Dropdown } from "@/components/admin/dropdown";
import { useDict } from "@/components/site/lang";
import { EASE } from "@/components/site/motion";
import type { ActionResult } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { closeDraft, endDraft, openDraft, pauseDraft, resetDraft, resumeDraft, undoDraft } from "./actions";

type TeamLite = { name: string; image: string } | null;
export type DraftRow = {
  id: string;
  slug: string;
  round: string;
  stage: string;
  when: string | null;
  teams: [TeamLite, TeamLite];
  draft: { open: boolean; stage: string; state: string; steps: number; rolled: boolean; paused: boolean } | null;
};

function Team({ team, side }: { team: TeamLite; side: 1 | 2 }) {
  const t = useDict();
  return (
    <span className={cn("flex min-w-0 flex-1 items-center gap-2", side === 2 && "flex-row-reverse text-right")}>
      {team?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.image} alt="" className={cn("size-8 shrink-0 -skew-x-6 border-2 object-cover", side === 1 ? "border-rose" : "border-azure")} />
      )}
      <span className={cn("truncate text-sm font-black uppercase", !team && "text-ash")}>{team?.name ?? t.common.tbd}</span>
    </span>
  );
}

function Row({ r, pools, i, control }: { r: DraftRow; pools: { slug: string; title: string }[]; i: number; control: boolean }) {
  const t = useDict();
  const [pool, setPool] = useState(r.draft?.stage ?? (pools.some((p) => p.slug === r.stage) ? r.stage : (pools[0]?.slug ?? "")));
  const [pending, start] = useTransition();
  const [fail, setFail] = useState(false);
  const ready = !!r.teams[0] && !!r.teams[1];
  const open = !!r.draft?.open;
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      try {
        const res = await fn();
        setFail(!res?.ok);
      } catch {
        window.location.reload();
      }
    });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.2 + i * 0.04 }}
      className={cn("relative overflow-hidden border bg-ink transition-colors duration-500", open ? "border-balkan" : "border-line")}
    >
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="absolute inset-y-0 left-0 w-1.5 origin-top bg-balkan"
            aria-hidden
          />
        )}
      </AnimatePresence>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 pl-5">
        <div className="flex w-full min-w-0 items-center gap-2 text-xs font-black uppercase tracking-wide sm:w-44">
          <span className="text-rose-hi">{r.round}</span>
          <span className="num text-ash">{r.when ?? t.common.tbd}</span>
        </div>
        <div className="flex min-w-0 flex-1 basis-72 items-center gap-3">
          <Team team={r.teams[0]} side={1} />
          <span className="heading-slam shrink-0 text-sm text-ash">vs</span>
          <Team team={r.teams[1]} side={2} />
        </div>
        <AnimatePresence mode="popLayout">
          {r.draft && (
            <motion.span
              key={`${r.draft.open}${r.draft.state}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 text-[0.65rem] font-black uppercase tracking-wider",
                r.draft.open ? "bg-balkan/15 text-balkan" : "bg-slate text-ash",
              )}
            >
              {r.draft.open ? (
                <span className="relative flex size-1.5" aria-hidden>
                  <span className="absolute inset-0 animate-ping rounded-full bg-balkan" />
                  <span className="relative size-1.5 rounded-full bg-balkan" />
                </span>
              ) : (
                <Lock className="size-3" />
              )}
              {t.admin.dr.state[r.draft.state] ?? r.draft.state}
              {r.draft.steps > 0 && <span className="num opacity-70">· {r.draft.steps}</span>}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-line px-3 py-2.5 pl-5">
        {!control ? (
          <Link
            href={`/matches/${r.slug}`}
            target="_blank"
            rel="noopener"
            className="lift-sm sheen group ml-auto inline-flex min-h-9 -skew-x-12 items-center bg-paper px-3 text-xs font-black uppercase tracking-wide text-ink [--lift:var(--color-balkan)] hover:bg-white"
          >
            <span className="inline-flex skew-x-12 items-center gap-1.5">
              {t.admin.dr.view}
              <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </Link>
        ) : !ready ? (
          <span className="text-xs font-bold uppercase tracking-wide text-ash">{t.admin.dr.noTeams}</span>
        ) : (
          <>
            <span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.1em] text-ash">
              {t.admin.dr.pool}
              <Dropdown
                value={pool}
                disabled={pending}
                aria-label={t.admin.dr.pool}
                className="w-40"
                options={pools.map((p) => ({ value: p.slug, label: p.title }))}
                onChange={(next) => {
                  if (open && r.draft && r.draft.stage !== next) {
                    if (!window.confirm(t.admin.dr.confirmPool)) return;
                    setPool(next);
                    run(() => openDraft(r.id, next));
                  } else setPool(next);
                }}
              />
            </span>
            {open ? (
              <Btn type="button" tone="outline" small disabled={pending} onClick={() => run(() => closeDraft(r.id))}>
                <Lock className="size-3.5" /> {t.admin.dr.close}
              </Btn>
            ) : (
              <Btn type="button" tone="balkan" small disabled={pending || !pool} onClick={() => run(() => openDraft(r.id, pool))}>
                <Play className="size-3.5 fill-current" /> {t.admin.dr.open}
              </Btn>
            )}
            <AnimatePresence>
              {r.draft && (
                <motion.span key="more" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-wrap items-center gap-2">
                  <Btn type="button" tone="outline" small disabled={pending || (!r.draft.rolled && !r.draft.steps)} onClick={() => run(() => undoDraft(r.id))}>
                    <Undo2 className="size-3.5" /> {t.admin.dr.undo}
                  </Btn>
                  {r.draft.open &&
                    (r.draft.paused ? (
                      <Btn type="button" tone="balkan" small disabled={pending} onClick={() => run(() => resumeDraft(r.id))}>
                        <Play className="size-3.5 fill-current" /> {t.draft.resume}
                      </Btn>
                    ) : (
                      <Btn type="button" tone="outline" small disabled={pending} onClick={() => run(() => pauseDraft(r.id))}>
                        <Pause className="size-3.5" /> {t.draft.timeout}
                      </Btn>
                    ))}
                  <Btn type="button" tone="outline" small disabled={pending} onClick={() => window.confirm(t.admin.dr.confirmReset) && run(() => resetDraft(r.id))}>
                    <RotateCcw className="size-3.5" /> {t.admin.dr.reset}
                  </Btn>
                  <Btn type="button" tone="danger" small disabled={pending} onClick={() => window.confirm(t.admin.dr.confirmEnd) && run(() => endDraft(r.id))}>
                    <X className="size-3.5" /> {t.admin.dr.end}
                  </Btn>
                </motion.span>
              )}
            </AnimatePresence>
            {fail && !pending && <span className="text-xs font-bold uppercase text-rose-hi">{t.admin.error}</span>}
            <AnimatePresence>
              {r.draft && (
                <motion.span key="view" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="ml-auto">
                  <Link
                    href={`/matches/${r.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="lift-sm sheen group inline-flex min-h-9 -skew-x-12 items-center bg-paper px-3 text-xs font-black uppercase tracking-wide text-ink [--lift:var(--color-balkan)] hover:bg-white"
                  >
                    <span className="inline-flex skew-x-12 items-center gap-1.5">
                      {t.admin.dr.view}
                      <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </motion.span>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.li>
  );
}

export function DraftAdmin({ rows, pools, control }: { rows: DraftRow[]; pools: { slug: string; title: string }[]; control: boolean }) {
  const t = useDict();
  const router = useRouter();
  const live = rows.some((r) => r.draft?.open);
  useEffect(() => {
    if (!live && control) return;
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [live, control, router]);

  if (!rows.length) return <p className="border border-dashed border-line px-4 py-8 text-center text-sm font-bold uppercase tracking-wide text-ash">{t.admin.dr.none}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <Row key={r.id} r={r} pools={pools} i={i} control={control} />
      ))}
    </ul>
  );
}
