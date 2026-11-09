import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { ActionForm, DateTimeField, Panel } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { getMatchRows, getTeams } from "@/db/tournament";
import { historyOf, matchWeeks } from "@/db/schedule";
import { refScope } from "@/lib/match-access";
import { getDict, getLang } from "@/lib/i18n/server";
import { dayTime, fmtSofia, toSofiaInput } from "@/lib/time";
import { historyLabel, isOpen, weekOf } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Cascade } from "@/components/site/cascade";
import { setTime, setWeek } from "./actions";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";
import { weekNum, weekNums } from "@/lib/format";
import { SlantBg } from "@/components/site/slant";
import { RuleDiamond } from "@/components/site/rule";
import { getFormat } from "@/db/edition";
import { matchLabel } from "@/lib/matches";
import { CalendarClock, ChevronDown } from "lucide-react";

// state colour: the card's left bar and the state badge's outline
const TONE: Record<string, { bar: string; edge: string }> = {
  agreed: { bar: "bg-balkan", edge: "border-balkan" },
  staff: { bar: "bg-rose", edge: "border-rose" },
  proposed: { bar: "bg-gold", edge: "border-gold" },
  tbd: { bar: "bg-line", edge: "border-line" },
  waiting: { bar: "bg-line", edge: "border-line" },
};

export default async function AdminScheduling() {
  const [t, lang, scope, all, teams, weeks] = await Promise.all([getDict(), getLang(), refScope(), getMatchRows(), getTeams(), matchWeeks()]);
  if (!scope) notFound();
  const rows = all.filter((m) => scope.runs(m.referee));
  const s = t.sched;
  const format = getFormat();
  const locale = localeOf(lang);
  const name = (id: string | null) => teams.find((x) => x.id === id)?.name ?? "—";
  const captain = (osuId: number | null) => (osuId == null ? s.staffName : (teams.flatMap((x) => x.players).find((p) => p.userId === osuId)?.username ?? s.staffName));
  const hist = await historyOf(rows.map((m) => m.id));
  // a week shows until every match in it is played; refs only see weeks they run a match in
  const list = weekNums(format).filter((n) => {
    const inWeek = all.filter((m) => weekNum(format, m.id) === n);
    return inWeek.some((m) => !m.winner) && (scope.host || rows.some((m) => weekNum(format, m.id) === n));
  });
  const Side = ({ id, side }: { id: string | null; side: 0 | 1 }) => {
    const team = teams.find((x) => x.id === id);
    return (
      <span data-cascade className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2.5", side === 0 ? "in-left flex-row-reverse text-right" : "in-right")}>
        {team?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.image} alt="" className="size-7 shrink-0 rounded-full object-cover sm:size-9" />
        ) : (
          <span className="size-7 shrink-0 rounded-full bg-slate sm:size-9" />
        )}
        <span className={cn("min-w-0 truncate text-sm font-display font-black sm:text-base", !team && "text-ash")}>{team?.name ?? t.common.tbd}</span>
      </span>
    );
  };

  return (
    <>
      <PageTitle mark="clock">{t.admin.menu.scheduling}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">{s.admin.help}</p>
      <Cascade className="space-y-8" step={0.035}>
        {!list.length && <p data-cascade className="in-up text-sm font-bold text-ash">{t.admin.stream.none}</p>}
        {list.map((wn, n) => {
          const wk = weekOf(weeks[wn]);
          const at = (m: (typeof rows)[number]) => {
            const p = hist.get(m.id)?.find((x) => x.status === "pending");
            return m.startsAt?.getTime() ?? (p ? new Date(p.at).getTime() : Infinity);
          };
          const ms = rows.filter((m) => weekNum(format, m.id) === wn && !m.winner && m.team1Id && m.team2Id).sort((a, b) => at(a) - at(b));
          const groups = [
            { key: "pending", open: true, list: ms.filter((m) => !m.startsAt) },
            { key: "agreed", open: false, list: ms.filter((m) => m.startsAt) },
          ].filter((g) => g.list.length);
          const card = (m: (typeof rows)[number]) => {
            const h = hist.get(m.id) ?? [];
            const pend = h.find((p) => p.status === "pending");
            const state = !m.startsAt ? (!isOpen(wk) ? "staff" : pend ? "proposed" : "tbd") : "agreed";
            return (
              <div key={m.id} data-cascade className="in-up relative border border-line bg-ink/40">
                <span className={cn("absolute inset-y-0 left-0 w-1", TONE[state].bar)} aria-hidden />
                {/* equal side columns and a fixed-width middle keep the teams centred in the row */}
                <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                  <span data-cascade className="in-left min-w-0 truncate text-xs font-display font-bold text-ash">{matchLabel(format, t, m.id)}</span>
                  <div className="order-last col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:order-none md:col-span-1 md:w-[22rem] xl:w-[28rem]">
                    <Side id={m.team1Id} side={0} />
                    <span data-cascade className="in-pop heading-slam w-8 text-center text-sm text-ash sm:text-lg">{t.common.vs}</span>
                    <Side id={m.team2Id} side={1} />
                  </div>
                  {/* on the line below the teams, under the VS */}
                  <RuleDiamond />
                  <span data-cascade className={cn("in-right num flex min-w-0 items-center justify-end gap-1.5 text-right text-xs", m.startsAt ? "text-paper/85" : "text-ash")}>
                    {(m.startsAt || pend) && <CalendarClock className="size-3.5 shrink-0 text-ash" />}
                    <span className="min-w-0 truncate">
                      {m.startsAt ? dayTime(toSofiaInput(m.startsAt), lang) : pend ? dayTime(toSofiaInput(new Date(pend.at)), lang) : t.common.tbd}
                      {!m.startsAt && pend && <span className="ml-2">· {name(pend.teamId)}</span>}
                    </span>
                  </span>
                </div>
                {h.length > 0 && (
                  <details className="border-t border-line pl-5 pr-4">
                    <summary className="cursor-pointer list-none py-2 text-xs font-display font-bold text-ash hover:text-paper [&::-webkit-details-marker]:hidden">{s.admin.history(h.length)}</summary>
                    <ol className="grid gap-1 pb-3 text-xs text-ash">
                      {h.slice(0, 6).map((p) => (
                        <li key={p.id} className="flex flex-wrap gap-x-2">
                          <span className="num">{fmtSofia(new Date(p.at), locale)}</span>
                          <span className="text-paper/85">{name(p.teamId)}</span>
                          <span className="font-display font-bold">{historyLabel(p, s.st, captain)}</span>
                          {p.note && <span className="basis-full italic">“{p.note}”</span>}
                          {p.reply && <span className="basis-full italic text-rose-hi/80">↳ “{p.reply}”</span>}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
                <ActionForm action={setTime.bind(null, m.id)} className="flex flex-wrap items-end gap-3 border-t border-line py-3 pl-5 pr-4" submit={s.admin.set} ghost>
                  <label className={labelCls}>
                    {s.admin.at}
                    <DateTimeField name="at" defaultValue={toSofiaInput(m.startsAt)} className="w-[25rem]" />
                  </label>
                  <span data-cascade className="in-pop relative isolate order-last ml-auto inline-flex min-h-10 items-center px-3.5 text-xs font-display font-bold text-paper">
                    <SlantBg className={cn("border", TONE[state].edge)} />
                    {s.admin.state[state]}
                  </span>
                </ActionForm>
              </div>
            );
          };
          return (
            <Panel key={wn} i={n < 3 ? n + 1 : 0} title={`${s.admin.weekTitle(wn)} · ${[...new Set(Object.values(format.rounds).filter((r) => r.week === wn).map((r) => roundName(t, r.name)))].join(", ")}`} help={wk ? s.admin.deadline(fmtSofia(wk.deadline, locale)) : undefined}>
              {scope.host && (
                <ActionForm action={setWeek.bind(null, wn)} className="mb-6 flex flex-wrap items-end gap-3" ghost>
                  <label className={labelCls}>
                    {s.admin.week}
                    <DateTimeField kind="date" name="week" defaultValue={weeks[wn] ?? ""} className="w-[18rem]" />
                  </label>
                </ActionForm>
              )}
              {groups.length ? (
                <div className="space-y-6">
                  {groups.map((g) => (
                    <details key={g.key} open={g.open} data-cascade className="in-up group/seed">
                      <summary className="group/sum flex cursor-pointer list-none items-center gap-3 border-b border-line pb-2.5 [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-display font-black text-paper">{s.admin.groups[g.key]}</span>
                        <span className="num text-xs text-ash">{g.list.length}</span>
                        <span className="relative isolate ml-auto grid size-8 shrink-0 place-items-center text-ash transition-colors group-hover/sum:text-paper group-open/seed:text-white">
                          <SlantBg className="border border-line transition-colors group-hover/sum:border-paper/40 group-open/seed:border-rose group-open/seed:bg-rose" />
                          <ChevronDown className="size-4 transition-transform duration-300 group-open/seed:rotate-180" aria-hidden />
                        </span>
                      </summary>
                      <div className="space-y-3 pt-3">{g.list.map(card)}</div>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ash">{s.admin.none}</p>
              )}
            </Panel>
          );
        })}
      </Cascade>
    </>
  );
}
