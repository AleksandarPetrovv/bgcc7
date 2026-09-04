import { notFound } from "next/navigation";
import { InView } from "@/components/site/in-view";
import { Words } from "@/components/site/rich";
import { PageTitle, SubHeading } from "@/components/site/page";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
import { getLobbies, mpIds } from "@/db/lobbies";
import { getQualResults, getQualScoreRows } from "@/db/qualifiers";
import { getSettings } from "@/db/settings";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { clearPlayer, deleteScore, importAll, importOne, setScore, updateScore } from "./actions";

const label = "flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors";

export default async function AdminQualifiers() {
  const [t, viewer, lobbies, results, rows, settings] = await Promise.all([getDict(), getViewer(), getLobbies(), getQualResults(), getQualScoreRows(), getSettings()]);
  if (!can(viewer?.role, "qualifiers")) notFound();
  const slotOf = new Map(results.maps.map((m) => [m.id, m.slot]));

  return (
    <>
      <PageTitle>{t.admin.menu.qualifiers}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.qualHelp} d={0.15} s={0.012} />
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title={t.admin.importTitle} help={t.admin.importHelp}>
          <ul className="mb-4 divide-y divide-line border border-line">
            {lobbies.map((l, k) => (
              <li key={l.id} style={{ "--i": k, "--s": "0.06s", "--d": "0.55s" } as React.CSSProperties} className="in-left flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="font-bold">{l.name}</span>
                <span className="num text-xs text-ash">{mpIds(l.mpLinks).join(", ") || t.admin.noMp}</span>
                {mpIds(l.mpLinks).length > 0 && <ActionForm action={importOne.bind(null, l.id)} submit={t.admin.import} ghost className="ml-auto" />}
              </li>
            ))}
          </ul>
          <ActionForm action={importAll} submit={t.admin.importAll} />
        </Panel>

        <Panel title={t.admin.setScore} help={t.admin.setScoreHelp} i={1}>
          <ActionForm action={setScore} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
              <label className={cn(label, "min-[420px]:col-span-2 sm:col-span-1")}>
                {t.admin.player}
                <input name="player" required maxLength={32} placeholder={t.admin.addPlaceholder} className={inputCls} />
              </label>
              <label className={label}>
                {t.admin.map}
                <select name="beatmapId" required className={inputCls}>
                  {results.maps.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.slot} · {m.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                {t.admin.scoreLabel}
                <input type="number" name="score" required min={0} className={inputCls} />
              </label>
              <label className={label}>
                {t.admin.accLabel}
                <input type="number" name="acc" required min={0} max={100} step="0.01" className={inputCls} />
              </label>
              <label className={label}>
                {t.admin.mod}
                <input name="mods" placeholder="NF,HD" maxLength={30} className={inputCls} />
              </label>
            </div>
          </ActionForm>
        </Panel>
      </div>

      <div className="in-left [--d:0.4s]">
        <SubHeading>{t.admin.ranking(settings.qualifyCount)}</SubHeading>
      </div>
      {results.players.length === 0 && <p className="border border-line bg-coal p-4 text-sm text-ash">{t.admin.noScores}</p>}
      <InView className="space-y-1.5">
        {results.players.map((p, i) => {
          const own = rows.filter((r) => r.osuId === p.id).sort((a, b) => (slotOf.get(a.beatmapId) ?? "").localeCompare(slotOf.get(b.beatmapId) ?? ""));
          return (
            <details key={p.id} style={{ "--i": Math.min(i, 24), "--s": "0.03s", "--d": "0.45s" } as React.CSSProperties} className={cn("in-left-far border border-line bg-coal", i >= settings.qualifyCount && "opacity-60")}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2">
                <span className={cn("in-slam num w-10 text-center text-lg [--d:0.6s]", i < settings.qualifyCount ? "text-balkan" : "text-ash")}>#{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.avatar} alt="" className="size-7" />
                <span className="min-w-0 truncate font-bold">{p.username}</span>
                <span className="in-wipe-r num ml-auto text-balkan [--d:0.7s]">{p.zSum.toFixed(2)}</span>
                <span className="num hidden w-28 text-right text-sm text-ash sm:block">{t.admin.mapsPlayed(Object.keys(p.perf).length, results.maps.length)}</span>
              </summary>
              <div className="border-t border-line p-3">
                <ul className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                  {own.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 border border-line bg-ink/50 p-2">
                      <span className="w-10 shrink-0 text-sm font-black">{slotOf.get(r.beatmapId) ?? "?"}</span>
                      <ActionForm key={`${r.id}-${r.score}-${r.acc}-${r.mods}`} action={updateScore.bind(null, r.id)} submit="✓" ghost className="flex min-w-0 flex-1 items-center gap-1.5">
                        <input name="score" inputMode="numeric" required defaultValue={r.score} aria-label={t.admin.scoreLabel} className={cn(inputCls, "adm-tight num w-0 flex-[3]")} />
                        <input name="acc" inputMode="decimal" required defaultValue={r.acc.toFixed(2)} aria-label={t.admin.accLabel} className={cn(inputCls, "adm-tight num w-0 flex-[2]")} />
                        <input name="mods" defaultValue={r.mods ?? ""} placeholder="NF" aria-label={t.admin.mod} className={cn(inputCls, "adm-tight w-0 flex-[2] uppercase")} />
                      </ActionForm>
                      <ActionForm action={deleteScore.bind(null, r.id)} submit="×" ghost />
                    </li>
                  ))}
                </ul>
                <ActionForm action={clearPlayer.bind(null, p.id)} submit={t.admin.clearPlayer} ghost confirm={t.admin.confirmClearPlayer} />
              </div>
            </details>
          );
        })}
      </InView>
    </>
  );
}
