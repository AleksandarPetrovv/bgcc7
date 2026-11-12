import { LinkTabs } from "@/components/site/tabs";
import { Fragment } from "react";
import { RuleDiamond } from "@/components/site/rule";
import { forbidden, redirect } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Panel, IconAction } from "@/components/admin/form";
import { earlierMapIds, getPoolStages, poolGaps, slotOf } from "@/db/mappools";
import { getPlan, getSkillLayouts } from "@/db/format-plan";
import { subcategoryNames } from "@/lib/format-plan";
import { getMapChecks } from "@/lib/osu-api";
import { getViewer } from "@/lib/authz";
import { cardCover } from "@/lib/data";
import { TagChips } from "./tag-chips";
import { MapMeta, ModChip } from "./map-meta";
import { getDict, getLang } from "@/lib/i18n/server";
import { PackUploader } from "@/components/admin/pack-uploader";
import { can } from "@/lib/roles";
import { modHi } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { deleteMap, moveMap, setSlotMap } from "./actions";
import { SlotInput } from "./slot-input";
import { SlotPop } from "./slot-pop";
import { ReleaseToggle } from "./release-toggle";
import { SwapRow } from "./swap-row";
import Link from "next/link";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";
import { MOD_ORDER, MODS } from "@/lib/mods";

export default async function AdminMappools({ searchParams }: PageProps<"/admin/mappools">) {
  const [t, lang, viewer, stages, sp] = await Promise.all([getDict(), getLang(), getViewer(), getPoolStages(), searchParams]);
  if (!viewer || !can(viewer.roles, "mappools")) forbidden();
  // only hosts put maps into a pool; poolers and testers work in the sheet
  if (!can(viewer.roles, "host")) redirect("/admin/mappools/sheet");
  const stage = stages.find((s) => s.slug === sp.stage) ?? stages[0];
  if (!stage) return null;
  const name = (s: { title: string }) => roundName(t, s.title);
  const [checks, layouts, plan, earlier, gaps] = await Promise.all([getMapChecks(stage.pools.flatMap((p) => p.maps.map((m) => m.id))), getSkillLayouts(), getPlan(), earlierMapIds(stage.id), poolGaps(stage.id)]);
  const missing = [...(gaps?.empty.length ? [t.admin.pf.missingSlots(gaps.empty.join(", "))] : []), ...(gaps?.noPack ? [t.admin.pf.missingPack] : [])];
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

  const starts = sections.map((_, k) => sections.slice(0, k).reduce((n, s) => n + s.items.length, 0));

  // the round tabs stay mounted; everything under them is keyed by stage so it plays its intro again
  return (
    <>
      <LinkTabs
        className="in-left mb-6 [--d:0.15s]"
        label={t.admin.menu.mappools}
        items={stages.map((s) => ({
          href: `/admin/mappools?stage=${s.slug}`,
          active: s.id === stage.id,
          label: name(s),
        }))}
      />
      <Fragment key={stage.slug}>
      {stage.released && <p className="in-up mb-5 text-xs font-display font-bold text-gold-hi [--d:0.2s]">{t.admin.pf.released}</p>}

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
              lead={<ReleaseToggle key={`${stage.id}-${stage.released}`} stageId={stage.id} released={stage.released} missing={missing} className="w-full justify-center" />}
            />
          </div>
        </Panel>

      {sections.length === 0 && (
        <p className="flex flex-wrap items-center gap-3 border-y border-line py-4 text-sm text-ash">
          {t.admin.noLayout}
          {
            <Link href={`/admin/mappools/create?stage=${stage.slug}`} className="font-display font-bold text-rose-hi hover:text-paper">
              {t.admin.poolCreate} →
            </Link>
          }
        </p>
      )}
      {/* a diamond rule half way between one section's last slot and the next section's label */}
      <div className="space-y-7">
        {sections.map(({ key, title, color: accent, items }, pi) => {
          const filled = items.filter((x) => !x.out && mapsOf(x.mod).some((m) => m.order === x.slot)).length;
          const total = items.filter((x) => !x.out).length;
          // sections start once the "done with this pool" panel above has played
          const at = 0.55 + Math.min(pi, 12) * 0.12;
          return (
            <Fragment key={key}>
            {pi > 0 && (
              <div className="in-up relative border-b border-line" style={{ "--d": `${at - 0.06}s` } as React.CSSProperties}>
                <RuleDiamond />
              </div>
            )}
            <section className="relative overflow-x-clip">
              <h2 className="in-up flex items-center gap-3 border-b border-line pb-2 pl-1 text-sm font-display font-bold" style={{ color: modHi(accent), "--d": `${at}s` } as React.CSSProperties}>
                <span className="size-2 shrink-0 rotate-45" style={{ background: accent }} aria-hidden />
                <span className="in-wipe inline-block" style={{ "--d": `${at + 0.1}s` } as React.CSSProperties}>{title}</span>
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
                  // a Pick keeps its suggester's tags; a map set by link falls back to the format's
                  const names = m?.tags.length ? subcategoryNames(plan.subcategories, m.tags) : note ? note.split("\n") : [];
                  const tag = names.length ? <TagChips names={names} color={color} className="mt-1" /> : null;
                  if (!m)
                    return (
                      <SwapRow
                        key={`empty-${mod}-${slot}`}
                        style={{ "--i": Math.min(starts[pi] + i, 12), "--s": "0.07s", "--d": "0.4s" } as React.CSSProperties}
                        className="in-up flex flex-wrap items-center gap-3 bg-[repeating-linear-gradient(135deg,transparent_0_10px,color-mix(in_srgb,var(--rose)_5%,transparent)_10px_20px)] px-3 py-2.5"
                      >
                        <span className={cn("heading-slam shrink-0 whitespace-nowrap text-xl opacity-60", skill ? "w-20" : "w-12")} style={{ color: modHi(color) }}>
                          {tagLabel ?? slotOf(mod, slot)}
                        </span>
                        {chip}
                        <div className="min-w-0 flex-1 basis-60">
                          <SlotInput action={setSlotMap.bind(null, stage.id, mod, slot)} />
                          {tag}
                        </div>
                      </SwapRow>
                    );
                  return (
                    <SwapRow
                      key={m.rowId}
                      style={{ "--i": Math.min(starts[pi] + i, 12), "--s": "0.07s", "--d": "0.4s" } as React.CSSProperties}
                      className={cn("in-up relative isolate flex flex-wrap items-center gap-3 overflow-hidden px-3 py-2", out && "bg-rose/[0.06]")}
                    >
                      {/* the same cover backdrop as the sheet's suggestion rows */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.cover} alt="" className="pointer-events-none absolute inset-0 -z-10 size-full object-cover opacity-[0.09] dark:opacity-[0.06]" />
                      <span className={cn("in-slam heading-slam shrink-0 whitespace-nowrap text-xl", skill ? "w-20" : "w-12")} style={{ color: modHi(color), "--d": "0.45s" } as React.CSSProperties}>
                        {m.slot}
                      </span>
                      {chip}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cardCover(m.cover)} alt="" loading="lazy" decoding="async" className="in-wipe hidden h-10 w-24 object-cover sm:block" style={{ "--d": "0.5s" } as React.CSSProperties} />
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
                              {earlier.has(m.id) && <div className="text-xs font-display font-bold text-rose-hi">{t.admin.pf.earlier}</div>}
                            </>
                          }
                        />
                      </div>
                      {(
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
                            <Trash2 className="size-4 transition-transform group-hover:-translate-y-px" />
                          </IconAction>
                        </div>
                      )}
                    </SwapRow>
                  );
                })}
              </ul>
            </section>
            </Fragment>
          );
        })}
      </div>
      </Fragment>
    </>
  );
}
