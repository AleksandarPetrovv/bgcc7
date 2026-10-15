"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { ChevronDown, GripVertical, Star, Minus, Plus, Trash2, X } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { selectedSubcategories, subcategoryNames, newId, PLAN_MODS, roundStats, sortMaps, type PlanCat, type PlanMod, type PlanRound } from "@/lib/format-plan";
import { cn } from "@/lib/utils";
import { Catalog, Edit } from "./format-context";

const COLOR: Record<PlanMod | "FM", string> = {
  NM: "var(--color-mod-nm)",
  HD: "var(--color-mod-hd)",
  HR: "var(--color-mod-hr)",
  DT: "var(--color-mod-dt)",
  FM: "var(--color-mod-fm)",
};

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

function ModPick({ mod, onMod, label }: { mod: PlanMod; onMod: (mod: PlanMod) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => e.target instanceof Node && !box.current?.contains(e.target) && setOpen(false);
    window.addEventListener("pointerdown", down);
    return () => window.removeEventListener("pointerdown", down);
  }, [open]);
  return (
    <span ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex h-7 -skew-x-12 items-center border px-2.5 transition-colors hover:bg-white/[0.06]"
        style={{ borderColor: COLOR[mod], color: COLOR[mod] }}
      >
        <span className="flex skew-x-12 items-center gap-1 text-xs font-black">
          {mod}
          <ChevronDown className={cn("size-3 transition-transform duration-200", open && "rotate-180")} strokeWidth={3} />
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-10 mt-1.5 flex flex-col gap-1 border border-line bg-ink p-1.5 shadow-[3px_3px_0_0_var(--color-rose-deep)]"
          >
            {PLAN_MODS.map((m) => (
              <button
                key={m}
                type="button"
                role="option"
                aria-selected={m === mod}
                onClick={() => {
                  onMod(m);
                  setOpen(false);
                }}
                className={cn("flex h-7 w-16 -skew-x-12 items-center justify-center border text-xs font-black transition-colors", m === mod ? "text-ink" : "hover:bg-[color-mix(in_srgb,var(--c)_22%,transparent)]")}
                style={{ borderColor: COLOR[m], color: m === mod ? undefined : COLOR[m], background: m === mod ? COLOR[m] : undefined, ...v({ "--c": COLOR[m] }) }}
              >
                <span className="skew-x-12">{m}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

function SrInput({ value, onChange, label }: { value: number | null; onChange: (sr: number | null) => void; label: string }) {
  const edit = useContext(Edit);
  const fmt = (n: number | null) => (n === null ? "" : String(Math.round(n * 100) / 100));
  const [draft, setDraft] = useState({ value, text: fmt(value) });
  const text = draft.value === value ? draft.text : fmt(value);
  const step = (d: number) => {
    const n = Math.min(15, Math.max(0.1, Math.round(((value ?? 6) + d) * 100) / 100));
    setDraft({ value: n, text: fmt(n) });
    onChange(n);
  };
  const btn = "grid w-8 place-items-center text-ash transition-colors hover:bg-white/[0.06] hover:text-paper disabled:opacity-30";
  return (
    <div className="flex h-9 -skew-x-12 border border-line transition-colors focus-within:border-gold" role="group" aria-label={label}>
      {edit && (
        <button type="button" onClick={() => step(-0.1)} aria-label={`${label} −`} className={btn}>
          <Minus className="size-3.5 skew-x-12" strokeWidth={3} />
        </button>
      )}
      <span className={cn("flex w-[4.75rem] items-center justify-center gap-1 bg-ink/60", edit && "border-x border-line")}>
        <Star className="size-3 shrink-0 skew-x-12 fill-current text-gold" />
        <input
          value={text}
          readOnly={!edit}
          inputMode="decimal"
          placeholder="—"
          aria-label={label}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,]/g, "").slice(0, 5);
            const n = Number(raw.replace(",", "."));
            const next = raw && Number.isFinite(n) && n > 0 ? Math.min(15, n) : null;
            setDraft({ value: next, text: raw });
            onChange(next);
          }}
          onBlur={() => setDraft({ value, text: fmt(value) })}
          className="adm-bare num w-11 skew-x-12 border-0 bg-transparent p-0 text-center text-lg leading-none text-paper outline-none placeholder:text-ash"
        />
      </span>
      {edit && (
        <button type="button" onClick={() => step(0.1)} aria-label={`${label} +`} className={btn}>
          <Plus className="size-3.5 skew-x-12" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

function Tile({ mod, ids, title, onSelect, onMod, onRemove }: { mod: PlanMod | "FM"; ids: string[]; title: string; onSelect: (ids: string[]) => void; onMod?: (mod: PlanMod) => void; onRemove?: () => void }) {
  const t = useDict();
  const edit = useContext(Edit);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const c = COLOR[mod];
  const groups = useContext(Catalog);
  const [query, setQuery] = useState("");
  const [popupLeft, setPopupLeft] = useState(0);
  const names = subcategoryNames(groups, ids);
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
    <motion.span ref={box} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ type: "spring", stiffness: 520, damping: 34 }} className={cn("relative inline-flex", open && "z-30")}>
      <button
        type="button"
        onClick={(e) => { setPopupLeft(Math.min(0, window.innerWidth - e.currentTarget.getBoundingClientRect().left - 304)); setOpen((o) => !o); }}
        aria-expanded={open}
        className={cn("relative flex min-h-16 w-40 -skew-x-6 flex-col items-start justify-start gap-0.5 border px-3 py-1.5 text-left transition-shadow", open && "shadow-[3px_3px_0_0_var(--color-rose-deep)]")}
        style={{ borderColor: c, background: `color-mix(in srgb, ${c} ${open ? 26 : 12}%, transparent)` }}
      >
        <span className="skew-x-6 text-xs font-black" style={{ color: c }}>
          {mod}
        </span>
        <span className="flex w-full skew-x-6 flex-col text-[0.72rem] font-semibold leading-snug text-paper/85">{names.length ? names.map((name, i) => <span key={i} className="break-words">{name}</span>) : <span className="text-ash/50">—</span>}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{ left: popupLeft }}
            role="dialog"
            aria-label={title}
            className="absolute top-full z-30 mt-2 w-72 origin-top-left border border-line bg-coal shadow-[5px_5px_0_0_var(--color-rose-deep)]"
          >
            <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: c }} aria-hidden />
            <div className="flex items-center gap-2 border-b border-line bg-ink/60 px-3 py-2">
              {edit && onMod && mod !== "FM" ? (
                <ModPick mod={mod} onMod={onMod} label={t.admin.fp.mods} />
              ) : (
                <span className="-skew-x-12 border px-1.5 text-xs font-black" style={{ borderColor: c, color: c }}>
                  <span className="inline-block skew-x-12">{mod}</span>
                </span>
              )}
              <span className="flex-1" />
              <button type="button" onClick={() => setOpen(false)} aria-label={t.admin.close} className="grid size-6 place-items-center text-ash hover:text-paper">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="p-3">
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.admin.fp.searchSubcategories} aria-label={t.admin.fp.searchSubcategories} className="adm-bare w-full border border-line bg-ink/60 px-2 py-2 text-sm outline-none focus:border-rose" />
            </div>
            <div className="max-h-64 overflow-y-auto overscroll-contain px-3 pb-3">
              {groups.map((group) => {
                const matches = group.items.filter((item) => `${group.name} ${item.name}`.toLowerCase().includes(query.trim().toLowerCase()));
                if (!matches.length) return null;
                return <fieldset key={group.id} className="mb-3 last:mb-0">
                  <legend className="mb-1 text-[0.65rem] font-black uppercase tracking-wide text-ash">{group.name}</legend>
                  {matches.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-paper hover:text-rose-hi">
                    <input type="checkbox" checked={ids.includes(item.id)} disabled={!edit} onChange={(e) => onSelect(e.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))} className="size-4 shrink-0 accent-rose" />
                    {item.name}
                  </label>)}
                </fieldset>;
              })}
              {!groups.some((g) => g.items.some((item) => `${g.name} ${item.name}`.toLowerCase().includes(query.trim().toLowerCase()))) && <p className="text-sm text-ash">{t.admin.fp.noSubcategories}</p>}
            </div>
            {edit && ids.length > 0 && <button type="button" onClick={() => onSelect([])} className="w-full border-t border-line px-3 py-2 text-left text-xs text-ash hover:text-paper">{t.admin.fp.clearSelection}</button>}
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
  const setMap = (id: string, subcategoryIds: string[]) => onChange({ ...c, maps: c.maps.map((m) => (m.id === id ? { ...m, note: "", subcategoryIds } : m)) });
  const add = (mod: PlanMod) => onChange({ ...c, maps: sortMaps([...c.maps, { id: newId(), mod, note: "" }]) });
  return (
    <Reorder.Item value={c} dragListener={false} dragControls={drag} whileDrag={{ scale: 1.01, boxShadow: "6px 6px 0 0 var(--color-rose-deep)", zIndex: 10 }} className={cn(rowCls, "relative focus-within:z-30")}>
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
            <Tile key={m.id} mod={m.mod} ids={selectedSubcategories([...prev, { cats: [c] } as PlanRound], c.id, m.id)} title={c.name} onSelect={(ids) => setMap(m.id, ids)} onMod={(mod) => onChange({ ...c, maps: sortMaps(c.maps.map((x) => x.id === m.id ? { ...x, mod } : x)) })} onRemove={() => onChange({ ...c, maps: c.maps.filter((x) => x.id !== m.id) })} />
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

export function RoundCard({ r, onChange, prev }: { r: PlanRound; onChange: (r: PlanRound) => void; prev: PlanRound[] }) {
  const t = useDict();
  const edit = useContext(Edit);
  const s = roundStats(r);
  const setCat = (k: number, c: PlanCat) => onChange({ ...r, cats: r.cats.map((x, j) => (j === k ? c : x)) });

  return (
    <section className="relative border border-line bg-coal">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-rose" aria-hidden />
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line px-4 py-3 sm:px-5">
        <span className="heading-slam -skew-x-12 bg-rose px-2.5 py-1 text-xl leading-none text-white shadow-[3px_3px_0_0_var(--color-rose-deep)]">
          <span className="inline-block skew-x-12">BO{s.bestOf}</span>
        </span>
        <h2 className="heading-slam min-w-0 flex-1 text-2xl sm:text-3xl">{t.rounds[r.name] ?? r.name}</h2>
        <div className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-ash">
          {t.admin.fp.firstTo}
          <Stepper value={r.firstTo} min={1} max={15} onChange={(n) => onChange({ ...r, firstTo: n })} label={t.admin.fp.firstTo} />
        </div>
        <div className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-ash">
          {t.admin.fp.bans}
          <Stepper value={r.bans} min={0} max={6} onChange={(n) => onChange({ ...r, bans: n })} label={t.admin.fp.bans} />
        </div>
        <div className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-ash">
          {t.admin.fp.targetSr}
          <SrInput value={r.sr ?? null} onChange={(sr) => onChange({ ...r, sr })} label={t.admin.fp.targetSr} />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-px border-b border-line bg-line sm:grid-cols-6">
        {(
          [
            [t.admin.fp.maps, s.maps],
            [t.admin.fp.pickable, s.pickable],
            [t.admin.fp.totalBans, r.bans * 2],
            [t.admin.fp.open, s.open],
            [t.admin.fp.picks, s.picks],
            [t.admin.fp.used, s.open ? `${Math.round(Math.min(1, s.ratio) * 100)}%` : "—"],
          ] as const
        ).map(([k, val]) => (
          <div key={k} className="flex flex-col gap-0.5 bg-coal px-4 py-2.5">
            <span className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-ash">{k}</span>
            <span className="num text-xl leading-none text-paper">{val}</span>
          </div>
        ))}
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
            <Tile mod="FM" ids={selectedSubcategories([...prev, r], "tb")} title={t.admin.fp.tb} onSelect={(tbSubcategoryIds) => onChange({ ...r, tbNote: "", tbSubcategoryIds })} />
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

