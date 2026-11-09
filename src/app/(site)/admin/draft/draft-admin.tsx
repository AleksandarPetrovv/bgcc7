"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRefreshWhile } from "@/components/site/use-poll-refresh";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Lock, Pause, Play, RotateCcw, Undo2, X } from "lucide-react";
import { Btn, ErrorNote } from "@/components/admin/form";
import { Dropdown } from "@/components/admin/dropdown";
import { Popup } from "@/components/site/popup";
import { useDict } from "@/components/site/lang";
import { EASE } from "@/lib/ease";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import { Pfp } from "@/components/site/pfp";
import { closeDraft, endDraft, openDraft, pauseDraft, resetDraft, resumeDraft, undoDraft } from "@/actions/draft";

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
    <span className={cn("flex min-w-0 items-center gap-2", side === 1 && "flex-row-reverse justify-start text-right")}>
      {team?.image && <Pfp src={team.image} className="size-8 shrink-0" />}
      <span className={cn("min-w-0 truncate text-sm font-display font-black", !team && "text-ash")}>{team?.name ?? t.common.tbd}</span>
    </span>
  );
}

function Row({ r, pools, i }: { r: DraftRow; pools: { slug: string; title: string }[]; i: number }) {
  const t = useDict();
  const [picked, setPool] = useState<string | null>(null);
  const pool = r.draft?.stage ?? (picked && pools.some((p) => p.slug === picked) ? picked : pools.some((p) => p.slug === r.stage) ? r.stage : (pools[0]?.slug ?? ""));
  const [pending, start] = useTransition();
  const [fail, setFail] = useState(false);
  const [ask, setAsk] = useState<{ text: string; label: React.ReactNode; go: () => void; danger?: boolean } | null>(null);
  const ready = !!r.teams[0] && !!r.teams[1];
  const open = !!r.draft?.open;
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      try {
        const res = await fn();
        setFail(!res?.ok);
      } catch {
        setFail(true);
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
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[16rem_minmax(0,1fr)_auto] md:grid-cols-[16rem_minmax(0,1fr)_auto_auto]">
        <span className="min-w-0 text-xs font-display font-bold text-rose-hi sm:whitespace-nowrap">{r.round}</span>
        <span className="num whitespace-nowrap text-right text-xs font-display font-bold text-ash sm:order-3 md:col-start-4 md:row-start-1">{r.when ?? t.common.tbd}</span>
        <div className="order-last col-span-2 grid min-w-0 sm:order-none sm:col-span-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <Team team={r.teams[0]} side={1} />
          <span className="heading-slam w-8 text-center text-sm text-ash">VS</span>
          <Team team={r.teams[1]} side={2} />
        </div>
        <div className="order-last col-span-2 flex justify-start empty:hidden sm:col-span-3 md:order-4 md:col-span-1 md:justify-end">
          <AnimatePresence mode="popLayout">
            {r.draft && (
              <motion.span
                key={`${r.draft.open}${r.draft.state}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 text-[0.65rem] font-display font-bold",
                  r.draft.open ? "bg-balkan/15 text-balkan-hi" : "bg-slate text-ash",
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
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5 pl-5">
        {!ready ? (
          <span className="text-xs font-display font-bold text-ash">{t.admin.dr.noTeams}</span>
        ) : (
          <>
            <span className="flex items-center gap-2 text-[0.65rem] font-display font-bold text-ash">
              {t.admin.dr.pool}
              <Dropdown
                value={pool}
                disabled={pending}
                aria-label={t.admin.dr.pool}
                className="w-40"
                options={pools.map((p) => ({ value: p.slug, label: p.title }))}
                onChange={(next) => {
                  if (open && r.draft && r.draft.stage !== next) {
                    setAsk({ text: t.admin.dr.confirmPool, label: <><RotateCcw className="size-3.5" /> {t.admin.dr.reset}</>, go: () => { setPool(next); run(() => openDraft(r.id, next)); } });
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
                  <Btn type="button" tone="outline" small disabled={pending} onClick={() => setAsk({ text: t.admin.dr.confirmReset, label: <><RotateCcw className="size-3.5" /> {t.admin.dr.reset}</>, go: () => run(() => resetDraft(r.id)) })}>
                    <RotateCcw className="size-3.5" /> {t.admin.dr.reset}
                  </Btn>
                  <Btn type="button" tone="danger" small disabled={pending} onClick={() => setAsk({ text: t.admin.dr.confirmEnd, label: <><X className="size-3.5" /> {t.admin.dr.end}</>, go: () => run(() => endDraft(r.id)), danger: true })}>
                    <X className="size-3.5" /> {t.admin.dr.end}
                  </Btn>
                </motion.span>
              )}
            </AnimatePresence>
            {fail && !pending && <ErrorNote />}
            <AnimatePresence>
              {r.draft && (
                <motion.span key="view" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="ml-auto">
                  <Link
                    href={`/matches/${r.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="group relative isolate inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-display font-bold text-ink"
                  >
                    <SlantBg className="bg-paper group-hover:bg-rose-deep" />
                      {t.admin.dr.view}
                      <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </motion.span>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      <AnimatePresence>
      {ask && (
      <Popup key="ask" onClose={() => setAsk(null)} shadow={6} className="p-5 sm:p-6">
        <p className="pr-6 text-sm font-bold text-paper">{ask.text}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn type="button" tone="outline" small onClick={() => setAsk(null)}>
            {t.draft.cancel}
          </Btn>
          <Btn
            type="button"
            tone={ask.danger ? "danger" : "rose"}
            small
            onClick={() => {
              ask.go();
              setAsk(null);
            }}
          >
            {ask.label}
          </Btn>
        </div>
      </Popup>
      )}
      </AnimatePresence>
    </motion.li>
  );
}

export function DraftAdmin({ rows, pools }: { rows: DraftRow[]; pools: { slug: string; title: string }[] }) {
  const t = useDict();
  useRefreshWhile(rows.some((r) => r.draft?.open), 4000);

  if (!rows.length) return <p className="border border-dashed border-line px-4 py-8 text-center text-sm font-display font-bold text-ash">{t.admin.dr.none}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <Row key={r.id} r={r} pools={pools} i={i} />
      ))}
    </ul>
  );
}
