"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { GripVertical, Minus, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { DEFAULT_PLAN, newId, PLAN_MODS, roundStats, sortMaps, type Plan, type PlanCat, type PlanMod, type PlanRound } from "@/lib/format-plan";
import { cn } from "@/lib/utils";
import { resetPlan, savePlan } from "./actions";

const COLOR: Record<PlanMod | "FM", string> = {
  NM: "var(--color-mod-nm)",
  HD: "var(--color-mod-hd)",
  HR: "var(--color-mod-hr)",
  DT: "var(--color-mod-dt)",
  FM: "var(--color-mod-fm)",
};

const Edit = createContext(false);
const v = (o: Record<string, string | number>) => o as React.CSSProperties;

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const edit = useContext(Edit);
  return (
    <div className="flex h-9 -skew-x-12 border border-line" role="group" aria-label={label}>
      {edit && (
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} −`} className="grid w-8 place-items-center text-ash transition-colors hover:bg-white/[0.06] hover:text-paper disabled:opacity-30">
          <Minus className="size-3.5 skew-x-12" strokeWidth={3} />
        </button>
      )}
      <span className={cn("num grid w-9 place-items-center bg-ink/60 text-lg leading-none", edit && "border-x border-line")}>
        <span className="skew-x-12">{value}</span>
      </span>
      {edit && (
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} +`} className="grid w-8 place-items-center text-ash transition-colors hover:bg-white/[0.06] hover:text-paper disabled:opacity-30">
          <Plus className="size-3.5 skew-x-12" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

function Tile({ mod, note, title, onNote, onRemove, from }: { mod: PlanMod | "FM"; note: string; title: string; onNote: (s: string) => void; onRemove?: () => void; from?: string }) {
  const t = useDict();
  const edit = useContext(Edit);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const c = COLOR[mod];
  const shown = note || from || "";
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => e.target instanceof Node && !box.current?.contains(e.target) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <motion.span ref={box} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ type: "spring", stiffness: 520, damping: 34 }} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn("relative flex h-16 w-40 -skew-x-6 flex-col items-start justify-start gap-0.5 border px-3 py-1.5 text-left transition-shadow", open && "shadow-[3px_3px_0_0_var(--color-rose-deep)]")}
        style={{ borderColor: c, background: `color-mix(in srgb, ${c} ${open ? 26 : 12}%, transparent)` }}
      >
        <span className="skew-x-6 text-xs font-black" style={{ color: c }}>
          {mod}
        </span>
        <span className={cn("line-clamp-2 skew-x-6 text-[0.72rem] font-semibold leading-snug", shown ? "text-paper/85" : "text-ash/50")}>{shown || "—"}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 top-full z-30 mt-2 w-72 origin-top-left border border-line bg-coal shadow-[5px_5px_0_0_var(--color-rose-deep)]"
          >
            <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: c }} aria-hidden />
            <div className="flex items-center gap-2 border-b border-line bg-ink/60 px-3 py-2">
              <span className="-skew-x-12 border px-1.5 text-xs font-black" style={{ borderColor: c, color: c }}>
                <span className="inline-block skew-x-12">{mod}</span>
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-black uppercase tracking-wide text-paper/80">{title}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label={t.admin.close} className="grid size-6 place-items-center text-ash hover:text-paper">
                <X className="size-3.5" />
              </button>
            </div>
            <textarea
              autoFocus={edit}
              readOnly={!edit}
              value={shown}
              maxLength={300}
              rows={4}
              onChange={(e) => onNote(e.target.value === from ? "" : e.target.value)}
              placeholder={edit ? t.admin.fp.notePh : t.admin.fp.noNote}
              className="adm-bare block w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-paper shadow-none outline-none placeholder:text-ash/60"
            />
            {edit && onRemove && (
              <div className="flex justify-end border-t border-line px-2 py-1.5">
                <button type="button" onClick={onRemove} className="flex items-center gap-1.5 px-2 py-1 text-[0.65rem] font-black uppercase tracking-wide text-ash transition-colors hover:text-rose-hi">
                  <Trash2 className="size-3.5" /> {t.admin.fp.removeMap}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.span>
  );
}

const rowCls = "flex flex-wrap items-center gap-x-3 gap-y-2 border border-line bg-ink/40 p-2.5";
const nameCls = "w-32 min-w-0 bg-transparent text-sm font-black uppercase tracking-wide outline-none focus:text-rose-hi sm:w-40";

function CatRow({ c, onChange, onRemove, prev }: { c: PlanCat; onChange: (c: PlanCat) => void; onRemove: () => void; prev: PlanRound[] }) {
  const t = useDict();
  const edit = useContext(Edit);
  const drag = useDragControls();
  const setMap = (id: string, note: string) => onChange({ ...c, maps: c.maps.map((m) => (m.id === id ? { ...m, note } : m)) });
  const inherit = (mapId: string) => {
    for (const r of [...prev].reverse()) {
      const note = r.cats.find((x) => x.id === c.id)?.maps.find((m) => m.id === mapId)?.note;
      if (note) return note;
    }
  };
  const add = (mod: PlanMod) => onChange({ ...c, maps: sortMaps([...c.maps, { id: newId(), mod, note: "" }]) });
  return (
    <Reorder.Item value={c} dragListener={false} dragControls={drag} whileDrag={{ scale: 1.01, boxShadow: "6px 6px 0 0 var(--color-rose-deep)", zIndex: 10 }} className={cn(rowCls, "relative")}>
      {edit ? (
        <button type="button" onPointerDown={(e) => drag.start(e)} aria-label={t.admin.fp.drag} title={t.admin.fp.drag} className="-mx-1 grid h-8 w-6 cursor-grab touch-none place-items-center text-ash transition-colors hover:text-paper active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span className="-mx-1 w-6" />
      )}
      <input value={c.name} readOnly={!edit} maxLength={30} onChange={(e) => onChange({ ...c, name: e.target.value })} aria-label={t.admin.fp.category} className={nameCls} />
      <span className="num w-6 text-center text-sm text-ash">{c.maps.length}</span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {sortMaps(c.maps).map((m) => (
            <Tile key={m.id} mod={m.mod} note={m.note} from={inherit(m.id)} title={c.name} onNote={(s) => setMap(m.id, s)} onRemove={() => onChange({ ...c, maps: c.maps.filter((x) => x.id !== m.id) })} />
          ))}
        </AnimatePresence>
      </div>
      {edit && (
        <>
          <div className="flex flex-wrap gap-1">
            {PLAN_MODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => add(m)}
                className="h-7 -skew-x-12 border border-line px-1.5 text-[0.62rem] font-black text-ash transition-colors hover:border-[var(--m)] hover:bg-[var(--m)] hover:text-ink"
                style={v({ "--m": COLOR[m] })}
              >
                <span className="inline-block skew-x-12">+{m}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={onRemove} aria-label={t.admin.fp.removeCat} className="grid size-7 place-items-center text-ash transition-colors hover:text-rose-hi">
            <X className="size-4" />
          </button>
        </>
      )}
    </Reorder.Item>
  );
}

function RoundCard({ r, onChange, prev }: { r: PlanRound; onChange: (r: PlanRound) => void; prev: PlanRound[] }) {
  const t = useDict();
  const edit = useContext(Edit);
  const s = roundStats(r);
  const total = PLAN_MODS.reduce((n, m) => n + s.tally[m], 0);
  const setCat = (k: number, c: PlanCat) => onChange({ ...r, cats: r.cats.map((x, j) => (j === k ? c : x)) });
  const fill = Math.min(1, s.ratio);
  const tbPrev = [...prev].reverse().find((x) => x.tbNote);
  const tbFrom = tbPrev?.tbNote;

  return (
    <section className="relative border border-line bg-coal">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-rose" aria-hidden />
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line px-4 py-3 sm:px-5">
        <span className="heading-slam -skew-x-12 bg-rose px-2.5 py-1 text-xl leading-none text-white shadow-[3px_3px_0_0_var(--color-rose-deep)]">
          <span className="inline-block skew-x-12">BO{s.bestOf}</span>
        </span>
        <h2 className="heading-slam min-w-0 flex-1 text-2xl sm:text-3xl">{t.rounds[r.name] ?? r.name}</h2>
        <label className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-ash">
          {t.admin.fp.firstTo}
          <Stepper value={r.firstTo} min={1} max={15} onChange={(n) => onChange({ ...r, firstTo: n })} label={t.admin.fp.firstTo} />
        </label>
        <label className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-ash">
          {t.admin.fp.bans}
          <Stepper value={r.bans} min={0} max={6} onChange={(n) => onChange({ ...r, bans: n })} label={t.admin.fp.bans} />
        </label>
      </header>

      <div className="grid grid-cols-2 border-b border-line sm:grid-cols-4">
        {[
          [t.admin.fp.maps, s.maps],
          [t.admin.fp.picks, s.picks],
          [t.admin.fp.open, s.open],
          [t.admin.fp.used, `${Math.round(s.ratio * 100)}%`],
        ].map(([k, n], j) => (
          <div key={String(k)} className={cn("px-4 py-3 sm:px-5", j % 2 && "border-l border-line", j > 1 && "border-t border-line sm:border-t-0", j === 2 && "sm:border-l")}>
            <div className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-ash">{k}</div>
            <div className={cn("num mt-1 text-3xl leading-none", j === 3 && (s.ratio > 0.85 ? "text-rose-hi" : s.ratio < 0.5 ? "text-[#e8c547]" : "text-balkan"))}>{n}</div>
            {j === 3 && (
              <div className="mt-2 h-1 bg-line">
                <motion.div className={cn("h-full", s.ratio > 0.85 ? "bg-rose" : s.ratio < 0.5 ? "bg-[#e8c547]" : "bg-balkan")} animate={{ width: `${fill * 100}%` }} transition={{ type: "spring", stiffness: 260, damping: 30 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 pt-4 sm:px-5">
        <div className="flex h-3 overflow-hidden bg-line">
          {PLAN_MODS.filter((m) => s.tally[m]).map((m) => (
            <motion.div key={m} layout className="h-full" style={{ background: COLOR[m], flexGrow: s.tally[m] }} transition={{ type: "spring", stiffness: 300, damping: 32 }} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-black">
          {PLAN_MODS.filter((m) => s.tally[m]).map((m) => (
            <span key={m} style={{ color: COLOR[m] }}>
              {s.tally[m]} {m} <span className="num font-bold text-ash">{total ? Math.round((s.tally[m] / total) * 100) : 0}%</span>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2 p-4 sm:p-5">
        <Reorder.Group axis="y" values={r.cats} onReorder={(cats) => onChange({ ...r, cats })} className="space-y-2">
          {r.cats.map((c, k) => (
            <CatRow key={c.id} c={c} prev={prev} onChange={(x) => setCat(k, x)} onRemove={() => onChange({ ...r, cats: r.cats.filter((_, j) => j !== k) })} />
          ))}
        </Reorder.Group>
        <div className={rowCls}>
          <span className="-mx-1 w-6" />
          <span className={cn(nameCls, "text-paper")}>{t.admin.fp.tb}</span>
          <span className="w-6" />
          <div className="flex min-w-0 flex-1">
            <Tile mod="FM" note={r.tbNote} from={tbFrom} title={t.admin.fp.tb} onNote={(tbNote) => onChange({ ...r, tbNote })} />
          </div>
        </div>
        {edit && (
          <button
            type="button"
            onClick={() => onChange({ ...r, cats: [...r.cats, { id: newId(), name: t.admin.fp.newCat, maps: [] }] })}
            className="flex h-10 w-full -skew-x-6 items-center justify-center gap-2 border border-dashed border-line text-xs font-black uppercase tracking-wide text-ash transition-colors hover:border-rose hover:text-rose-hi"
          >
            <span className="flex skew-x-6 items-center gap-2">
              <Plus className="size-3.5" strokeWidth={3} /> {t.admin.fp.addCat}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

export function FormatEditor({ initial, edit }: { initial: Plan; edit: boolean }) {
  const t = useDict();
  const [plan, setPlan] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<"ok" | "err" | null>(null);
  const [tab, setTab] = useState(0);
  const dirty = JSON.stringify(plan) !== saved;
  const setRound = (k: number, r: PlanRound) => setPlan((p) => ({ rounds: p.rounds.map((x, j) => (j === k ? r : x)) }));

  const save = () =>
    start(async () => {
      const r = await savePlan(plan).catch(() => null);
      if (r?.ok) setSaved(JSON.stringify(plan));
      setFlash(r?.ok ? "ok" : "err");
      setTimeout(() => setFlash(null), 2500);
    });
  const reset = () => {
    if (!window.confirm(t.admin.fp.confirmReset)) return;
    start(async () => {
      const r = await resetPlan().catch(() => null);
      if (r?.ok) {
        setPlan(DEFAULT_PLAN);
        setSaved(JSON.stringify(DEFAULT_PLAN));
      }
    });
  };

  return (
    <Edit.Provider value={edit}>
      <div className="space-y-6 pb-24">
        <div className="in-up overflow-x-auto border border-line bg-coal">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[0.62rem] font-black uppercase tracking-[0.14em] text-ash">
                <th className="px-4 py-2.5">{t.admin.fp.round}</th>
                <th className="px-3 py-2.5">Bo</th>
                <th className="px-3 py-2.5">{t.admin.fp.maps}</th>
                <th className="px-3 py-2.5">{t.admin.fp.picks}</th>
                <th className="px-3 py-2.5">{t.admin.fp.open}</th>
                <th className="w-1/3 px-4 py-2.5">{t.admin.fp.mods}</th>
              </tr>
            </thead>
            <tbody>
              {plan.rounds.map((r, k) => {
                const s = roundStats(r);
                return (
                  <tr key={k} onClick={() => setTab(k)} className={cn("cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-white/[0.03]", k === tab && "bg-rose/10")}>
                    <td className="px-4 py-2.5 font-black">{t.rounds[r.name] ?? r.name}</td>
                    <td className="num px-3 py-2.5 text-lg text-rose-hi">{s.bestOf}</td>
                    <td className="num px-3 py-2.5 text-lg">{s.maps}</td>
                    <td className="num px-3 py-2.5 text-lg">{s.picks}</td>
                    <td className="num px-3 py-2.5 text-lg">{s.open}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex h-2.5 overflow-hidden bg-line">
                        {PLAN_MODS.filter((m) => s.tally[m]).map((m) => (
                          <div key={m} title={`${s.tally[m]} ${m}`} style={{ background: COLOR[m], flexGrow: s.tally[m] }} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div role="tablist" aria-label={t.admin.fp.round} className="flex flex-wrap gap-2">
          {plan.rounds.map((r, k) => {
            const on = k === tab;
            return (
              <button
                key={r.slug}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(k)}
                className={cn("relative flex h-11 -skew-x-12 items-center border px-4 transition-colors duration-200", on ? "border-rose text-white" : "border-line text-ash hover:border-paper/40 hover:text-paper")}
              >
                {on && <motion.span layoutId="format-tab" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 bg-rose shadow-[3px_3px_0_0_var(--color-rose-deep)]" />}
                <span className="relative flex skew-x-12 items-center gap-2 text-sm font-black uppercase">
                  {t.rounds[r.name] ?? r.name}
                  <span className={cn("num text-xs", on ? "opacity-80" : "text-ash")}>BO{roundStats(r).bestOf}</span>
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={plan.rounds[tab].slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <RoundCard r={plan.rounds[tab]} prev={plan.rounds.slice(0, tab)} onChange={(x) => setRound(tab, x)} />
          </motion.div>
        </AnimatePresence>

        {edit && (
          <div className="fixed inset-x-4 bottom-4 z-40 flex justify-end gap-3 sm:inset-x-auto sm:right-6">
            <AnimatePresence>
              {flash && (
                <motion.span
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className={cn("self-center text-xs font-black uppercase tracking-wide", flash === "ok" ? "text-balkan" : "text-rose-hi")}
                >
                  {flash === "ok" ? t.admin.saved : t.admin.error}
                </motion.span>
              )}
            </AnimatePresence>
            <Btn type="button" tone="outline" onClick={reset} disabled={pending} className="bg-ink">
              <RotateCcw className="size-3.5" /> {t.admin.fp.reset}
            </Btn>
            <Btn type="button" onClick={save} disabled={pending || !dirty} className="shadow-[4px_4px_0_0_var(--color-rose-deep)]">
              {pending ? t.admin.saving : t.admin.fp.save}
            </Btn>
          </div>
        )}
      </div>
    </Edit.Provider>
  );
}
