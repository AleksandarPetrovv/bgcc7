"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Container, PageTitle, SlantButton, Tag } from "@/components/site/page";
import { bracket, pickemLeaderboard, teamById, type Match } from "@/lib/data";
import { cn } from "@/lib/utils";

const POINTS = [
  ["Quarterfinals", 10],
  ["Semifinals", 15],
  ["Winners final", 25],
  ["Losers final", 35],
  ["Grand finals", 50],
] as const;

function PickCard({ m, pick, onPick }: { m: Match; pick?: string; onPick: (id: string) => void }) {
  return (
    <div className="w-56 border border-line bg-coal">
      <div className="bg-ink/70 px-2 py-0.5 text-[0.62rem] font-bold uppercase text-ash">{m.id}</div>
      {[m.team1, m.team2].map((s) => {
        const t = teamById(s.id);
        const picked = pick === s.id && !!t;
        return (
          <button
            key={s.id || s.name}
            disabled={!t}
            onClick={() => t && onPick(s.id)}
            className={cn(
              "flex h-8 w-full items-center gap-2 border-l-[3px] px-2 text-left text-sm transition",
              picked ? "border-l-balkan bg-balkan/20 font-black text-balkan" : "border-l-transparent font-bold hover:bg-slate",
              !t && "cursor-default italic text-ash",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {t && <img src={t.image} alt="" className="size-5 object-cover" />}
            <span className="truncate">{t?.name ?? "TBD"}</span>
            {picked && <span className="ml-auto bg-balkan px-1 text-[0.55rem] font-black text-white">PICK</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function Pickems() {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const made = Object.keys(picks).length;
  const cols = [...bracket.winners, ...bracket.losers.slice(0, 2)];

  return (
    <Container className="max-w-[1400px]">
      <PageTitle accent="Pick'ems" right={<Tag tone="balkan" className="text-xs">Open until the first quarterfinal</Tag>}>
        Bracket
      </PageTitle>

      <div className="mb-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid grid-cols-5 border border-line">
          {POINTS.map(([k, v]) => (
            <div key={k} className="border-r border-line p-3 last:border-r-0">
              <div className="text-[0.6rem] font-black uppercase tracking-wide text-ash">{k}</div>
              <div className="num text-3xl text-balkan">
                {v}
                <span className="text-base text-ash"> pts</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 bg-paper p-4 text-ink">
          <div>
            <div className="text-[0.65rem] font-black uppercase text-rose">Your picks</div>
            <div className="num text-3xl">{made} / 15</div>
          </div>
          <SlantButton tone="balkan" className="ml-auto">Save picks</SlantButton>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-10">
          {cols.map((r) => (
            <div key={r.title}>
              <div className="mb-3 text-center text-sm font-black uppercase tracking-wider text-ash">{r.title}</div>
              <div className="flex flex-col justify-around gap-4" style={{ minHeight: 380 }}>
                {r.matches.map((m) => (
                  <PickCard key={m.id} m={m} pick={picks[m.id]} onPick={(id) => setPicks({ ...picks, [m.id]: id })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="heading-slam mb-4 mt-12 border-b border-rose pb-2 text-4xl">Leaderboard</h2>
      <div className="overflow-hidden border border-line">
        {pickemLeaderboard.map((e, i) => (
          <div key={e.userId} className="grid grid-cols-[64px_1fr_110px_90px_150px] items-center border-b border-line px-4 py-2.5 last:border-b-0">
            <span className={cn("num text-2xl", i === 0 ? "text-[#e8c547]" : i === 1 ? "text-[#c9ccd1]" : i === 2 ? "text-[#c98a4b]" : "text-ash")}>#{i + 1}</span>
            <span className="flex items-center gap-3 font-bold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.avatar} alt="" className="size-8" />
              {e.username}
            </span>
            <span className="num text-right text-2xl text-balkan">{e.score} pts</span>
            <span className="num text-right text-lg text-paper/70">{e.correct} ✓</span>
            <span className="text-right">
              <button className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-black uppercase text-rose hover:text-paper">
                <Lock className="size-3.5" /> View bracket
              </button>
            </span>
          </div>
        ))}
      </div>
    </Container>
  );
}
