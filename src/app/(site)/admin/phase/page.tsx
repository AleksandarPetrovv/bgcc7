import { forbidden } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { Tag } from "@/components/site/page";
import { ActionForm, DateTimeField, Panel } from "@/components/admin/form";
import { getSettings } from "@/db/settings";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { TIMELINE_KEYS } from "@/lib/sections";
import { toSofiaInput } from "@/lib/time";
import { phaseStates } from "@/lib/dates";
import { setTimeline } from "@/actions/phase";
import { isBGCC6 } from "@/db";
import { discordReady } from "@/lib/discord";
import { cn, cssVars } from "@/lib/utils";
import { PhasePicker } from "./phase-picker";

const rowCls = "in-left grid grid-cols-1 items-center gap-2 px-3 py-2 lg:grid-cols-[1fr_auto_auto] lg:gap-3";
const pickCls = "w-full lg:w-[16rem]";
const rowAt = (i: number) => cssVars({ "--i": i, "--s": "0.06s", "--d": "0.85s" });
// the form's own button row, last in its intro so it never shows before the rows above it
const saveIntro = "[&>div:last-child]:animate-[k-up_0.7s_var(--ease)_1.35s_backwards] motion-reduce:[&>div:last-child]:animate-none";

export default async function AdminPhase() {
  const [t, s, viewer] = await Promise.all([getDict(), getSettings(), getViewer()]);
  if (!can(viewer?.roles, "phase")) forbidden();
  const row = (k: string) => s.timeline.find((e) => e.key === k);
  const states = phaseStates(s.timeline, s.phase);

  return (
    <>
      <PageTitle mark="timeline">{t.admin.menu.phase}</PageTitle>
      <div className="grid grid-cols-1 gap-6">
        <Panel title={t.admin.phaseNow} help={t.admin.phaseHelp} i={0}>
          <PhasePicker phase={s.phase} canCleanup={can(viewer?.roles, "discord") && discordReady()} />
        </Panel>

        <Panel title={t.admin.timeline} help={t.admin.timelineHelp} i={2}>
          <ActionForm action={setTimeline} className={cn("space-y-4", saveIntro)}>
            <div className="divide-y divide-line border border-line">
              {TIMELINE_KEYS.map((k, i) => (
                <div key={k} style={rowAt(i)} className={rowCls}>
                  <span className="flex items-center gap-2 text-sm font-display font-bold">
                    {t.timeline[k]}
                    <span aria-hidden={states[i] !== "now"} className={cn("in-fade transition-opacity duration-300 [--d:1.15s]", states[i] === "now" ? "opacity-100" : "opacity-0")}>
                      <Tag>{t.admin.current}</Tag>
                    </span>
                  </span>
                  {k === "reg" ? (
                    <>
                      <DateTimeField name="regOpensAt" defaultValue={toSofiaInput(s.regOpensAt)} aria-label={t.admin.regOpens} className={pickCls} />
                      <DateTimeField name="regClosesAt" defaultValue={toSofiaInput(s.regClosesAt)} aria-label={t.admin.regCloses} className={pickCls} />
                    </>
                  ) : (
                    <>
                      <DateTimeField kind="date" name={`from.${k}`} defaultValue={row(k)?.from ?? ""} aria-label={`${t.timeline[k]} · ${t.admin.from}`} className={pickCls} />
                      <DateTimeField kind="date" name={`to.${k}`} defaultValue={row(k)?.to ?? ""} aria-label={`${t.timeline[k]} · ${t.admin.to}`} className={pickCls} />
                    </>
                  )}
                </div>
              ))}
              {isBGCC6() && (
                <div style={rowAt(TIMELINE_KEYS.length)} className={rowCls}>
                  <span className="text-sm font-display font-bold">{t.admin.booking}</span>
                  <DateTimeField name="bookingOpensAt" defaultValue={toSofiaInput(s.bookingOpensAt)} aria-label={t.admin.bookingOpens} className={pickCls} />
                  <DateTimeField name="bookingClosesAt" defaultValue={toSofiaInput(s.bookingClosesAt)} aria-label={t.admin.bookingCloses} className={pickCls} />
                </div>
              )}
            </div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
