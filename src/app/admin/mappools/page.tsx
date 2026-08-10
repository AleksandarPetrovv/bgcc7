import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
import { getPoolStages } from "@/db/mappools";
import { getViewer } from "@/lib/authz";
import { fmtLen, MODS } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { addMap, deleteMap, moveMap, refreshStage, updateStage } from "./actions";

const label = "flex flex-col gap-1 text-xs font-bold uppercase text-ash";

export default async function AdminMappools({ searchParams }: PageProps<"/admin/mappools">) {
  const [t, viewer, stages, sp] = await Promise.all([getDict(), getViewer(), getPoolStages(), searchParams]);
  if (!can(viewer?.role, "mappools")) notFound();
  const stage = stages.find((s) => s.slug === sp.stage) ?? stages[0];
  if (!stage) return null;
  const name = (s: { title: string }) => t.rounds[s.title] ?? s.title;

  return (
    <>
      <h1 className="heading-slam mb-6 text-4xl sm:text-5xl">{t.admin.menu.mappools}</h1>

      <nav className="mb-6 flex overflow-x-auto border border-line" aria-label={t.admin.menu.mappools}>
        {stages.map((s) => (
          <Link
            key={s.slug}
            href={`/admin/mappools?stage=${s.slug}`}
            className={cn(
              "flex shrink-0 items-center gap-2 border-r border-line px-4 py-2.5 text-sm font-black uppercase last:border-r-0",
              s.id === stage.id ? "bg-paper text-ink" : "text-ash hover:bg-slate hover:text-paper",
            )}
          >
            {name(s)}
            <span className="num text-base">{s.pools.reduce((n, p) => n + p.maps.length, 0)}</span>
            {!s.released && <span className="text-[0.6rem] opacity-70">{t.admin.poolHidden}</span>}
          </Link>
        ))}
      </nav>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title={name(stage)}>
          <ActionForm key={`${stage.id}-${stage.title}-${stage.firstTo}-${stage.released}`} action={updateStage.bind(null, stage.id)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                {t.admin.stageTitle}
                <input name="title" required maxLength={40} defaultValue={stage.title} className={inputCls} />
              </label>
              <label className={label}>
                {t.admin.firstTo}
                <input type="number" name="firstTo" min={1} max={20} defaultValue={stage.firstTo ?? ""} className={inputCls} />
              </label>
            </div>
            <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" name="poolReleased" defaultChecked={stage.released} className="size-4 accent-rose" />
              {t.admin.poolReleased}
            </label>
          </ActionForm>
        </Panel>
        <Panel title={t.admin.addMap}>
          <ActionForm action={addMap.bind(null, stage.id)} submit={t.admin.add} className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label className={label}>
                {t.admin.beatmap}
                <input name="beatmap" required placeholder="https://osu.ppy.sh/b/…" className={inputCls} />
              </label>
              <label className={label}>
                {t.admin.mod}
                <select name="mod" defaultValue="NoMod" className={inputCls}>
                  {Object.entries(MODS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </ActionForm>
        </Panel>
      </div>

      <div className="mb-3 flex justify-end">
        <ActionForm action={refreshStage.bind(null, stage.id)} submit={t.admin.refreshMaps} ghost />
      </div>

      {stage.pools.length === 0 && <p className="border border-line bg-coal p-4 text-sm text-ash">{t.admin.noMaps}</p>}
      <div className="space-y-4">
        {stage.pools.map((p) => (
          <section key={p.category} className="border border-line bg-coal">
            <h2 className="border-b border-line px-4 py-2 text-sm font-black uppercase" style={{ color: MODS[p.category].color }}>
              {MODS[p.category].label}
            </h2>
            <ul className="divide-y divide-line">
              {p.maps.map((m, i) => (
                <li key={m.rowId} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <span className="heading-slam w-12 text-xl" style={{ color: MODS[p.category].color }}>
                    {m.slot}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.cover} alt="" className="hidden h-10 w-24 object-cover sm:block" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">
                      {m.title} <span className="text-ash">[{m.version}]</span>
                    </div>
                    <div className="num flex flex-wrap gap-x-3 text-sm text-paper/70">
                      <span className="flex items-center gap-1 text-[#e8c547]">
                        <Star className="size-3.5 fill-current" /> {m.sr.toFixed(2)}
                      </span>
                      <span>{Math.round(m.bpm)} bpm</span>
                      <span>{fmtLen(m.length)}</span>
                      <span className="text-ash">
                        CS {m.cs} · AR {m.ar} · OD {m.od}
                      </span>
                      <span className="text-ash">#{m.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
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
          </section>
        ))}
      </div>
    </>
  );
}
