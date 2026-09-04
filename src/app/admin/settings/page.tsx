import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page";
import { ActionForm, inputCls, labelCls, Panel } from "@/components/admin/form";
import { getSettings } from "@/db/settings";
import { getPoolStages } from "@/db/mappools";
import { getMatches } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { roundName } from "@/lib/i18n/dict";
import { can } from "@/lib/roles";
import { setQualify, setRounds, setScoring } from "./actions";
import { PickemsToggle } from "./pickems-toggle";

const v = (o: Record<string, string | number>) => o as React.CSSProperties;

export default async function AdminSettings() {
  const [t, s, viewer, stages, matches] = await Promise.all([getDict(), getSettings(), getViewer(), getPoolStages(), getMatches()]);
  if (!can(viewer?.role, "settings")) notFound();
  const rounds = stages.filter((st) => st.slug !== "qualifiers");
  const usedBy = (slug: string) => [...new Set(matches.filter((m) => m.stage === slug).map((m) => roundName(t, m.round)))];

  return (
    <>
      <PageTitle mark="gears">{t.admin.menu.settings}</PageTitle>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title={t.admin.set.scoring} help={t.admin.set.scoringHelp} i={0}>
          <ActionForm key={s.ezMult} action={setScoring} className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className={labelCls}>
                {t.admin.set.ez}
                <span className="flex items-center gap-2">
                  <span className="num text-2xl text-ash">×</span>
                  <input type="number" name="ezMult" min={1} max={3} step={0.01} defaultValue={s.ezMult} className={`${inputCls} num w-28 text-lg`} />
                </span>
              </label>
              <div className="in-pop flex items-center gap-2 border border-dashed border-line px-3 py-2 text-xs font-bold text-ash" style={v({ "--d": "0.5s" })}>
                <span className="num text-paper">1,000,000</span> EZ → <span className="num text-paper">500,000</span> × {s.ezMult} = <span className="num text-[#e8c547]">{Math.floor(500000 * s.ezMult).toLocaleString("en-US")}</span>
              </div>
            </div>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.set.pickems} help={t.admin.set.pickemsHelp} className="xl:col-span-2" i={1}>
          <PickemsToggle key={String(s.pickemsOpen)} open={s.pickemsOpen} />
        </Panel>

        <Panel title={t.admin.set.qualify} help={t.admin.set.qualifyHelp} i={1}>
          <ActionForm key={s.qualifyCount} action={setQualify} className="space-y-4">
            <label className={labelCls}>
              {t.admin.qualifyCount}
              <input type="number" name="qualifyCount" min={3} max={96} defaultValue={s.qualifyCount} className={`${inputCls} num w-28 text-lg`} />
            </label>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.set.rounds} help={t.admin.set.roundsHelp} className="xl:col-span-2" i={2}>
          <ActionForm key={rounds.map((r) => r.firstTo).join()} action={setRounds} className="space-y-4">
            <div className="divide-y divide-line border border-line">
              {rounds.map((st, i) => {
                const ft = st.firstTo ?? 7;
                return (
                  <label key={st.id} style={v({ "--i": i, "--s": "0.06s", "--d": "0.5s" })} className="in-left grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <span className="min-w-0">
                      <span className="block text-sm font-black uppercase">{roundName(t, st.title)}</span>
                      <span className="block truncate text-xs text-ash">{usedBy(st.slug).join(" · ") || "—"}</span>
                    </span>
                    <span className="hidden text-xs font-bold uppercase text-ash sm:block">{t.admin.set.bestOf(ft * 2 - 1)}</span>
                    <span className="flex items-center gap-2 text-xs font-bold uppercase text-ash">
                      {t.admin.set.firstTo}
                      <input type="number" name={`ft.${st.id}`} min={1} max={20} defaultValue={ft} className={`${inputCls} num w-20 text-center text-lg`} />
                    </span>
                  </label>
                );
              })}
            </div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
