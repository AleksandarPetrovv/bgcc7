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
import { setDraft, setQualify, setRounds, setScoring } from "./actions";
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
                <span className="num text-paper">1,000,000</span> EZ → <span className="num text-paper">500,000</span> × {s.ezMult} ={" "}
                <span className="num text-[#e8c547]">{Math.floor(500000 * s.ezMult).toLocaleString("en-US")}</span>
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

        <Panel title={t.admin.set.draft} help={t.admin.set.draftHelp} i={2}>
          <ActionForm key={`${s.bans}${s.banOrder}${s.banSecs}${s.pickSecs}${s.timeoutSecs}`} action={setDraft} className="space-y-4">
            <div className="flex flex-wrap items-end gap-5">
              <label className={labelCls}>
                {t.admin.set.bans}
                <input type="number" name="bans" min={0} max={4} defaultValue={s.bans} className={`${inputCls} num w-24 text-lg`} />
              </label>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash">{t.admin.set.order}</legend>
                <div className="flex gap-2">
                  {(["abab", "abba"] as const).map((o) => (
                    <label key={o} className="group relative cursor-pointer">
                      <input type="radio" name="banOrder" value={o} defaultChecked={s.banOrder === o} className="peer sr-only" />
                      <span className="flex min-h-10 -skew-x-12 items-center gap-0.5 border border-line px-3 transition-colors duration-200 group-hover:border-paper/40 peer-checked:border-rose peer-checked:bg-rose/15 peer-focus-visible:ring-2 peer-focus-visible:ring-rose">
                        {o.split("").map((c, i) => (
                          <span key={i} className={`num skew-x-12 text-lg font-black uppercase ${c === "a" ? "text-rose-hi" : "text-azure-hi"}`}>
                            {c}
                          </span>
                        ))}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-dashed border-line pt-4">
              {(
                [
                  ["banSecs", t.admin.set.banSecs, s.banSecs],
                  ["pickSecs", t.admin.set.pickSecs, s.pickSecs],
                  ["timeoutSecs", t.admin.set.timeoutSecs, s.timeoutSecs],
                ] as const
              ).map(([k, label, val]) => (
                <label key={k} className={labelCls}>
                  {label}
                  <span className="flex items-center gap-1.5">
                    <input type="number" name={k} min={10} max={900} defaultValue={val} className={`${inputCls} num w-full text-lg`} />
                    <span className="text-xs text-ash">s</span>
                  </span>
                </label>
              ))}
            </div>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.set.rounds} help={t.admin.set.roundsHelp} className="xl:col-span-2" i={2}>
          <ActionForm key={rounds.map((r) => r.firstTo).join()} action={setRounds} className="space-y-4">
            <div className="divide-y divide-line border border-line">
              {rounds.map((st, i) => {
                const ft = st.firstTo ?? 7;
                return (
                  <label
                    key={st.id}
                    style={v({ "--i": i, "--s": "0.06s", "--d": "0.5s" })}
                    className="in-left grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                  >
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
