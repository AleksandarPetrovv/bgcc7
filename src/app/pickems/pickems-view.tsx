"use client";

import { useEffect, useState, useTransition } from "react";
import { InView } from "@/components/site/in-view";
import Link from "next/link";
import { Check } from "lucide-react";
import { Container, PageTitle, SectionHeading, SlantButton, Tag, Wide } from "@/components/site/page";
import { useDict } from "@/components/site/lang";
import { PickemsBracket } from "@/components/site/pickems-bracket";
import { resolve, seedingOf, type Picks } from "@/lib/pickems";
import { useTournament } from "@/components/site/tournament";
import { osuUser } from "@/lib/links";
import type { LeaderRow } from "@/db/queries";
import { cn } from "@/lib/utils";
import { login, savePickems } from "./actions";

const DRAFT = "bgcc7-pickems";
const MEDAL = ["text-[#e8c547]", "text-[#c9ccd1]", "text-[#c98a4b]"];

type Props = { osuId: number | null; saved: Picks | null; leaderboard: LeaderRow[]; open: boolean; locked: string[] };

export function PickemsView({ osuId, saved, leaderboard, open, locked }: Props) {
  const t = useDict();
  const { matches } = useTournament();
  const seeding = seedingOf(matches);
  const [picks, setPicks] = useState<Picks>(saved ?? {});
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const { picks: clean, total } = resolve(picks, seeding);
  const made = Object.keys(clean).length;

  useEffect(() => {
    if (saved) return;
    try {
      const raw = localStorage.getItem(DRAFT);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPicks(resolve(JSON.parse(raw), seeding).picks);
        setDirty(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const pick = (match: string, team: string) => {
    const next = resolve({ ...clean, [match]: team }, seeding).picks;
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
      <PageTitle mark="tick" accent={t.pickems.accent} right={open ? <Tag tone="balkan" className="text-xs">{t.pickems.openTag}</Tag> : <Tag tone="rose" className="text-xs">{t.pickems.closedTag}</Tag>}>
        {t.pickems.title}
      </PageTitle>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
          {t.pickems.points.map(([k, v], i) => (
            <div key={k} className="in-flip bg-coal p-3 last:col-span-2 sm:last:col-span-1" style={{ "--i": i, "--s": "0.08s", "--d": "0.15s" } as React.CSSProperties}>
              <div className="min-h-[2lh] text-[0.65rem] font-black uppercase leading-tight tracking-wide text-ash">{k}</div>
              <div className="in-pop num origin-left text-3xl text-balkan [--d:0.45s]">
                {v}
                <span className="text-base text-ash"> {t.common.pts}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="in-right flex flex-wrap items-center gap-4 border border-line bg-coal p-4 [--d:0.3s]">
          <div>
            <div className="text-[0.65rem] font-black uppercase text-rose-hi">{t.pickems.yourPicks}</div>
            <div className="in-pop num origin-left text-3xl [--d:0.55s]">
              {made} / {total}
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            {!open ? (
              <span className="text-sm font-black uppercase text-ash">{t.pickems.closedTag}</span>
            ) : !dirty && made > 0 && osuId ? (
              <span className="flex items-center gap-1.5 text-sm font-black uppercase text-balkan">
                <Check className="size-4" /> {t.common.saved}
              </span>
            ) : (
              <SlantButton tone="balkan" onClick={save} className={cn(pending && "pointer-events-none opacity-60")}>
                {osuId ? t.pickems.save : t.pickems.loginToSave}
              </SlantButton>
            )}
            {error && <span className="text-xs font-bold text-rose-hi">{t.pickems.saveError}</span>}
          </div>
        </div>
      </div>

      <Wide>
        <PickemsBracket picks={clean} onPick={open ? pick : undefined} locked={locked} />
      </Wide>

      <div className="mt-14">
        <SectionHeading>{t.pickems.leaderboard}</SectionHeading>
      </div>
      {leaderboard.length ? (
        <InView className="divide-y divide-line border border-line bg-coal">
          {leaderboard.map((e, i) => (
            <div
              key={e.osuId}
              style={{ "--i": Math.min(i, 15), "--s": "0.05s" } as React.CSSProperties}
              className={cn(
                "in-left grid min-h-14 grid-cols-[48px_1fr_auto] items-center gap-x-4 px-4 sm:grid-cols-[64px_1fr_110px_70px_160px]",
                e.osuId === osuId && "bg-balkan/10",
              )}
            >
              <span className={cn("in-pop num text-2xl leading-none [--d:0.2s]", MEDAL[i] ?? "text-ash")}>#{i + 1}</span>
              <span className="flex min-w-0 items-center gap-3 font-bold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.avatarUrl && <img src={e.avatarUrl} alt="" className="size-8 shrink-0" />}
                <a href={osuUser(e.osuId)} target="_blank" rel="noreferrer" className="truncate hover:text-rose-hi">
                  {e.username}
                </a>
                {e.osuId === osuId && <span className="text-xs font-bold uppercase text-balkan">({t.pickems.you})</span>}
              </span>
              <span className="num text-right text-2xl leading-none text-balkan">
                {e.points} <span className="text-base text-ash">{t.common.pts}</span>
              </span>
              <span className="num hidden items-center justify-end gap-1 text-lg leading-none text-paper/70 sm:flex">
                {e.correct} <Check className="size-4" aria-label={t.pickems.correct} />
              </span>
              <span className="hidden justify-end sm:flex">
                <Link href={`/pickems/${e.osuId}`} className="whitespace-nowrap text-xs font-black uppercase leading-none text-rose-hi hover:text-paper">
                  {t.pickems.viewBracket}
                </Link>
              </span>
            </div>
          ))}
        </InView>
      ) : (
        <p className="border border-dashed border-line py-10 text-center text-ash">{t.pickems.noEntries}</p>
      )}
    </Container>
  );
}
