import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlantBg, SlantButton } from "@/components/site/slant";
import { Countdown } from "@/components/site/countdown";
import { at } from "@/components/site/rich";
import { getFormat } from "@/db/edition";
import type { PoolStage } from "@/db/mappools";
import { getSheet } from "@/db/pool-sheet";
import { poolState, sheetBlocked } from "@/db/pool-settle";
import { safe } from "@/db/safe";
import type { Settings } from "@/db/settings";
import { userLink } from "@/db/viewer";
import { db } from "@/db";
import { users } from "@/db/schema";
import { avatarCol } from "@/db/avatar";
import { inArray, sql } from "drizzle-orm";
import { helperAccess } from "@/lib/authz";
import { helperView } from "@/lib/helper-sig";
import { HelperTiles } from "@/components/admin/helper-tiles";
import { Cascade } from "@/components/site/cascade";
import { Pfp } from "@/components/site/pfp";
import type { Match, Team } from "@/lib/data";
import { roundName, type Dict } from "@/lib/i18n/dict";
import { cardLabels, sourceLabel } from "@/lib/matches";
import { nameKey } from "@/lib/names";
import { ROLE_ICON } from "@/lib/role-icons";
import { can, type Role } from "@/lib/roles";
import { staffNames } from "@/lib/staff-names";
import { dayTime, fmtSofiaDay, fmtSofiaTime, toSofiaInput } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Card, Stat, label } from "./cards";

const DUTIES = [
  { role: "referee", field: "referee", href: "/admin/matches", menu: "matches" },
  { role: "streamer", field: "streamer", href: "/admin/stream", menu: "stream" },
  { role: "commentator", field: "commentators", href: null, menu: null },
] as const satisfies readonly { role: Role; field: keyof Match; href: string | null; menu: string | null }[];

export function RoleChip({ role, t, className }: { role: Role; t: Dict; className?: string }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className={cn("relative isolate inline-flex items-center gap-1.5 px-3 py-1 text-xs font-display font-bold text-paper", className)}>
      <SlantBg className="border border-line bg-field" />
      <Icon className="size-3.5 shrink-0 text-rose-hi" aria-hidden />
      {t.admin.roles[role]}
    </span>
  );
}

function TeamName({ team, fallback }: { team?: Team; fallback: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {team ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.image} alt="" className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="size-8 shrink-0 rounded-full bg-slate" />
      )}
      <span className={cn("min-w-0 truncate font-display font-black", !team && "text-ash")}>{team?.name ?? fallback}</span>
    </span>
  );
}

/** what a staff member has to do next: the matches they are on, the pool that is open for them. empty for title-only roles */
export async function staffCards({ t, lang, locale, me, roles, matches, teams, stages }: { t: Dict; lang: string; locale: string; me: number; roles: readonly Role[]; matches: Match[]; teams: Team[]; stages: PoolStage[]; settings: Settings }) {
  const f = getFormat();
  const out: React.ReactNode[] = [];
  const duties = DUTIES.filter((d) => roles.includes(d.role));

  if (duties.length) {
    const key = nameKey((await userLink(me))?.username ?? "");
    const mine = matches
      .filter((m) => m.winner === null && duties.some((d) => staffNames(m[d.field]).some((n) => nameKey(n) === key)))
      .sort((a, b) => (a.datetime ? Date.parse(a.datetime) : Infinity) - (b.datetime ? Date.parse(b.datetime) : Infinity));
    // commentators only matter to the people commentating
    const shown = DUTIES.filter((d) => d.role !== "commentator" || roles.includes("commentator"));
    const names = [...new Set(mine.flatMap((m) => shown.flatMap((d) => staffNames(m[d.field]).map(nameKey))))];
    const faces = new Map(
      (names.length ? await db.select({ username: users.username, avatar: avatarCol }).from(users).where(inArray(sql`lower(replace(${users.username}, ' ', '_'))`, names)) : []).map((u) => [nameKey(u.username), u.avatar]),
    );
    const links = duties.filter((d) => d.href);
    out.push(
      <Card key="matches" title={t.me.staff.matches} i={out.length} className="lg:col-span-2" body="pt-0">
        {mine.length === 0 ? (
          <p className="py-5 text-sm text-ash">{t.me.staff.noMatches}</p>
        ) : (
          <ul className="divide-y divide-line">
            {mine.map((m, n) => {
              const d = m.datetime ? new Date(m.datetime) : null;
              const crew = shown.map((x) => ({ role: x.role, names: staffNames(m[x.field]) })).filter((x) => x.names.length);
              return (
                <li key={m.id} className="in-left in-slow grid grid-cols-1 items-center gap-x-6 gap-y-3 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] xl:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,24rem)]" style={at(0.3, n, 0.1)}>
                  <div className="flex items-baseline gap-2.5 sm:block sm:border-r sm:border-line sm:pr-4">
                    <div className={cn("num text-2xl leading-none sm:text-3xl", !d && "text-ash")}>{d ? fmtSofiaTime(d) : t.common.tbd}</div>
                    {d && <div className="num whitespace-nowrap text-xs text-ash sm:mt-1.5">{fmtSofiaDay(d, locale)}</div>}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-display font-bold text-rose-hi">{cardLabels(f, t, m)[0]}</div>
                    <div className="mt-2 flex min-w-0 flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-3 sm:text-base">
                      <TeamName team={teams.find((x) => x.id === m.team1.id)} fallback={sourceLabel(f, t, m.id, 1)} />
                      <span className="heading-slam hidden text-xs text-ash sm:block">{t.common.vs}</span>
                      <TeamName team={teams.find((x) => x.id === m.team2.id)} fallback={sourceLabel(f, t, m.id, 2)} />
                    </div>
                  </div>
                  <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 sm:col-span-full xl:col-span-1">
                    {crew.map((x) => (
                      <div key={x.role} className="contents">
                        <dt className={label}>{t.admin.roles[x.role]}</dt>
                        <dd className="flex min-w-0 flex-wrap gap-x-3 gap-y-1.5">
                          {x.names.map((name) => (
                            <span key={name} className={cn("flex min-w-0 items-center gap-1.5 text-sm font-display font-bold", nameKey(name) === key ? "text-balkan-hi" : "text-paper/85")}>
                              <Pfp src={faces.get(nameKey(name))} className="size-6" />
                              <span className="min-w-0 truncate">{name}</span>
                            </span>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
        {links.length > 0 && (
          <div className="in-up in-slow flex flex-wrap gap-3 border-t border-line pt-4 sm:justify-end" style={at(0.4, mine.length, 0.1)}>
            {links.map((x) => (
              <SlantButton key={x.role} href={x.href!} tone="outline" className="flex-1 justify-center px-5 py-2.5 text-sm sm:flex-none">
                {t.admin.menu[x.menu!]} <ArrowRight className="size-4" />
              </SlantButton>
            ))}
          </div>
        )}
      </Card>,
    );
  }

  const access = helperAccess(roles);
  if (access.any) {
    const h = await helperView(me);
    out.push(
      <Card
        key="helper"
        title={t.admin.menu.helper}
        i={out.length}
        className="lg:col-span-2"
        right={
          <Link href="/admin/helper" className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-ash transition-colors hover:text-paper">
            {t.me.open} <ArrowRight className="size-3.5" />
          </Link>
        }
      >
        <Cascade className="[--d:0.35s]" step={0.08}>
          <HelperTiles t={t} locale={locale} h={h} referee={access.ref} streamer={access.stream} className="lg:grid-cols-3" />
        </Cascade>
      </Card>,
    );
  }

  const pool = can(roles, "poolVote") && !(await safe(() => sheetBlocked({ osuId: me, roles }), false)) ? await safe(() => poolState(), null) : null;
  if (pool) {
    const { open, next, done } = pool.access;
    const stage = stages.find((s) => s.slug === (open ?? next)?.stage);
    const name = stage ? roundName(t, stage.title) : "";
    const when = (d: Date) => dayTime(toSofiaInput(d), lang);
    let body: React.ReactNode;
    if (open && stage) {
      const sheet = await getSheet(stage.id, me, stage.blueprint);
      const slots = sheet.slots.filter((s) => !s.out);
      body = (
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="heading-slam text-3xl leading-none sm:text-4xl">{name}</div>
            <div className={cn(label, "mt-4")}>{t.me.staff.closes}</div>
            <div className="num mt-1 text-sm text-paper/80">{when(open.closes)}</div>
            <Countdown to={open.closes.toISOString()} className="mt-3" />
          </div>
          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <Stat k={t.me.staff.owed} n={<span className={sheet.owed ? "text-rose-hi" : undefined}>{sheet.owed}</span>} />
              {can(roles, "poolEdit") && <Stat k={t.me.staff.empty} n={slots.filter((s) => !s.items.length).length} />}
              <Stat k={t.me.staff.decided} n={`${slots.filter((s) => s.picked).length}/${slots.length}`} />
            </div>
            <SlantButton href="/admin/mappools/sheet" tone="paper" className="px-6 py-3 text-base">
              {t.me.staff.sheet} <ArrowRight className="size-4" />
            </SlantButton>
          </div>
        </div>
      );
    } else if (next && stage) {
      body = (
        <div>
          <div className={label}>{t.me.staff.opens(name)}</div>
          <div className="num mt-1 text-sm text-paper/80">{when(next.opens)}</div>
          <Countdown to={next.opens.toISOString()} className="mt-3" />
        </div>
      );
    } else {
      body = <p className="text-sm text-ash">{done ? t.me.staff.poolDone : t.me.staff.poolNone}</p>;
    }
    out.push(
      <Card key="pool" title={t.me.staff.pool} i={out.length} className="lg:col-span-2">
        {body}
      </Card>,
    );
  }
  return out;
}
