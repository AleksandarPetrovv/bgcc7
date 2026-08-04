import Link from "next/link";
import { Link2 } from "lucide-react";
import { type Match, teamById, fmtNum } from "@/lib/data";
import { cn } from "@/lib/utils";

function when(dt: string | null) {
  if (!dt) return { date: "TBD", time: "--:--" };
  const [d, t] = dt.split(" ");
  const [dd, mm, yyyy] = d.split("/").map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  const label = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", weekday: "short" }).toUpperCase();
  return { date: label, time: t };
}

function Side({ id, name, flip }: { id: string; name: string; flip?: boolean }) {
  const team = teamById(id);
  return (
    <div className={cn("flex min-w-0 flex-1 items-stretch", flip && "flex-row-reverse")}>
      <div className="hidden w-28 shrink-0 overflow-hidden bg-ink md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {team && <img src={team.image} alt="" className="size-full object-cover" />}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col justify-center bg-paper px-2.5 py-3 text-ink sm:px-4", flip && "items-end text-right")}>
        {team ? (
          <Link href={`/teams/${team.id}`} className="block max-w-full truncate text-base font-black leading-tight hover:text-rose-hi sm:text-xl lg:text-2xl">
            {team.name}
          </Link>
        ) : (
          <span className="text-xl font-black text-ink/35">{name}</span>
        )}
        {team && (
          <div className="mt-1 hidden gap-3 text-[0.65rem] font-semibold uppercase text-rose-hi sm:flex">
            <span>
              Seed <span className="num text-base text-ink">{team.seed}</span>
            </span>
            <span>
              Avg rank <span className="num text-base text-ink">{fmtNum(team.avgRank)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MatchRow({ match }: { match: Match }) {
  const w = when(match.datetime);
  const played = match.winner !== null;
  return (
    <div className="flex items-stretch border border-line">
      <div className="flex w-20 shrink-0 flex-col items-center justify-center px-1 py-3 text-center sm:w-36">
        <span className="text-xs font-black text-rose-hi">{match.id}</span>
        <span className="num text-sm text-paper/80">{w.date}</span>
        <span className="num text-2xl leading-none sm:text-4xl">{w.time}</span>
        <span className="text-[0.6rem] font-black text-rose-hi">EET</span>
      </div>
      <Side id={match.team1.id} name={match.team1.name} />
      <div className="flex w-11 shrink-0 flex-col items-center justify-between bg-ink py-3 text-paper sm:w-14">
        <span className="heading-slam text-lg text-rose-hi sm:text-2xl">VS</span>
        <span className="num text-lg sm:text-2xl">{played ? `${match.team1.score}-${match.team2.score}` : ""}</span>
      </div>
      <Side id={match.team2.id} name={match.team2.name} flip />
      <a
        href={match.link ?? "#"}
        target="_blank"
        rel="noreferrer"
        aria-label="Match link"
        className="hidden w-16 shrink-0 items-center justify-center text-rose-hi hover:text-paper sm:flex"
      >
        <span className="bg-rose p-1.5 text-white">
          <Link2 className="size-4" />
        </span>
      </a>
    </div>
  );
}
