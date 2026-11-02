import { LinkTabs } from "@/components/site/tabs";
import { InView } from "@/components/site/in-view";
import { PageTitle } from "@/components/site/page";
import { RuleDiamond } from "@/components/site/rule";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Download, Trash2 } from "lucide-react";
import { ActionForm, Panel, Field, labelCls, IconAction } from "@/components/admin/form";
import { getPoolStages, slotOf } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { getMapChecks } from "@/lib/osu-api";
import { getViewer } from "@/lib/authz";
import { cardCover } from "@/lib/data";
import { TagChips } from "../tag-chips";
import { MapMeta, ModChip } from "../map-meta";
import { getDict, getLang } from "@/lib/i18n/server";
import { PackUploader } from "@/components/admin/pack-uploader";
import { can } from "@/lib/roles";
import { modHi } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { deleteMap, moveMap, renameStage, setSlotMap } from "../actions";
import { SlotInput } from "../slot-input";
import { SlotPop } from "../slot-pop";
import { ReleaseToggle } from "../release-toggle";
import { SwapRow } from "../swap-row";
import { PoolMode } from "../pool-mode";
import Link from "next/link";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";
import { MOD_ORDER, MODS } from "@/lib/mods";

export default async function AdminMappools({ searchParams }: PageProps<"/admin/mappools">) {
  const [t, lang, viewer, stages, sp] = await Promise.all([getDict(), getLang(), getViewer(), getPoolStages(), searchParams]);
  if (!can(viewer?.roles, "mappools")) notFound();
  const stage = stages.find((s) => s.slug === sp.stage) ?? stages[0];
  if (!stage) return null;
  const host = can(viewer?.roles, "host");
  const edit = can(viewer?.roles, "poolEdit");
  const name = (s: { title: string }) => roundName(t, s.title);
  const [checks, layouts] = await Promise.all([getMapChecks(stage.pools.flatMap((p) => p.maps.map((m) => m.id))), getSkillLayouts()]);
  const skill = layouts?.[stage.slug];
  const poolMaps = stage.pools.flatMap((p) => p.maps);
  const mapsOf = (mod: string) => stage.pools.find((p) => p.category === mod)?.maps ?? [];
  const countOf = (mod: string) => stage.blueprint[mod] ?? 0;
  type Item = { mod: string; slot: number; out: boolean; note?: string; label?: string };
  const extras = (mod: string): Item[] => mapsOf(mod).filter((m) => m.order >= countOf(mod)).map((m) => ({ mod, slot: m.order, out: true }));
  const sections: { key: string; title: string; color: string; items: Item[] }[] = skill
    ? [
        ...skill.groups.map((g) => ({ key: g.id, title: g.name, color: g.color, items: g.slots.map((x) => ({ ...x, out: false })) })),
        { key: "out", title: t.admin.outsideLayout, color: "var(--rose)", items: MOD_ORDER.flatMap(extras) },
      ].filter((x) => x.items.length)
    : MOD_ORDER.filter((mod) => countOf(mod) > 0 || mapsOf(mod).length).map((mod) => ({
        key: mod,
        title: MODS[mod].label,
        color: MODS[mod].color,
        items: [...Array.from({ length: countOf(mod) }, (_, slot) => ({ mod, slot, out: false })), ...extras(mod)],
      }));

  return (
    <>
      <PageTitle mark="notes">{t.admin.menu.mappools}</PageTitle>
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
              <span className="num text-sm opacity-80">{s.pools.reduce((n, p) => n + p.maps.length, 0)}</span>            </>
          ),
        }))}
      />

      {host && (
        <ActionForm key={`${stage.id}-${stage.title}`} action={renameStage.bind(null, stage.id)} className="in-up mx-auto mb-6 flex w-full max-w-xl items-end gap-3 [--d:0.15s]">
          <label className={cn(labelCls, "flex-1")}>
            {t.admin.stageTitle}
            <Field name="title" required maxLength={40} defaultValue={stage.title} />
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
                <div key={s.k} className="border-l border-line pl-3">
                  <div>
                    <div className="text-[0.62rem] font-display font-bold text-ash">{s.k}</div>
                    <div className="num text-2xl text-paper">{s.v}</div>
                  </div>
                </div>
              ))}
            </div>
            <PackUploader
              key={stage.slug}
              simple
              stages={[{ slug: stage.slug, title: stage.title, pack: stage.pack }]}
              locale={localeOf(lang)}
              lead={<ReleaseToggle key={`${stage.id}-${stage.released}`} stageId={stage.id} released={stage.released} className="w-full justify-center" />}
            />
          </div>
        </Panel>
      ) : (
        stage.pack && (
          <a
            href={`/download/${stage.slug}?v=${stage.pack.at ?? stage.pack.size}`}
            download
            className="in-left group relative isolate mb-6 flex w-fit items-center gap-2 px-4 py-2.5 text-xs font-display font-bold text-balkan-hi hover:text-on-fill [--d:0.2s]"
          >
            <span aria-hidden className="absolute inset-0 -z-10 -skew-x-12 border border-balkan/60 group-hover:bg-balkan" />
            <Download className="size-4" /> {t.admin.packDownload}
          </a>
        )
      )}

      {sections.length === 0 && (
        <p className="flex flex-wrap items-center gap-3 border-y border-line py-4 text-sm text-ash">
          {t.admin.noLayout}
          {host && (
            <Link href={`/admin/mappools/create?stage=${stage.slug}`} className="font-display font-bold text-rose-hi hover:text-paper">
              {t.admin.poolCreate} →
            </Link>
          )}
        </p>
      )}
      <div className="space-y-8">
        {sections.map(({ key, title, color: accent, items }, pi) => {
          const filled = items.filter((x) => !x.out && mapsOf(x.mod).some((m) => m.order === x.slot)).length;
          const total = items.filter((x) => !x.out).length;
          return (
            <InView
              as="section"
              self
              key={key}
              className="in-up relative overflow-x-clip border-b border-line"
              style={{ "--i": pi < 5 ? pi : 0, "--s": "0.08s", "--d": "0.15s" } as React.CSSProperties}
            >
              <RuleDiamond />
              <h2 className="flex items-center gap-3 border-b border-line pb-2 text-sm font-display font-bold" style={{ color: modHi(accent) }}>
                <span className="size-2 shrink-0 rotate-45" style={{ background: accent }} aria-hidden />
                <span className="in-wipe inline-block [--d:0.25s]">{title}</span>
                {total > 0 && (
                  <span className="num text-xs text-ash">
                    {filled}/{total}
                  </span>
                )}
              </h2>
              <ul className="divide-y divide-line">
                {items.map(({ mod, slot, out, note, label: tagLabel }, i) => {
                  const color = skill && !out ? accent : MODS[mod].color;
                  const chip = skill && mod !== "Tiebreaker" ? <ModChip mod={mod} /> : null;
                  const count = countOf(mod);
                  const m = mapsOf(mod).find((x) => x.order === slot);
                  const tag = note ? <TagChips names={note.split("\n")} color={color} className="mt-1" /> : null;
                  if (!m)
                    return (
                      <SwapRow
                        key={`empty-${mod}-${slot}`}
                        style={{ "--i": i, "--s": "0.04s", "--d": "0.25s" } as React.CSSProperties}
                        className="in-left flex flex-wrap items-center gap-3 bg-[repeating-linear-gradient(135deg,transparent_0_10px,color-mix(in_srgb,var(--rose)_5%,transparent)_10px_20px)] px-3 py-2.5"
                      >
                        <span className={cn("heading-slam shrink-0 whitespace-nowrap text-xl opacity-60", skill ? "w-20" : "w-12")} style={{ color: modHi(color) }}>
                          {tagLabel ?? slotOf(mod, slot)}
                        </span>
                        {chip}
                        <div className="min-w-0 flex-1 basis-60">
                          {edit ? (
                            <SlotInput action={setSlotMap.bind(null, stage.id, mod, slot)} />
                          ) : (
                            <span className="text-xs font-display font-bold text-ash">{t.admin.emptySlot}</span>
                          )}
                          {tag}
                        </div>
                      </SwapRow>
                    );
                  return (
                    <SwapRow
                      key={m.rowId}
                      style={{ "--i": i, "--s": "0.04s", "--d": "0.25s" } as React.CSSProperties}
                      className={cn("in-left flex flex-wrap items-center gap-3 px-3 py-2", out && "bg-rose/[0.06]")}
                    >
                      <span className={cn("in-slam heading-slam shrink-0 whitespace-nowrap text-xl [--d:0.3s]", skill ? "w-20" : "w-12")} style={{ color: modHi(color) }}>
                        {m.slot}
                      </span>
                      {chip}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cardCover(m.cover)} alt="" loading="lazy" decoding="async" className="in-wipe hidden h-10 w-24 object-cover sm:block [--d:0.35s]" />
                      {/* phones: slot + buttons on top, the map under them at full width */}
                      <div className="min-w-0 basis-full max-sm:order-last sm:flex-1 sm:basis-0">
                        <MapMeta
                          id={m.id}
                          map={m}
                          diff
                          note={
                            <>
                              {out && <div className="text-xs font-display font-bold text-rose-hi">{t.admin.outsideLayout}</div>}
                              {tag}
                              {checks.get(m.id)?.dmca && <div className="text-xs font-display font-bold text-rose-hi">{t.admin.mapDmca}</div>}
                            </>
                          }
                        />
                      </div>
                      {edit && (
                        <div className="ml-auto flex items-center gap-1.5">
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
