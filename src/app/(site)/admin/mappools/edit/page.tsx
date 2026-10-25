import { LinkTabs } from "@/components/site/tabs";
import { InView } from "@/components/site/in-view";
import { PageTitle } from "@/components/site/page";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Download, Star, Trash2 } from "lucide-react";
import { ActionForm, inputCls, Panel, Field, IconAction } from "@/components/admin/form";
import { getPoolStages, MOD_ORDER, slotOf } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { getMapChecks } from "@/lib/osu-api";
import { getViewer } from "@/lib/authz";
import { fmtLen, MODS } from "@/lib/data";
import { getDict, getLang } from "@/lib/i18n/server";
import { PackUploader } from "../../site/pack-uploader";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { deleteMap, moveMap, renameStage, setSlotMap } from "../actions";
import { SlotInput } from "../slot-input";
import { SlotPop } from "../slot-pop";
import { ReleaseToggle } from "../release-toggle";
import { SwapRow } from "../swap-row";
import { PoolMode } from "../pool-mode";
import Link from "next/link";
import { osuMap } from "@/lib/links";

const label = "flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors";

export default async function AdminMappools({ searchParams }: PageProps<"/admin/mappools">) {
  const [t, lang, viewer, stages, sp] = await Promise.all([getDict(), getLang(), getViewer(), getPoolStages(), searchParams]);
  if (!can(viewer?.roles, "mappools")) notFound();
  const stage = stages.find((s) => s.slug === sp.stage) ?? stages[0];
  if (!stage) return null;
  const host = can(viewer?.roles, "phase");
  const edit = can(viewer?.roles, "poolEdit");
  const name = (s: { title: string }) => t.rounds[s.title] ?? s.title;
  const checks = await getMapChecks(stage.pools.flatMap((p) => p.maps.map((m) => m.id)));
  const skill = (await getSkillLayouts())?.[stage.slug];
  const poolMaps = stage.pools.flatMap((p) => p.maps);
  const mapsOf = (mod: string) => stage.pools.find((p) => p.category === mod)?.maps ?? [];
  const countOf = (mod: string) => stage.blueprint[mod] ?? 0;
  type Item = { mod: string; slot: number; out: boolean; note?: string; label?: string };
  const extras = (mod: string): Item[] => mapsOf(mod).filter((m) => m.order >= countOf(mod)).map((m) => ({ mod, slot: m.order, out: true }));
  const sections: { key: string; title: string; color: string; items: Item[] }[] = skill
    ? [
        ...skill.groups.map((g) => ({ key: g.id, title: g.name, color: g.color, items: g.slots.map((x) => ({ ...x, out: false })) })),
        { key: "out", title: t.admin.outsideLayout, color: "var(--color-rose)", items: MOD_ORDER.flatMap(extras) },
      ].filter((x) => x.items.length)
    : MOD_ORDER.filter((mod) => countOf(mod) > 0 || mapsOf(mod).length).map((mod) => ({
        key: mod,
        title: MODS[mod].label,
        color: MODS[mod].color,
        items: [...Array.from({ length: countOf(mod) }, (_, slot) => ({ mod, slot, out: false })), ...extras(mod)],
      }));

  return (
    <>
      <PageTitle>{t.admin.menu.mappools}</PageTitle>
      <PoolMode t={t} on="edit" stage={stage.slug} edit={edit} />

      <LinkTabs
        className="mb-6"
        label={t.admin.menu.mappools}
        items={stages.map((s) => ({
          href: `/admin/mappools/edit?stage=${s.slug}`,
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

      {host && (
        <ActionForm key={`${stage.id}-${stage.title}`} action={renameStage.bind(null, stage.id)} className="in-up mx-auto mb-6 flex w-full max-w-xl items-end gap-3 [--d:0.15s]">
          <label className={cn(label, "flex-1")}>
            {t.admin.stageTitle}
            <Field name="title" required maxLength={40} defaultValue={stage.title} className={inputCls} />
          </label>
        </ActionForm>
      )}

      {edit ? (
        <Panel title={t.admin.poolDone} help={t.admin.poolDoneHelp} className="mb-6 border-rose/60" i={1}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: t.admin.poolStatMaps, v: String(poolMaps.length) },
                { k: t.admin.poolStatSr, v: poolMaps.length ? `${(poolMaps.reduce((n, m) => n + m.sr, 0) / poolMaps.length).toFixed(2)}★` : "–" },
              ].map((s) => (
                <div key={s.k} className="-skew-x-12 border border-line bg-ink/50 px-4 py-2.5">
                  <div className="skew-x-12">
                    <div className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-ash">{s.k}</div>
                    <div className="num text-2xl text-paper">{s.v}</div>
                  </div>
                </div>
              ))}
            </div>
            <PackUploader
              key={stage.slug}
              simple
              stages={[{ slug: stage.slug, title: stage.title, pack: stage.pack }]}
              locale={lang === "bg" ? "bg-BG" : "en-GB"}
              lead={<ReleaseToggle key={`${stage.id}-${stage.released}`} stageId={stage.id} released={stage.released} className="w-full justify-center" />}
            />
          </div>
        </Panel>
      ) : (
        stage.pack && (
          <a
            href={`/download/${stage.slug}?v=${stage.pack.at ?? stage.pack.size}`}
            download
            className="in-left lift-sm mb-6 flex w-fit -skew-x-12 items-center border border-balkan/60 px-4 py-2.5 text-balkan transition-colors hover:bg-balkan hover:text-white [--d:0.2s]"
          >
            <span className="flex skew-x-12 items-center gap-2 text-xs font-black uppercase">
              <Download className="size-4" /> {t.admin.packDownload}
            </span>
          </a>
        )
      )}

      {sections.length === 0 && (
        <p className="flex flex-wrap items-center gap-3 border border-dashed border-line bg-coal p-4 text-sm text-ash">
          {t.admin.noLayout}
          {host && (
            <Link href={`/admin/mappools/create?stage=${stage.slug}`} className="font-black uppercase text-rose-hi hover:text-paper">
              {t.admin.poolCreate} →
            </Link>
          )}
        </p>
      )}
      <div className="space-y-4">
        {sections.map(({ key, title, color: accent, items }, pi) => {
          const filled = items.filter((x) => !x.out && mapsOf(x.mod).some((m) => m.order === x.slot)).length;
          const total = items.filter((x) => !x.out).length;
          return (
            <InView
              as="section"
              self
              scrub
              key={key}
              className="sr in-up relative overflow-clip border border-line bg-coal"
              style={{ "--i": pi < 5 ? pi : 0, "--s": "0.1s", "--d": "0.45s" } as React.CSSProperties}
            >
              <span className="sr in-grow absolute inset-x-0 top-0 h-0.5 [--d:0.6s]" style={{ background: accent }} aria-hidden />
              <h2 className="flex items-center gap-3 border-b border-line px-4 py-2 text-sm font-black uppercase" style={{ color: accent }}>
                <span className="sr in-wipe inline-block [--d:0.6s]">{title}</span>
                {total > 0 && (
                  <span className="num text-xs text-ash">
                    {filled}/{total}
                  </span>
                )}
              </h2>
              <ul className="divide-y divide-line">
                {items.map(({ mod, slot, out, note, label: tagLabel }, i) => {
                  const color = skill && !out ? accent : MODS[mod].color;
                  const chip = skill && mod !== "Tiebreaker" ? (
                    <span className="-skew-x-12 border px-1.5 py-0.5 text-[0.65rem] font-black" style={{ borderColor: MODS[mod].color, color: MODS[mod].color }}>
                      <span className="inline-block skew-x-12">{MODS[mod].short}</span>
                    </span>
                  ) : null;
                  const count = countOf(mod);
                  const m = mapsOf(mod).find((x) => x.order === slot);
                  const tag = note ? <div className="mt-0.5 whitespace-pre-line text-xs font-semibold text-paper/55">{note}</div> : null;
                  if (!m)
                    return (
                      <SwapRow
                        key={`empty-${mod}-${slot}`}
                        style={{ "--i": i, "--s": "0.05s", "--d": "0.7s" } as React.CSSProperties}
                        className="sr in-left flex items-center gap-3 bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(255_255_255/0.018)_10px_20px)] px-3 py-2.5"
                      >
                        <span className={cn("heading-slam shrink-0 text-xl opacity-60", skill ? "w-16" : "w-12")} style={{ color }}>
                          {tagLabel ?? slotOf(mod, slot)}
                        </span>
                        {chip}
                        <div className="min-w-0 flex-1">
                          {edit ? (
                            <SlotInput action={setSlotMap.bind(null, stage.id, mod, slot)} />
                          ) : (
                            <span className="text-xs font-black uppercase tracking-wider text-ash">{t.admin.emptySlot}</span>
                          )}
                          {tag}
                        </div>
                      </SwapRow>
                    );
                  return (
                    <SwapRow
                      key={m.rowId}
                      style={{ "--i": i, "--s": "0.05s", "--d": "0.7s" } as React.CSSProperties}
                      className={cn("sr in-left flex flex-wrap items-center gap-3 px-3 py-2", out && "bg-rose/[0.06]")}
                    >
                      <span className={cn("sr in-slam heading-slam text-xl [--d:0.8s]", skill ? "w-16" : "w-12")} style={{ color }}>
                        {m.slot}
                      </span>
                      {chip}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.cover} alt="" className="sr in-wipe hidden h-10 w-24 object-cover sm:block [--d:0.85s]" />
                      <div className="min-w-0 flex-1">
                        <a
                          href={osuMap(m.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-bold decoration-rose underline-offset-4 transition-colors hover:text-rose-hi hover:underline"
                        >
                          {m.title} <span className="text-ash">[{m.version}]</span>
                        </a>
                        {out && <div className="text-xs font-black uppercase text-rose-hi">{t.admin.outsideLayout}</div>}
                        {tag}
                        {checks.get(m.id)?.dmca && <div className="text-xs font-black uppercase text-rose-hi">{t.admin.mapDmca}</div>}
                        <div className="num flex flex-wrap gap-x-3 text-sm text-paper/70">
                          <span className="flex items-center gap-1 text-gold">
                            <Star className="size-3.5 fill-current" /> {m.sr.toFixed(2)}
                          </span>
                          <span>{Math.round(m.bpm)} bpm</span>
                          <span>{fmtLen(m.length)}</span>
                          <span className="hidden text-ash sm:inline">
                            CS {m.cs} · AR {m.ar} · OD {m.od}
                          </span>
                          <span className="text-ash">ID: {m.id}</span>
                        </div>
                      </div>
                      {edit && (
                        <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
                          {skill ? null : !out && slot > 0 ? (
                            <IconAction action={moveMap.bind(null, m.rowId, -1)} label={t.admin.up}>
                              <ArrowUp className="size-4 transition-transform group-hover:-translate-y-0.5" strokeWidth={2.5} />
                            </IconAction>
                          ) : (
                            <span className="size-10" aria-hidden />
                          )}
                          {skill ? null : !out && slot < count - 1 ? (
                            <IconAction action={moveMap.bind(null, m.rowId, 1)} label={t.admin.down}>
                              <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" strokeWidth={2.5} />
                            </IconAction>
                          ) : (
                            <span className="size-10" aria-hidden />
                          )}
                          {!out && (
                            <SlotPop
                              icon="pencil"
                              action={setSlotMap.bind(null, stage.id, mod, slot)}
                              title={t.admin.changeMap}
                              slot={m.slot}
                              color={color}
                              submit={t.admin.replace}
                            />
                          )}
                          <IconAction action={deleteMap.bind(null, m.rowId)} label={t.admin.clearSlot} confirm={t.admin.confirmClearSlot} danger>
                            <Trash2 className="size-4 transition-transform group-hover:rotate-12" />
                          </IconAction>
                        </div>
                      )}
                    </SwapRow>
                  );
                })}
              </ul>
            </InView>
          );
        })}
      </div>
    </>
  );
}
