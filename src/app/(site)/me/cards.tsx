import Link from "next/link";
import { ArrowRight, Crown, Flag } from "lucide-react";
import { Glyph } from "@/components/site/graphics";
import { Avatar } from "@/components/site/avatar";
import { RecordText } from "@/components/site/record";
import type { Dict } from "@/lib/i18n/dict";
import { flagUrl, fmtNum, teamHref, type Team } from "@/lib/data";
import { osuUser } from "@/lib/links";
import { cn } from "@/lib/utils";

export const v = (o: Record<string, string | number>) => o as React.CSSProperties;
export const label = "text-[0.65rem] font-display font-bold text-ash";

export function Card({ title, children, className, i = 0, right, flush }: { title: string; children: React.ReactNode; className?: string; i?: number; right?: React.ReactNode; flush?: boolean }) {
  return (
    <section className={cn("in-up relative overflow-hidden border border-line bg-coal", className)} style={v({ "--i": i, "--s": "0.08s", "--d": "0.2s" })}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-4 pb-1 pt-4 sm:px-5">
        <Glyph kind="ring" className="size-3" />
        <h2 className="heading-slam text-lg">{title}</h2>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className={flush ? "pt-3" : "p-4 pt-3 sm:p-5 sm:pt-3"}>{children}</div>
    </section>
  );
}

export function Stat({ k, n, className }: { k: string; n: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border-l-2 border-line pl-3", className)}>
      <div className={label}>{k}</div>
      <div className="num mt-1 text-2xl leading-none sm:text-3xl">{n}</div>
    </div>
  );
}

export function PlayerLink({ id, name, className }: { id: number; name: string; className?: string }) {
  return (
    <a href={osuUser(id)} target="_blank" rel="noreferrer" className={cn("transition-colors hover:text-rose-hi", className)}>
      {name}
    </a>
  );
}

export function TeamCard({ t, team, me, seeds, record, i }: { t: Dict; team: Team; me: number; seeds: Map<number, number>; record?: [number, number]; i?: number }) {
  const avg = Math.round(team.players.reduce((n, p) => n + p.rank, 0) / Math.max(1, team.players.length));
  return (
    <Card title={t.me.team} i={i} flush>
      <div className="relative mx-4 flex items-center gap-3 overflow-hidden border border-line bg-ink p-3 sm:mx-5 sm:gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-15 blur-md" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="relative size-12 shrink-0 object-cover sm:size-16" />
        <div className="relative min-w-0 flex-1">
          <div className="heading-slam break-words text-lg leading-tight sm:text-2xl">{team.name}</div>
          <div className="num mt-1 flex flex-wrap gap-x-3 text-sm text-paper/70 sm:gap-x-4">
            <span>{t.me.seed(team.seed)}</span>
            {record && <RecordText t={t} w={record[0]} l={record[1]} />}
            <span>
              {t.me.avgRank} #{fmtNum(avg)}
            </span>
          </div>
        </div>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {team.players.map((p) => (
          <li key={p.userId} className="flex items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-5">
            <Avatar src={p.avatar} className="size-8 sm:size-9" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(p.country)} alt="" className="h-3" />
            <PlayerLink id={p.userId} name={p.username} className={cn("min-w-0 truncate font-display font-black", p.userId === me && "text-balkan-hi")} />
            {p.userId === me && <span className="text-[0.6rem] font-display font-bold text-ash">{t.me.you}</span>}
            {p.isCaptain && <Crown className="size-3.5 shrink-0 text-gold-hi" aria-label={t.common.captain} />}
            <span className="ml-auto flex shrink-0 gap-4 text-right">
              <span>
                <span className={cn(label, "block")}>{t.me.globalRank}</span>
                <span className="num text-sm text-paper/80">#{fmtNum(p.rank)}</span>
              </span>
              {seeds.has(p.userId) && (
                <span className="w-10">
                  <span className={cn(label, "block")}>{t.me.playerSeed}</span>
                  <span className="num text-sm text-paper/80">{seeds.get(p.userId)}</span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-4 py-3 sm:px-5">
        <Link href={teamHref(team)} className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-ash transition-colors hover:text-paper">
          {t.me.teamPage} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

export function Side({ team, flip, fallback }: { team?: Team; flip?: boolean; fallback?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4", flip && "items-end text-right sm:flex-row-reverse")}>
      {team ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.image} alt="" className="size-14 shrink-0 object-cover sm:size-20" />
      ) : (
        <span className="size-14 shrink-0 border border-dashed border-line sm:size-20" />
      )}
      <div className="min-w-0">
        <div className="heading-slam line-clamp-2 break-words text-sm leading-tight sm:text-2xl">{team?.name ?? fallback}</div>
        {team && (
          <div className={cn("mt-1.5 hidden flex-wrap sm:flex gap-x-3 gap-y-1 text-sm text-paper/70", flip && "justify-end")}>
            {team.players.map((p) => (
              <PlayerLink key={p.userId} id={p.userId} name={p.username} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Info({ icon: Icon, k, n }: { icon: typeof Flag; k: string; n: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3">
      <Icon className="size-4 shrink-0 text-rose-hi" />
      <div className="min-w-0">
        <div className={label}>{k}</div>
        <div className="truncate text-sm font-display font-black">{n}</div>
      </div>
    </div>
  );
}
