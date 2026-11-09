import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { ActionForm, DateTimeField, Panel } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { getMatchRows, getTeams } from "@/db/tournament";
import { historyOf, matchWeeks } from "@/db/schedule";
import { refScope } from "@/lib/match-access";
import { getDict, getLang } from "@/lib/i18n/server";
import { fmtSofia, toSofiaInput } from "@/lib/time";
import { historyLabel, isOpen, weekOf } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Cascade } from "@/components/site/cascade";
import { setTime, setWeek } from "./actions";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";
import { weekNum, weekNums } from "@/lib/format";
import { SlantBg } from "@/components/site/slant";
import { getFormat } from "@/db/edition";
import { matchLabel } from "@/lib/matches";
import { ChevronDown } from "lucide-react";

const TONE: Record<string, { bar: string; chip: string; ink: string }> = {
  agreed: { bar: "bg-balkan", chip: "bg-balkan", ink: "text-on-fill" },
  staff: { bar: "bg-rose", chip: "bg-rose", ink: "text-white" },
  proposed: { bar: "bg-gold", chip: "bg-gold", ink: "text-on-fill" },
  tbd: { bar: "bg-line", chip: "border border-line", ink: "text-ash" },
  waiting: { bar: "bg-line", chip: "border border-line", ink: "text-ash" },
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
      <span data-cascade className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2.5", side === 1 ? "in-right flex-row-reverse text-right" : "in-left")}>
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
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-3 pl-4 pr-3 sm:gap-3 sm:pl-5 sm:pr-4">
                  <Side id={m.team1Id} side={0} />
                  <span data-cascade className="in-pop heading-slam text-sm text-ash sm:text-lg">VS</span>
                  <Side id={m.team2Id} side={1} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-2.5 pl-5 pr-4 sm:grid sm:grid-cols-[1fr_auto_1fr]">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span data-cascade className="in-up num text-base font-display font-bold">
                      {m.startsAt ? fmtSofia(m.startsAt, locale) : pend ? fmtSofia(new Date(pend.at), locale) : "—"}
                      {!m.startsAt && pend && <span className="ml-2 text-xs text-ash">{name(pend.teamId)}</span>}
                    </span>
                  </div>
                  <span data-cascade className="in-up mx-auto text-center text-xs font-display font-bold text-ash">{matchLabel(format, t, m.id)}</span>
                  <span data-cascade className="in-pop ml-auto">
                    <span className={cn("relative isolate inline-flex px-2.5 py-1 text-[0.68rem] font-display font-bold", TONE[state].ink)}>
                      <SlantBg className={TONE[state].chip} />
                      {s.admin.state[state]}
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
