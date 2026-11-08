import { notFound } from "next/navigation";
import { getFormat } from "@/db/edition";
import { PageTitle } from "@/components/site/page-title";
import { ActionForm, Panel, Field } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { getSettings } from "@/db/settings";
import { getPoolStages } from "@/db/mappools";
import { getMatches } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { roundName } from "@/lib/i18n/dict";
import { can } from "@/lib/roles";
import { setDraft } from "./actions";
import { setQualify, setRounds } from "./(bgcc6)/actions";
import { isBGCC6 } from "@/db";
import { cssVars } from "@/lib/utils";
import { bestOf, isBracketStage } from "@/lib/format";
import { MAX_BANS } from "@/lib/format-plan";


export default async function AdminSettings() {
  const [t, s, viewer, stages, matches] = await Promise.all([getDict(), getSettings(), getViewer(), getPoolStages(), getMatches()]);
  if (!can(viewer?.roles, "settings")) notFound();
  const rounds = stages.filter((st) => isBracketStage(st.slug));
  const usedBy = (slug: string) => [...new Set(matches.filter((m) => m.stage === slug).map((m) => roundName(t, m.round)))];

  return (
    <>
      <PageTitle mark="gears">{t.admin.menu.settings}</PageTitle>
      <div className={isBGCC6() ? "grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start" : "mx-auto max-w-2xl"}>
        {isBGCC6() && (
        <div className="space-y-6">
          <Panel title={t.admin.set.qualify} help={t.admin.set.qualifyHelp} i={1}>
            <ActionForm key={s.qualifyCount} action={setQualify} className="space-y-4">
              <label className={labelCls}>
                {t.admin.qualifyCount}
                <Field type="number" name="qualifyCount" min={3} max={96} defaultValue={s.qualifyCount} className="num w-28 text-lg" />
              </label>
            </ActionForm>
          </Panel>
        </div>
        )}
        <div className="space-y-6">
          <Panel title={t.admin.set.draft} help={t.admin.set.draftHelp} i={isBGCC6() ? 2 : 1}>
            <ActionForm key={`${s.bans}${s.banSecs}${s.pickSecs}${s.timeoutSecs}`} action={setDraft} className="flex flex-col items-center gap-6">
              <div className="flex flex-wrap items-end justify-center gap-5">
                <label className={labelCls}>
                  {t.admin.set.bans}
                  <Field type="number" name="bans" min={0} max={MAX_BANS} defaultValue={s.bans} className="num w-20 text-lg" />
                </label>
                {(
                  [
                    ["pickBanSecs", t.admin.set.pickBanSecs, s.banSecs],
                    ["timeoutSecs", t.admin.set.timeoutSecs, s.timeoutSecs],
                  ] as const
                ).map(([k, label, val]) => (
                  <label key={k} className={labelCls}>
                    {label}
                    <span className="flex items-center gap-1.5">
                      <Field type="number" name={k} min={10} max={900} defaultValue={val} className="num w-24 text-lg" />
                      <span className="text-xs text-ash">s</span>
                    </span>
                  </label>
                ))}
              </div>
            </ActionForm>
          </Panel>

          {isBGCC6() && (
          <Panel title={t.admin.set.rounds} help={t.admin.set.roundsHelp} i={2}>
            <ActionForm key={rounds.map((r) => r.firstTo).join()} action={setRounds} className="space-y-4">
              <div className="divide-y divide-line border border-line">
                {rounds.map((st, i) => {
                  const ft = st.firstTo ?? getFormat().firstTo;
                  return (
                    <label
                      key={st.id}
                      style={cssVars({ "--i": i, "--s": "0.06s", "--d": "0.5s" })}
                      className="in-left grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-display font-bold">{roundName(t, st.title)}</span>
                        <span className="block truncate text-xs text-ash">{usedBy(st.slug).join(" · ") || "—"}</span>
                      </span>
                      <span className="hidden text-xs font-display font-bold text-ash sm:block">{t.admin.set.bestOf(bestOf(ft))}</span>
                      <span className="flex items-center gap-2 text-xs font-display font-bold text-ash">
                        {t.admin.set.firstTo}
                        <Field type="number" name={`ft.${st.id}`} min={1} max={20} defaultValue={ft} className="num w-20 text-center text-lg" />
                      </span>
                    </label>
                  );
                })}
              </div>
            </ActionForm>
          </Panel>
          )}
        </div>
      </div>
    </>
  );
}
