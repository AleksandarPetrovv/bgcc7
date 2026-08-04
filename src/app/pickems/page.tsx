"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { Container, PageTitle, SectionHeading, SlantButton, Tag } from "@/components/site/page";
import { useDict } from "@/components/site/lang";
import { bracket, pickemLeaderboard, teamById, type Match } from "@/lib/data";
import { cn } from "@/lib/utils";

function PickCard({ m, pick, onPick }: { m: Match; pick?: string; onPick: (id: string) => void }) {
  const t = useDict();
  return (
    <div className="w-56 divide-y divide-line border border-line bg-coal">
      {[m.team1, m.team2].map((s, i) => {
        const team = teamById(s.id);
        const picked = pick === s.id && !!team;
        return (
          <button
            key={s.id || i}
            type="button"
            disabled={!team}
            onClick={() => team && onPick(s.id)}
            className={cn(
              "flex h-10 w-full items-center gap-2 px-2 text-left text-sm transition",
              picked ? "bg-balkan/20 font-black text-balkan" : "font-bold hover:bg-slate",
              !team && "cursor-default italic text-ash",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {team && <img src={team.image} alt="" className="size-6 object-cover" />}
            <span className="truncate">{team?.name ?? t.common.tbd}</span>
            {picked && <Check className="ml-auto size-4 shrink-0" aria-label={t.pickems.yourPick} />}
          </button>
        );
      })}
    </div>
  );
}

export default function Pickems() {
  const t = useDict();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const made = Object.keys(picks).length;
  const cols = [...bracket.winners, ...bracket.losers.slice(0, 2)];

  return (
    <Container className="max-w-[1400px]">
      <PageTitle accent={t.pickems.accent} right={<Tag tone="balkan" className="text-xs">{t.pickems.openTag}</Tag>}>
        {t.pickems.title}
      </PageTitle>

      <div className="mb-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
          {t.pickems.points.map(([k, v]) => (
            <div key={k} className="bg-coal p-3 last:col-span-2 sm:last:col-span-1">
              <div className="min-h-[2lh] text-[0.65rem] font-black uppercase leading-tight tracking-wide text-ash">{k}</div>
              <div className="num text-3xl text-balkan">
                {v}
                <span className="text-base text-ash"> {t.common.pts}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border border-line bg-coal p-4">
          <div>
            <div className="text-[0.65rem] font-black uppercase text-rose-hi">{t.pickems.yourPicks}</div>
            <div className="num text-3xl">{made} / 15</div>
          </div>
          <SlantButton tone="balkan" className="ml-auto">{t.pickems.save}</SlantButton>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-10">
          {cols.map((r) => (
            <div key={r.title}>
              <div className="mb-3 text-center text-sm font-black uppercase tracking-wider text-ash">{t.rounds[r.title] ?? r.title}</div>
              <div className="flex flex-col justify-around gap-4" style={{ minHeight: 380 }}>
                {r.matches.map((m) => (
                  <PickCard key={m.id} m={m} pick={picks[m.id]} onPick={(id) => setPicks({ ...picks, [m.id]: id })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <SectionHeading>{t.pickems.leaderboard}</SectionHeading>
      </div>
      <div className="divide-y divide-line border border-line bg-coal">
        {pickemLeaderboard.map((e, i) => (
          <div key={e.userId} className="grid min-h-14 grid-cols-[48px_1fr_auto] items-center gap-x-4 px-4 sm:grid-cols-[64px_1fr_110px_70px_160px]">
            <span className={cn("num text-2xl leading-none", i === 0 ? "text-[#e8c547]" : i === 1 ? "text-[#c9ccd1]" : i === 2 ? "text-[#c98a4b]" : "text-ash")}>#{i + 1}</span>
            <span className="flex min-w-0 items-center gap-3 font-bold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.avatar} alt="" className="size-8 shrink-0" />
              <span className="truncate">{e.username}</span>
            </span>
            <span className="num text-right text-2xl leading-none text-balkan">
              {e.score} <span className="text-base text-ash">{t.common.pts}</span>
            </span>
            <span className="num hidden items-center justify-end gap-1 text-lg leading-none text-paper/70 sm:flex">
              {e.correct} <Check className="size-4" aria-label={t.pickems.correct} />
            </span>
            <span className="hidden justify-end sm:flex">
              <button type="button" className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-black uppercase leading-none text-rose-hi hover:text-paper">
                <Lock className="size-3.5" /> {t.pickems.viewBracket}
              </button>
            </span>
          </div>
        ))}
      </div>
    </Container>
  );
}
