import { notFound } from "next/navigation";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
import { getSettings } from "@/db/settings";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { PHASES, SECTIONS, TIMELINE_KEYS } from "@/lib/sections";
import { toSofiaInput } from "@/lib/time";
import { cn } from "@/lib/utils";
import { setDates, setPhase, setSections, setTimeline } from "./actions";

const check = "size-4 shrink-0 accent-rose";

export default async function AdminPhase() {
  const [t, s, viewer] = await Promise.all([getDict(), getSettings(), getViewer()]);
  if (!can(viewer?.role, "phase")) notFound();
  const dates = [
    ["regOpensAt", t.admin.regOpens, s.regOpensAt],
    ["regClosesAt", t.admin.regCloses, s.regClosesAt],
    ["bookingOpensAt", t.admin.bookingOpens, s.bookingOpensAt],
    ["bookingClosesAt", t.admin.bookingCloses, s.bookingClosesAt],
  ] as const;
  const dateOf = (k: string) => s.timeline.find((e) => e.key === k)?.dates ?? "";

  return (
    <>
      <h1 className="heading-slam mb-6 text-4xl sm:text-5xl">{t.admin.menu.phase}</h1>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title={t.admin.phaseNow} help={t.admin.phaseHelp} className="xl:col-span-2">
          <ActionForm action={setPhase} submit={t.admin.applyPhase} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {PHASES.map((p, i) => (
                <label
                  key={p}
                  className="flex cursor-pointer items-center gap-2.5 border border-line px-3 py-3 text-sm font-black uppercase transition-colors hover:border-paper/40 has-[:checked]:border-rose has-[:checked]:bg-rose/10"
                >
                  <input type="radio" name="phase" value={p} defaultChecked={p === s.phase} className={check} />
                  <span className="num text-ash">{i + 1}</span> {t.admin.phases[p]}
                </label>
              ))}
            </div>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.sectionsTitle} help={t.admin.sectionsHelp}>
          <ActionForm key={s.phase} action={setSections} className="space-y-4">
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              {SECTIONS.map((k) => (
                <label key={k} className="flex min-h-10 cursor-pointer items-center gap-2.5 border-b border-line text-sm">
                  <input type="checkbox" name={k} defaultChecked={s.sections[k]} className={check} />
                  {t.admin.sections[k]}
                </label>
              ))}
            </div>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.dates} help={t.admin.datesHelp}>
          <ActionForm action={setDates} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {dates.map(([name, label, value]) => (
                <label key={name} className="flex flex-col gap-1 text-xs font-bold uppercase text-ash">
                  {label}
                  <input type="datetime-local" name={name} defaultValue={toSofiaInput(value)} className={cn(inputCls, "[color-scheme:dark]")} />
                </label>
              ))}
              <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ash">
                {t.admin.qualifyCount}
                <input type="number" name="qualifyCount" min={3} max={96} defaultValue={s.qualifyCount} className={inputCls} />
              </label>
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5 self-end text-sm">
                <input type="checkbox" name="pickemsOpen" defaultChecked={s.pickemsOpen} className={check} />
                {t.admin.pickemsOpen}
              </label>
            </div>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.timeline} help={t.admin.timelineHelp} className="xl:col-span-2">
          <ActionForm key={s.timelineAt ?? "none"} action={setTimeline} className="space-y-4">
            <div className="divide-y divide-line border border-line">
              {TIMELINE_KEYS.map((k) => (
                <div key={k} className="grid grid-cols-[1fr_1.2fr_auto] items-center gap-3 px-3 py-2">
                  <span className="text-sm font-black uppercase">{t.timeline[k]}</span>
                  <input name={`dates.${k}`} defaultValue={dateOf(k)} maxLength={40} className={inputCls} aria-label={t.timeline[k]} />
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase text-ash">
                    <input type="radio" name="current" value={k} defaultChecked={s.timelineAt === k} className={check} />
                    {t.admin.current}
                  </label>
                </div>
              ))}
              <label className="flex cursor-pointer items-center justify-end gap-2 px-3 py-2 text-xs font-bold uppercase text-ash">
                <input type="radio" name="current" value="" defaultChecked={!s.timelineAt} className={check} />
                {t.admin.none}
              </label>
            </div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
