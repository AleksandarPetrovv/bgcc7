import Link from "next/link";
import { ArrowRight, Crown, Flag } from "lucide-react";
import { Avatar } from "@/components/site/avatar";
import { RecordText } from "@/components/site/record";
import type { Dict } from "@/lib/i18n/dict";
import { flagUrl, fmtNum, teamHref, type Team } from "@/lib/data";
import { osuUser } from "@/lib/links";
import { cn } from "@/lib/utils";
import { at } from "@/components/site/rich";

export const v = (o: Record<string, string | number>) => o as React.CSSProperties;
const pct = (a?: number | null) => (a == null ? "—" : `${(a * 100).toFixed(2)}%`);
export const label = "text-[0.65rem] font-display font-bold text-ash";

// no box: a heading over a rule like the home sections, the content sits straight on the page
function Heading({ children, right, className }: { children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line pb-3", className)}>
      <span className="size-2 shrink-0 rotate-45 bg-rose" aria-hidden />
      <h2 className="heading-slam text-2xl sm:text-3xl">{children}</h2>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

export function Card({ title, children, className, i = 0, right, body }: { title: string; children: React.ReactNode; className?: string; i?: number; right?: React.ReactNode; body?: string }) {
  return (
    <section className={cn("in-up in-slow relative min-w-0", className)} style={v({ "--i": i, "--s": "0.12s", "--d": "0s", "--cd": `${i * 0.12}s` })}>
      <Heading right={right}>{title}</Heading>
      <div className={cn("pt-4", body)}>{children}</div>
    </section>
  );
}

export function Stat({ k, n, className }: { k: string; n: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border-l border-line pl-3", className)}>
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

type PStat = { cost: number | null; acc: number | null };

export function TeamCard({ t, team, me, seeds, stats, record, i, className }: { t: Dict; team: Team; me: number; seeds: Map<number, number>; stats?: Map<number, PStat>; record?: [number, number]; i?: number; className?: string }) {
  const wipe = v({ "--d": "calc(var(--cd, 0s) + 0.4s)" });
  return (
    <Card title={t.me.team} i={i} className={className}>
      <div className="in-up in-slow relative flex items-center gap-3 overflow-hidden py-2 sm:gap-4" style={at(0.2)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="relative size-12 shrink-0 object-cover sm:size-16" />
        <div className="relative min-w-0 flex-1">
          <div className="heading-slam break-words text-lg leading-tight sm:text-2xl">{team.name}</div>
          <div className="num mt-1 flex flex-wrap gap-x-3 text-sm text-paper/70 sm:gap-x-4">
            <span>{t.me.seed(team.seed)}</span>
            {record && <RecordText t={t} w={record[0]} l={record[1]} />}
            <span>
              {t.me.avgRank} #{fmtNum(team.avgRank)}
            </span>
          </div>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {team.players.map((p, n) => (
          <li key={p.userId} className="in-left in-slow flex flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2.5 sm:flex-nowrap sm:gap-3" style={at(0.45, n, 0.12)}>
            <Avatar src={p.avatar} className="size-8 sm:size-9" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(p.country)} alt="" className="h-3" />
            <PlayerLink id={p.userId} name={p.username} className={cn("min-w-0 truncate font-display font-black", p.userId === me && "text-balkan-hi")} />
            {p.isCaptain && <Crown className="size-3.5 shrink-0 text-gold-hi" aria-label={t.common.captain} />}
            <span className="ml-auto flex shrink-0 basis-full justify-end gap-3 text-right sm:basis-auto sm:gap-4">
              <span>
                <span className={cn(label, "in-wipe block")} style={wipe}>{t.me.globalRank}</span>
                <span className="num text-sm text-paper/80">#{fmtNum(p.rank)}</span>
              </span>
              {seeds.has(p.userId) && (
                <span className="w-10">
                  <span className={cn(label, "in-wipe block")} style={wipe}>{t.me.playerSeed}</span>
                  <span className="num text-sm text-paper/80">{seeds.get(p.userId)}</span>
                </span>
              )}
              {stats && (
                <>
                  <span>
                    <span className={cn(label, "in-wipe block")} style={wipe}>{t.me.playerCost}</span>
                    <span className="num text-sm text-paper/80">{stats.get(p.userId)?.cost?.toFixed(2) ?? "—"}</span>
                  </span>
                  <span>
                    <span className={cn(label, "in-wipe block")} style={wipe}>{t.me.playerAcc}</span>
                    <span className="num text-sm text-paper/80">{pct(stats.get(p.userId)?.acc)}</span>
                  </span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="in-up in-slow border-t border-line pt-3" style={at(0.6, team.players.length, 0.12)}>
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

export function Info({ icon: Icon, k, n, i = 0 }: { icon: typeof Flag; k: string; n: string; i?: number }) {
  return (
    <div className="in-up in-slow flex min-w-0 items-center gap-3 py-3 pr-4" style={at(0.85, i, 0.12)}>
      <Icon className="size-4 shrink-0 text-rose-hi" />
      <div className="min-w-0">
        <div className={label}>{k}</div>
        <div className="truncate text-sm font-display font-black">{n}</div>
      </div>
    </div>
  );
}
