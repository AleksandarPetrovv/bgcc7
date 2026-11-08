"use client";

import { Flash } from "@/components/admin/flash";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { InView } from "@/components/site/in-view";
import Link from "next/link";
import { Check } from "lucide-react";
import { Container, SectionHeading, Tag } from "@/components/site/page";
import { PageTitle } from "@/components/site/page-title";
import { SlantButton } from "@/components/site/slant";
import { useDict, useIsBGCC6 } from "@/components/site/lang";
import { PickemsBracket } from "@/components/site/pickems-bracket";
import { resolve, seedingOf, type Picks } from "@/lib/pickems";
import { useTournament } from "@/components/site/tournament";
import { PLAN_STAGES } from "@/lib/format-plan";
import { MEDAL } from "@/lib/theme";
import { osuUser } from "@/lib/links";
import { pickemsHref } from "@/lib/data";
import type { LeaderRow } from "@/db/queries";
import { cn } from "@/lib/utils";
import { savePickems } from "./actions";
import { login } from "@/actions/auth";
import { MeTag } from "@/components/site/me";
import { roundName } from "@/lib/i18n/dict";


const still = () => () => {};

type Props = { osuId: number | null; saved: Picks | null; leaderboard: LeaderRow[]; open: boolean; closesAt: number | null; locked: string[] };

export function PickemsView({ osuId, saved, leaderboard, open: openAtLoad, closesAt, locked }: Props) {
  const t = useDict();
  const [open, setOpen] = useState(openAtLoad);
  useEffect(() => {
    if (!openAtLoad || closesAt === null) return;
    const ms = closesAt - Date.now();
    // setTimeout fires at once past ~24.8 days, so far-off closes wait for a reload instead
    if (ms > 2 ** 31 - 1) return;
    const id = setTimeout(() => setOpen(false), Math.max(0, ms));
    return () => clearTimeout(id);
  }, [openAtLoad, closesAt]);
  const { matches, format: f } = useTournament();
  const seeding = seedingOf(f, matches);
  const DRAFT = useIsBGCC6() ? "bgcc7-pickems" : "bgcc7-suiji-pickems";
  const [picks, setPicks] = useState<Picks>(saved ?? {});
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const { picks: clean, total } = resolve(f, picks, seeding);
  const made = Object.keys(clean).length;
  const byStage = new Map<string, Set<number>>();
  for (const [code, r] of Object.entries(f.rounds)) byStage.set(r.stage, (byStage.get(r.stage) ?? new Set()).add(f.points[code] ?? 0));
  const stageName = (slug: string) => PLAN_STAGES.find((s) => s.slug === slug)?.name ?? slug;
  const points: [string, number][] = [...byStage.values()].every((s) => s.size === 1)
    ? [...byStage].map(([slug, s]) => [roundName(t, stageName(slug)), [...s][0]])
    : t.pickems.points;

  // the unsaved draft lives in localStorage, so it can only be restored after mount
  const mounted = useSyncExternalStore(still, () => true, () => false);
  const [restoredFor, setRestoredFor] = useState<Picks | null | undefined>(undefined);
  if (mounted && restoredFor !== saved) {
    setRestoredFor(saved);
    if (!saved) {
      try {
        const raw = localStorage.getItem(DRAFT);
        if (raw) {
          setPicks(resolve(f, JSON.parse(raw), seeding).picks);
          setDirty(true);
        }
      } catch {}
    }
  }

  const pick = (match: string, team: string) => {
    const next = resolve(f, { ...clean, [match]: team }, seeding).picks;
    setPicks(next);
    setDirty(true);
    setError(false);
    try {
      localStorage.setItem(DRAFT, JSON.stringify(next));
    } catch {}
  };

  const save = () =>
    start(async () => {
      if (!osuId) return login("/pickems");
      const res = await savePickems(clean);
      if (res.ok) {
        setDirty(false);
        try {
          localStorage.removeItem(DRAFT);
        } catch {}
      } else if (res.error === "auth") await login("/pickems");
      else setError(true);
    });

  return (
    <Container plain>
      <PageTitle
        mark="tick"
        accent={t.pickems.accent}
        right={
          open ? (
            <Tag tone="balkan" className="text-xs">
              {t.pickems.openTag}
            </Tag>
          ) : (
            <Tag tone="rose" className="text-xs">
              {t.pickems.closedTag}
            </Tag>
          )
        }
      >
        {t.pickems.title}
      </PageTitle>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid grid-cols-3 border-b border-line sm:grid-cols-5">
          {points.map(([k, v], i) => (
            <div key={k} className="in-flip p-2.5 pl-0 last:col-span-2 sm:p-3 sm:pl-0 sm:last:col-span-1" style={{ "--i": i, "--s": "0.08s", "--d": "0.15s" } as React.CSSProperties}>
              <div className="min-h-[2lh] text-[0.6rem] font-display font-bold leading-tight text-ash sm:text-[0.65rem]">{k}</div>
              <div className="in-pop num origin-left text-2xl sm:text-3xl text-balkan-hi [--d:0.45s]">
                {v}
                <span className="text-base text-ash"> {t.common.pts}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="in-right relative flex flex-wrap items-center gap-4 border-b border-line py-4 [--d:0.3s]">
          <span className="absolute -bottom-[7px] left-0 size-2.5 rotate-45 bg-rose" aria-hidden />
          <div>
            <div className="text-[0.65rem] font-display font-bold text-rose-hi">{t.pickems.yourPicks}</div>
            <div className="in-pop num origin-left text-3xl [--d:0.55s]">
              {made} / {total}
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            {!open ? null : !dirty && made > 0 && osuId ? (
              <Flash className="flex items-center gap-1.5 text-sm font-display font-bold text-balkan-hi">
                <Check className="size-4" /> {t.common.saved}
              </Flash>
            ) : (
              <SlantButton tone="balkan" onClick={save} className={cn(pending && "pointer-events-none opacity-60")}>
                {osuId ? t.pickems.save : t.pickems.loginToSave}
              </SlantButton>
            )}
            {error && <span className="text-xs font-bold text-rose-hi">{t.pickems.saveError}</span>}
          </div>
        </div>
      </div>

      <PickemsBracket picks={clean} onPick={open ? pick : undefined} locked={locked} />

      {/* one column, centred under the bracket; rows come in once the bracket has */}
      <div className="mx-auto mt-14 max-w-3xl">
        <SectionHeading>{t.pickems.leaderboard}</SectionHeading>
      {leaderboard.length ? (
        <InView className="divide-y divide-line">
          {leaderboard.map((e, i) => (
            <div
              key={e.osuId}
              style={{ "--i": Math.min(i, 15), "--s": "0.05s", "--d": "1.1s" } as React.CSSProperties}
              className={cn(
                "in-left grid min-h-14 grid-cols-[48px_1fr_auto] items-center gap-x-4 px-2 sm:grid-cols-[64px_1fr_auto_56px_auto] sm:gap-x-6",
                e.osuId === osuId && "bg-[color-mix(in_oklab,var(--balkan)_14%,transparent)] shadow-[inset_3px_0_0_0_var(--balkan)]",
              )}
            >
              <span className={cn("in-pop num text-2xl leading-none [--d:0.2s]", MEDAL[i] ?? "text-ash")}>#{i + 1}</span>
              <span className="flex min-w-0 items-center gap-3 font-display font-bold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.avatarUrl && <img src={e.avatarUrl} alt="" className="size-8 shrink-0" />}
                <a href={osuUser(e.osuId)} target="_blank" rel="noreferrer" className="truncate hover:text-rose-hi">
                  {e.username}
                </a>
                <MeTag p={e.osuId} />
              </span>
              <span className="num whitespace-nowrap text-right text-2xl leading-none text-balkan-hi">
                {e.points} <span className="text-base text-ash">{t.common.pts}</span>
              </span>
              <span className="num hidden items-center justify-end gap-1 text-lg leading-none text-paper/70 sm:flex">
                {e.correct} <Check className="size-4" aria-label={t.pickems.correct} />
              </span>
              <span className="hidden justify-end sm:flex">
                <Link
                  href={pickemsHref(e.username)}
                  scroll={false}
                  className="whitespace-nowrap text-xs font-display font-bold leading-none text-rose-hi hover:text-paper"
                >
                  {t.pickems.viewBracket}
                </Link>
              </span>
            </div>
          ))}
        </InView>
      ) : (
        <p className="py-10 text-center text-ash">{t.pickems.noEntries}</p>
      )}
      </div>
    </Container>
  );
}
