import { LinkTabs } from "@/components/site/tabs";
import { InView } from "@/components/site/in-view";
import { PageTitle } from "@/components/site/page";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
import { getPoolStages } from "@/db/mappools";
import { getMapChecks } from "@/lib/osu-api";
import { getViewer } from "@/lib/authz";
import { fmtLen, MODS } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { addMap, deleteMap, moveMap, refreshStage, updateStage } from "./actions";
import { Dropdown } from "@/components/admin/dropdown";

const label = "flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors";

export default async function AdminMappools({ searchParams }: PageProps<"/admin/mappools">) {
  const [t, viewer, stages, sp] = await Promise.all([getDict(), getViewer(), getPoolStages(), searchParams]);
  if (!can(viewer?.role, "mappools")) notFound();
  const stage = stages.find((s) => s.slug === sp.stage) ?? stages[0];
  if (!stage) return null;
  const name = (s: { title: string }) => t.rounds[s.title] ?? s.title;
  const checks = await getMapChecks(stage.pools.flatMap((p) => p.maps.map((m) => m.id)));

  return (
    <>
      <PageTitle>{t.admin.menu.mappools}</PageTitle>

      <LinkTabs
        className="mb-6"
        label={t.admin.menu.mappools}
        items={stages.map((s) => ({
          href: `/admin/mappools?stage=${s.slug}`,
          active: s.id === stage.id,
          label: (
            <>
              {name(s)}
              <span className="num text-sm opacity-80">{s.pools.reduce((n, p) => n + p.maps.length, 0)}</span>
              {!s.released && <span className="text-[0.6rem] opacity-70">{t.admin.poolHidden}</span>}
            </>
          ),
        }))}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title={name(stage)}>
          <ActionForm key={`${stage.id}-${stage.title}-${stage.firstTo}-${stage.released}`} action={updateStage.bind(null, stage.id)} className="space-y-4">
            <label className={label}>
              {t.admin.stageTitle}
              <input name="title" required maxLength={40} defaultValue={stage.title} className={inputCls} />
            </label>
            <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-bold uppercase tracking-wide">
              <input type="checkbox" name="poolReleased" defaultChecked={stage.released} className="size-4 accent-rose" />
              {t.admin.poolReleased}
            </label>
          </ActionForm>
        </Panel>
        <Panel title={t.admin.addMap} i={1}>
          <ActionForm action={addMap.bind(null, stage.id)} submit={t.admin.add} className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label className={label}>
                {t.admin.beatmap}
                <input name="beatmap" required placeholder="https://osu.ppy.sh/b/…" className={inputCls} />
              </label>
              <label className={label}>
                {t.admin.mod}
                <Dropdown name="mod" defaultValue="NoMod" options={Object.entries(MODS).map(([k, v]) => ({ value: k, label: v.label, color: v.color }))} />
              </label>
            </div>
          </ActionForm>
        </Panel>
      </div>

      <div className="in-right mb-3 flex justify-end [--d:0.4s]">
        <ActionForm action={refreshStage.bind(null, stage.id)} submit={t.admin.refreshMaps} ghost />
      </div>

      {stage.pools.length === 0 && <p className="border border-line bg-coal p-4 text-sm text-ash">{t.admin.noMaps}</p>}
      <div className="space-y-4">
        {stage.pools.map((p, pi) => (
          <InView as="section" self key={p.category} className="in-up relative overflow-hidden border border-line bg-coal" style={{ "--i": pi < 5 ? pi : 0, "--s": "0.1s", "--d": "0.45s" } as React.CSSProperties}>
            <span className="in-grow absolute inset-x-0 top-0 h-0.5 [--d:0.6s]" style={{ background: MODS[p.category].color }} aria-hidden />
            <h2 className="border-b border-line px-4 py-2 text-sm font-black uppercase" style={{ color: MODS[p.category].color }}>
              <span className="in-wipe inline-block [--d:0.6s]">{MODS[p.category].label}</span>
            </h2>
            <ul className="divide-y divide-line">
              {p.maps.map((m, i) => (
                <li key={m.rowId} style={{ "--i": i, "--s": "0.05s", "--d": "0.7s" } as React.CSSProperties} className="in-left flex flex-wrap items-center gap-3 px-3 py-2">
                  <span className="in-slam heading-slam w-12 text-xl [--d:0.8s]" style={{ color: MODS[p.category].color }}>
                    {m.slot}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.cover} alt="" className="in-wipe hidden h-10 w-24 object-cover sm:block [--d:0.85s]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">
                      {m.title} <span className="text-ash">[{m.version}]</span>
                    </div>
                    {checks.get(m.id)?.dmca && <div className="text-xs font-black uppercase text-rose-hi">{t.admin.mapDmca}</div>}
                    <div className="num flex flex-wrap gap-x-3 text-sm text-paper/70">
                      <span className="flex items-center gap-1 text-[#e8c547]">
                        <Star className="size-3.5 fill-current" /> {m.sr.toFixed(2)}
                      </span>
                      <span>{Math.round(m.bpm)} bpm</span>
                      <span>{fmtLen(m.length)}</span>
                      <span className="hidden text-ash sm:inline">
                        CS {m.cs} · AR {m.ar} · OD {m.od}
                      </span>
                      <span className="text-ash">#{m.id}</span>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
                    {i > 0 && (
                      <ActionForm action={moveMap.bind(null, m.rowId, -1)} submit={t.admin.up} ghost />
                    )}
                    {i < p.maps.length - 1 && (
                      <ActionForm action={moveMap.bind(null, m.rowId, 1)} submit={t.admin.down} ghost />
                    )}
                    <ActionForm action={deleteMap.bind(null, m.rowId)} submit={t.admin.remove} ghost confirm={t.admin.confirmDeleteMap} />
                  </div>
                </li>
              ))}
            </ul>
          </InView>
        ))}
      </div>
    </>
  );
}
