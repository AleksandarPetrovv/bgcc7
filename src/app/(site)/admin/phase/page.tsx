import { forbidden } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { Tag } from "@/components/site/page";
import { ActionForm, DateTimeField, Panel } from "@/components/admin/form";
import { getSettings } from "@/db/settings";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { TIMELINE_KEYS } from "@/lib/sections";
import { addDays, toSofiaInput } from "@/lib/time";
import { phaseStates } from "@/lib/dates";
import { setTimeline } from "@/actions/phase";
import { isBGCC6 } from "@/db";
import { getFormat } from "@/db/edition";
import { matchWeeks, weekCloses } from "@/db/schedule";
import { poolState } from "@/db/pool-settle";
import { weekNums } from "@/lib/format";
import { roundName } from "@/lib/i18n/dict";
import { localeOf } from "@/lib/i18n/locale";
import { DEADLINE, pointLabel } from "@/lib/schedule";
import { cn, cssVars } from "@/lib/utils";
import { setWeeks } from "../scheduling/actions";
import { PhasePicker } from "./phase-picker";
import { WeekGuard } from "./week-guard";

const cols = "lg:grid-cols-[1fr_auto_auto] lg:gap-3";
const rowCls = cn("in-left grid grid-cols-1 items-center gap-2 px-3 py-2", cols);
const pickCls = "w-full lg:w-[16rem]";
const headCls = "text-[0.68rem] font-display font-bold text-ash";
const rowAt = (i: number, d = "0.85s") => cssVars({ "--i": i, "--s": "0.06s", "--d": d });
// the form's own button row, last in its intro so it never shows before the rows above it
const saveIntro = "[&>div:last-child]:animate-[k-up_0.7s_var(--ease)_1.35s_backwards] motion-reduce:[&>div:last-child]:animate-none";

// what the two picker columns hold: above them on wide screens, above each picker once the row stacks
function Heads({ a, b, d }: { a: string; b: string; d: string }) {
  return (
    <div className={cn("in-fade hidden px-3 pb-1.5 lg:grid", cols, headCls)} style={cssVars({ "--d": d })}>
      <span />
      <span className={cn(pickCls, "pl-4")}>{a}</span>
      <span className={cn(pickCls, "pl-4")}>{b}</span>
    </div>
  );
}

function Pick({ head, ...props }: { head?: string } & React.ComponentProps<typeof DateTimeField>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {head && <span className={cn(headCls, "lg:hidden")}>{head}</span>}
      <DateTimeField {...props} className={pickCls} />
    </div>
  );
}

export default async function AdminPhase() {
  const [t, lang, s, viewer, weeks, closes, pools] = await Promise.all([getDict(), getLang(), getSettings(), getViewer(), matchWeeks(), weekCloses(), poolState()]);
  if (!can(viewer?.roles, "phase")) forbidden();
  const row = (k: string) => s.timeline.find((e) => e.key === k);
  const states = phaseStates(s.timeline, s.phase);
  const format = getFormat();
  const nums = weekNums(format);
  // reversed so a stage takes its first (winners) round's name
  const stageNames = Object.fromEntries(Object.values(format.rounds).map((r) => [r.stage, roundName(t, r.name)]).reverse());

  return (
    <>
      <PageTitle mark="timeline">{t.admin.menu.phase}</PageTitle>
      <div className="grid grid-cols-1 gap-6">
        <Panel title={t.admin.phaseNow} help={t.admin.phaseHelp} i={0}>
          <PhasePicker phase={s.phase} />
        </Panel>

        {nums.length > 0 && can(viewer?.roles, "host") && (
          <Panel title={t.admin.matchWeeks} help={t.admin.matchWeeksHelp(pointLabel(localeOf(lang), DEADLINE))} i={1}>
            <ActionForm action={setWeeks} className={cn("space-y-4", saveIntro)}>
              <div>
                <Heads a={t.admin.weekCol} b={t.admin.closesCol} d="0.6s" />
                <div className="divide-y divide-line border border-line">
                  {nums.map((n, i) => (
                    <div key={n} style={rowAt(i, "0.65s")} className={rowCls}>
                      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm font-display font-bold">
                        {t.sched.admin.weekTitle(n)}
                        <span className="min-w-0 truncate text-xs font-semibold text-ash">{[...new Set(Object.values(format.rounds).filter((r) => r.week === n).map((r) => roundName(t, r.name)))].join(", ")}</span>
                      </span>
                      <Pick head={t.admin.weekCol} kind="date" name={`week.${n}`} defaultValue={weeks[n] ?? ""} aria-label={`${t.sched.admin.weekTitle(n)} · ${t.admin.weekCol}`} />
                      <Pick head={t.admin.closesCol} kind="date" name={`closes.${n}`} defaultValue={closes[n] ?? (weeks[n] ? addDays(weeks[n], DEADLINE.day) : "")} aria-label={`${t.sched.admin.weekTitle(n)} · ${t.admin.closesCol}`} />
                    </div>
                  ))}
                </div>
              </div>
              <WeekGuard weeks={weeks} rounds={format.rounds} settled={[...pools.settled]} names={stageNames} />
            </ActionForm>
          </Panel>
        )}

        <Panel title={t.admin.timeline} help={t.admin.timelineHelp} i={2}>
          <ActionForm action={setTimeline} className={cn("space-y-4", saveIntro)}>
            <div>
              <Heads a={t.admin.start} b={t.admin.end} d="0.8s" />
              <div className="divide-y divide-line border border-line">
                {TIMELINE_KEYS.map((k, i) => (
                  <div key={k} style={rowAt(i)} className={rowCls}>
                    <span className="flex items-center gap-2 text-sm font-display font-bold">
                      {t.timeline[k]}
                      <span aria-hidden={states[i] !== "now"} className={cn("in-fade transition-opacity duration-300 [--d:1.15s]", states[i] === "now" ? "opacity-100" : "opacity-0")}>
                        <Tag>{t.admin.current}</Tag>
                      </span>
                    </span>
                    {k === "done" ? (
                      // one day, centred under both columns (each row is its own grid, so the span is given their width)
                      <div className="lg:col-span-2 lg:flex lg:w-[32.75rem] lg:justify-center">
                        <Pick kind="date" name={`from.${k}`} defaultValue={row(k)?.from ?? ""} aria-label={t.timeline[k]} />
                      </div>
                    ) : (
                      <>
                        <Pick head={t.admin.start} kind="date" name={`from.${k}`} defaultValue={row(k)?.from ?? ""} aria-label={`${t.timeline[k]} · ${t.admin.from}`} />
                        <Pick head={t.admin.end} kind="date" name={`to.${k}`} defaultValue={row(k)?.to ?? ""} aria-label={`${t.timeline[k]} · ${t.admin.to}`} />
                      </>
                    )}
                  </div>
                ))}
                {isBGCC6() && (
                  <div style={rowAt(TIMELINE_KEYS.length)} className={rowCls}>
                    <span className="text-sm font-display font-bold">{t.admin.booking}</span>
                    <Pick head={t.admin.start} name="bookingOpensAt" defaultValue={toSofiaInput(s.bookingOpensAt)} aria-label={t.admin.bookingOpens} />
                    <Pick head={t.admin.end} name="bookingClosesAt" defaultValue={toSofiaInput(s.bookingClosesAt)} aria-label={t.admin.bookingCloses} />
                  </div>
                )}
              </div>
            </div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
