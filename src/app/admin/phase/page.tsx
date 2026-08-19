import { notFound } from "next/navigation";
import { PageTitle, Tag } from "@/components/site/page";
import { ActionForm, dateCls, inputCls, Panel } from "@/components/admin/form";
import { getSettings } from "@/db/settings";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { PHASES, SECTIONS, TIMELINE_KEYS } from "@/lib/sections";
import { toSofiaInput } from "@/lib/time";
import { timelineStates } from "@/lib/dates";
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
  const row = (k: string) => s.timeline.find((e) => e.key === k);
  const states = timelineStates(s.timeline);

  return (
    <>
      <PageTitle>{t.admin.menu.phase}</PageTitle>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title={t.admin.phaseNow} help={t.admin.phaseHelp} className="xl:col-span-2" i={0}>
          <ActionForm action={setPhase} submit={t.admin.applyPhase} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PHASES.map((p, i) => (
                <label
                  key={p}
                  style={{ "--i": i, "--s": "0.07s", "--d": "0.5s" } as React.CSSProperties}
                  className="in-pop flex cursor-pointer items-center gap-2.5 whitespace-nowrap border border-line px-3.5 py-3 text-sm font-black uppercase transition-colors hover:border-paper/40 has-[:checked]:border-rose has-[:checked]:bg-rose/10"
                >
                  <input type="radio" name="phase" value={p} defaultChecked={p === s.phase} className={check} />
                  <span className="num text-ash">{i + 1}</span> {t.admin.phases[p]}
                </label>
              ))}
            </div>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.sectionsTitle} help={t.admin.sectionsHelp} i={1}>
          <ActionForm key={s.phase} action={setSections} className="space-y-4">
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              {SECTIONS.map((k, i) => (
                <label key={k} style={{ "--i": i, "--s": "0.035s", "--d": "0.55s" } as React.CSSProperties} className="in-left flex min-h-10 cursor-pointer items-center gap-2.5 border-b border-line text-sm font-bold uppercase tracking-wide">
                  <input type="checkbox" name={k} defaultChecked={s.sections[k]} className={check} />
                  {t.admin.sections[k]}
                </label>
              ))}
            </div>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.dates} help={t.admin.datesHelp} i={2}>
          <ActionForm action={setDates} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {dates.map(([name, label, value], i) => (
                <label key={name} style={{ "--i": i, "--s": "0.07s", "--d": "0.6s" } as React.CSSProperties} className="in-up flex flex-col gap-1 text-xs font-bold uppercase text-ash">
                  {label}
                  <input type="datetime-local" name={name} defaultValue={toSofiaInput(value)} className={dateCls} />
                </label>
              ))}
              <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ash">
                {t.admin.qualifyCount}
                <input type="number" name="qualifyCount" min={3} max={96} defaultValue={s.qualifyCount} className={inputCls} />
              </label>
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5 self-end text-sm font-bold uppercase tracking-wide">
                <input type="checkbox" name="pickemsOpen" defaultChecked={s.pickemsOpen} className={check} />
                {t.admin.pickemsOpen}
              </label>
            </div>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.timeline} help={t.admin.timelineHelp} className="xl:col-span-2" i={3}>
          <ActionForm key={JSON.stringify(s.timeline)} action={setTimeline} className="space-y-4">
            <div className="divide-y divide-line border border-line">
              {TIMELINE_KEYS.map((k, i) => (
                <div key={k} style={{ "--i": i, "--s": "0.06s", "--d": "0.7s" } as React.CSSProperties} className="in-left grid grid-cols-1 items-center gap-2 px-3 py-2 sm:grid-cols-[1fr_auto_auto] sm:gap-3">
                  <span className="flex items-center gap-2 text-sm font-black uppercase">
                    {t.timeline[k]}
                    {states[i] === "now" && (
                      <span className="in-slam inline-flex [--d:1.1s]">
                        <Tag>{t.admin.current}</Tag>
                      </span>
                    )}
                  </span>
                  {k === "reg" ? (
                    <span className="text-xs text-ash sm:col-span-2">{t.admin.regFromDates}</span>
                  ) : (
                    <>
                      <input type="date" name={`from.${k}`} defaultValue={row(k)?.from ?? ""} aria-label={`${t.timeline[k]} · ${t.admin.from}`} className={dateCls} />
                      <input type="date" name={`to.${k}`} defaultValue={row(k)?.to ?? ""} aria-label={`${t.timeline[k]} · ${t.admin.to}`} className={dateCls} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
