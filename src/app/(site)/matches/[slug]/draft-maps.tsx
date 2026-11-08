"use client";

import { AnimatePresence, motion } from "motion/react";
import { Crown, Eye, Settings, Star } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { EASE } from "@/lib/ease";
import { fmtLen, type Beatmap } from "@/lib/data";
import { type DraftStep, pickable, type Side, TB } from "@/lib/draft";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import { slotColor } from "@/lib/format-plan";
import { modHi, modOn, TEAM } from "@/lib/theme";
import { CopyId } from "./draft-popups";
import { MODS } from "@/lib/mods";

export type Pool = { category: string; color?: string; maps: Beatmap[] }[];
export type Used = Map<string, DraftStep & { n: number }>;

export function MapGrid({
  pools,
  used,
  canTap,
  sel,
  onSel,
  me,
  admin,
  names,
  onPeek,
}: {
  pools: Pool;
  used: Used;
  canTap: (slot: string) => boolean;
  sel: string | null;
  onSel: (slot: string | null) => void;
  me: Side | null;
  admin: boolean;
  names: [string, string];
  onPeek: (slot: string) => void;
}) {
  const t = useDict();
  const name = (s: Side) => names[s - 1];
  return (
    <section className="mt-8 space-y-6">
      {pools.map((p, pi) => {
        const skill = !!p.color;
        const mod = { label: MODS[p.category]?.label ?? p.category, color: p.color ?? MODS[p.category]?.color ?? "var(--rose)" };
        const light = modOn(mod.color) === "var(--on-fill)";
        return (
          <div key={p.category}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.5,
                ease: EASE,
                delay: 0.3 + pi * 0.06,
              }}
              className={cn("relative isolate mb-2 inline-flex items-center gap-2 px-3 py-1 text-sm font-display font-bold", light ? "text-on-fill" : "text-white")}
            >
              <SlantBg style={{ background: mod.color }} />
              <span>{mod.label}</span>
            </motion.div>
            <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3 @[100rem]:grid-cols-4">
              {p.maps.map((m, k) => {
                const u = used.get(m.slot);
                const tb = !pickable(m.slot);
                const tap = canTap(m.slot);
                const chosen = sel === m.slot;
                const col = u ? TEAM[u.team] : me ? TEAM[me] : TEAM[1];
                const tbu = !!u && m.slot === TB;
                const grey = u?.kind === "ban" || !!u?.winner || tbu;
                const peek = u?.kind === "pick" && (admin || !!u.winner);
                return (
                  <motion.div
                    key={m.slot}
                    className="relative"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE, delay: 0.35 + pi * 0.06 + k * 0.03 }}
                  >
                    <motion.button
                      type="button"
                      disabled={!tap}
                      onClick={() => tap && onSel(chosen ? null : m.slot)}
                      animate={{ y: chosen ? -3 : 0 }}
                      whileHover={tap ? { y: -3 } : undefined}
                      whileTap={tap ? { scale: 0.97 } : undefined}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        "group relative flex w-full items-stretch overflow-hidden border-2 bg-coal text-left disabled:cursor-default",
                        admin ? "h-28" : "h-24",
                        tb && "border-dashed",
                        tap && "cursor-pointer",
                        grey && "opacity-60 grayscale-[0.85] transition-[filter,opacity] duration-700",
                      )}
                      style={{
                        borderColor: (chosen || u) && !tbu ? col.c : tb ? "var(--line)" : "transparent",
                        boxShadow: chosen ? `5px 5px 0 0 ${col.deep}` : u?.kind === "pick" && !tbu ? `inset 6px 0 0 0 ${col.c}` : undefined,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.cover}
                        alt=""
                        className={cn(
                          "absolute inset-0 size-full object-cover transition duration-700",
                          grey
                            ? "opacity-15 grayscale"
                            : u?.kind === "pick"
                              ? "opacity-50"
                              : "opacity-50 group-enabled:group-hover:opacity-70",
                        )}
                      />
                      <span className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-transparent" aria-hidden />
                      {tap && !chosen && (
                        <span
                          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          style={{ boxShadow: `inset 0 0 0 2px ${col.c}` }}
                          aria-hidden
                        />
                      )}
                      <span
                        className={cn(
                          "heading-slam relative flex w-[5.5rem] shrink-0 items-center justify-center pl-2 pr-1 text-lg sm:w-28 sm:text-2xl",
                          grey && "opacity-40",
                        )}
                        style={{ color: modHi(skill ? mod.color : slotColor(m.slot)) }}
                      >
                        {m.slot}
                      </span>
                      {skill && !tb && MODS[m.mod] && (
                        <span className={cn("absolute bottom-2 right-2.5 isolate px-1.5 text-xs font-display font-black leading-5", grey && "opacity-40")} style={{ color: modHi(MODS[m.mod].color) }}>
                          <SlantBg className="border bg-ink/70" style={{ borderColor: modHi(MODS[m.mod].color) }} />
                          <span className="inline-block">{MODS[m.mod].short}</span>
                        </span>
                      )}
                      <span className={cn("relative flex min-w-0 flex-1 flex-col justify-center pl-1", "pr-3", grey && "opacity-40")}>
                        <span className="truncate text-sm font-display font-black sm:text-base">{m.title}</span>
                        <span className="truncate text-xs text-paper/70">[{m.version}]</span>
                        <span className="num mt-1 flex items-center gap-2.5 text-xs text-ash">
                          <span className="flex items-center gap-0.5 text-gold-hi">
                            <Star className="size-3 fill-current" /> {m.sr.toFixed(2)}
                          </span>
                          <span>{Math.round(m.bpm)}bpm</span>
                          <span>{fmtLen(m.length)}</span>
                        </span>
                        {admin && <CopyId id={m.id} />}
                      </span>
                      {u?.kind === "pick" && u.winner && !tbu && (
                        <motion.span
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className="absolute inset-x-0 bottom-0 flex h-5 origin-left items-center gap-1 pl-3 text-[0.6rem] font-display font-bold text-white"
                          style={{ background: TEAM[u.winner].c }}
                        >
                          <Crown className="size-3 fill-current" /> {t.draft.won(name(u.winner))}
                        </motion.span>
                      )}
                      <AnimatePresence>
                        {u && !tbu && (
                          <motion.span
                            key={u.kind}
                            initial={{
                              scale: 2.4,
                              opacity: 0,
                              rotate: u.kind === "ban" ? -30 : 20,
                            }}
                            animate={{
                              scale: 1,
                              opacity: 1,
                              rotate: 0,
                            }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 17,
                            }}
                            className="pointer-events-none absolute right-3 top-1/2 isolate -translate-y-1/2 px-2 py-0.5 text-center font-display font-bold leading-none"
                            style={{ color: col.hi }}
                          >
                            <span
                              className="absolute inset-0 -z-10 border-[3px]"
                              style={{
                                borderColor: col.c,
                                background: "color-mix(in srgb, var(--ink) 80%, transparent)",
                                rotate: u.kind === "ban" ? "-3deg" : "2deg",
                              }}
                              aria-hidden
                            />
                            <span className="block text-base tracking-wider sm:text-lg">
                              {u.kind === "ban" ? t.draft.banned : u.slot === TB ? t.draft.tiebreaker : t.draft.pick(u.n)}
                            </span>
                            {u.kind === "pick" && <span className="block max-w-28 truncate text-[0.55rem] tracking-wide text-paper/80">{name(u.team)}</span>}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {(u?.kind === "ban" || u?.winner) && !tbu && (
                        <motion.span
                          key={u.winner ?? "ban"}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
                          className="pointer-events-none absolute left-2 right-2 top-1/2 h-[3px] origin-left -rotate-[8deg]"
                          style={{ background: u.winner ? TEAM[u.winner].c : col.c }}
                          aria-hidden
                        />
                      )}
                    </motion.button>
                    {peek && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        onClick={() => onPeek(m.slot)}
                        title={admin ? t.draft.mapSettings : t.draft.fullScores}
                        aria-label={admin ? t.draft.mapSettings : t.draft.fullScores}
                        className="group absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                      >
                        <span className="relative isolate inline-flex h-8 w-12 items-center justify-center text-white transition-[translate] duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5">
                          <SlantBg className="border border-rose bg-rose shadow-[3px_3px_0_0_var(--rose-deep)] transition-[background-color,box-shadow] duration-200 group-hover:bg-rose-hi group-hover:shadow-[5px_5px_0_0_var(--rose-deep)]" />
                          {admin ? <Settings className="size-[18px]" /> : <Eye className="size-[18px]" />}
                        </span>
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
