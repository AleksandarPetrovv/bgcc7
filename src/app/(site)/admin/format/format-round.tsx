"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { ChevronDown, GripVertical, Star, Minus, Plus, Trash2, X } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { selectedSubcategories, subcategoryNames, newId, MAX_BANS, PLAN_MODS, roundStats, sortMaps, type PlanCat, type PlanMod, type PlanRound } from "@/lib/format-plan";
import { cn, cssVars } from "@/lib/utils";
import { modHi, modOn } from "@/lib/theme";
import { RuleDiamond } from "@/components/site/rule";
import { SlantBg } from "@/components/site/slant";
import { AnchoredPopup, type PopPlace } from "@/components/site/anchored-popup";
import { Catalog, Edit, Intro, useFresh, useIntroWindow } from "./format-context";
import { roundName } from "@/lib/i18n/dict";

const COLOR: Record<PlanMod | "FM", string> = {
  NM: "var(--mod-nm)",
  HD: "var(--mod-hd)",
  HR: "var(--mod-hr)",
  DT: "var(--mod-dt)",
  FM: "var(--mod-fm)",
};


const stepBtn = "group/step relative isolate grid w-8 place-items-center text-ash transition-colors hover:text-paper disabled:opacity-30";
const stepBg = "transition-colors group-hover/step:bg-field";

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const edit = useContext(Edit);
  return (
    <div className="relative isolate flex h-9 p-px" role="group" data-field aria-label={label}>
      <SlantBg className="border border-line" />
      {edit && (
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} −`} className={stepBtn}>
          <SlantBg className={stepBg} />
          <Minus className="size-3.5" strokeWidth={3} />
        </button>
      )}
      <span className="num relative isolate grid w-9 place-items-center text-lg leading-none">
        <SlantBg className={cn("bg-ink/60", edit && "border-x border-line")} />
        {value}
      </span>
      {edit && (
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} +`} className={stepBtn}>
          <SlantBg className={stepBg} />
          <Plus className="size-3.5" strokeWidth={3} />
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
        className="group/mp relative isolate flex h-7 items-center px-2.5"
        style={{ color: modHi(COLOR[mod]) }}
      >
        <SlantBg className="border transition-colors group-hover/mp:bg-field" style={{ borderColor: modHi(COLOR[mod]) }} />
        <span className="flex items-center gap-1 text-xs font-display font-black">
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
            className="absolute left-0 top-full z-10 mt-1.5 flex flex-col gap-1 border border-line bg-ink p-1.5 shadow-[3px_3px_0_0_var(--rose-deep)]"
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
                className="group/opt relative isolate flex h-7 w-16 items-center justify-center text-xs font-display font-black transition-colors"
                style={{ color: m === mod ? modOn(COLOR[m]) : modHi(COLOR[m]), ...cssVars({ "--c": COLOR[m] }) }}
              >
                <SlantBg className={cn("border transition-colors", m !== mod && "group-hover/opt:bg-[color-mix(in_srgb,var(--c)_22%,transparent)]")} style={{ borderColor: COLOR[m], background: m === mod ? COLOR[m] : undefined }} />
                {m}
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
  return (
    <div className="group/sr relative isolate flex h-9 p-px" role="group" data-field aria-label={label}>
      <SlantBg className="border border-line transition-colors group-focus-within/sr:border-gold" />
      {edit && (
        <button type="button" onClick={() => step(-0.1)} aria-label={`${label} −`} className={stepBtn}>
          <SlantBg className={stepBg} />
          <Minus className="size-3.5" strokeWidth={3} />
        </button>
      )}
      <span className="relative isolate flex w-[4.75rem] items-center justify-center gap-1">
        <SlantBg className={cn("bg-ink/60", edit && "border-x border-line")} />
        <Star className="size-3 shrink-0 fill-current text-gold-hi" />
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
          className="adm-bare num w-11 border-0 bg-transparent p-0 text-center text-lg leading-none text-paper outline-none placeholder:text-ash"
        />
      </span>
      {edit && (
        <button type="button" onClick={() => step(0.1)} aria-label={`${label} +`} className={stepBtn}>
          <SlantBg className={stepBg} />
          <Plus className="size-3.5" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

function Tile({ mod, ids, title, onSelect, onMod, onRemove }: { mod: PlanMod | "FM"; ids: string[]; title: string; onSelect: (ids: string[]) => void; onMod?: (mod: PlanMod) => void; onRemove?: () => void }) {
  const t = useDict();
  const edit = useContext(Edit);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const c = COLOR[mod];
  const groups = useContext(Catalog);
  const [query, setQuery] = useState("");
  const names = subcategoryNames(groups, ids);
  const fresh = useFresh();
  const close = useCallback(() => setOpen(false), []);
  const place = useCallback((r: DOMRect): PopPlace => {
    const width = Math.min(288, window.innerWidth - 24);
    return { left: Math.max(12, Math.min(window.innerWidth - width - 12, r.left)), top: r.bottom + 8, width };
  }, []);

  return (
    <motion.span layout data-cascade={fresh || undefined} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ type: "spring", stiffness: 520, damping: 34 }} className={cn("relative inline-flex min-w-0 max-w-full basis-[calc(50%-0.1875rem)] sm:basis-auto", fresh && "in-pop")}>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="relative isolate flex min-h-16 w-full max-w-full sm:w-40 flex-col items-start justify-start gap-0.5 px-2.5 py-1.5 text-left sm:px-3"
      >
        <SlantBg className={cn("-skew-x-6 border transition-shadow", open && "shadow-[3px_3px_0_0_var(--rose-deep)]")} style={{ borderColor: c, background: `color-mix(in srgb, ${c} ${open ? 26 : 14}%, var(--field))` }} />
        <span className="text-xs font-display font-black" style={{ color: modHi(c) }}>
          {mod}
        </span>
        <span className="flex w-full min-w-0 flex-col text-[0.66rem] font-display sm:text-[0.72rem] font-semibold leading-snug text-paper/85">{names.length ? names.map((name, i) => <span key={i} className="truncate">{name}</span>) : <span className="text-ash/50">—</span>}</span>
      </button>
      <AnchoredPopup
        anchor={btn}
        open={open}
        onClose={close}
        place={place}
        chrome={false}
        role="dialog"
        aria-label={title}
        className="z-[70] border border-line bg-coal shadow-[5px_5px_0_0_var(--rose-deep)]"
      >
            <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: c }} aria-hidden />
            <div className="flex items-center gap-2 border-b border-line bg-ink/60 px-3 py-2">
              {edit && onMod && mod !== "FM" ? (
                <ModPick mod={mod} onMod={onMod} label={t.admin.fp.mods} />
              ) : (
                <span className="relative isolate px-1.5 text-xs font-display font-black" style={{ color: modHi(c) }}>
                  <SlantBg className="border" style={{ borderColor: c }} />
                  {mod}
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
                  <legend className="mb-1 text-[0.65rem] font-display font-bold text-ash">{group.name}</legend>
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
                <button type="button" onClick={onRemove} className="flex items-center gap-1.5 px-2 py-1 text-[0.65rem] font-display font-bold text-ash transition-colors hover:text-rose-hi">
                  <Trash2 className="size-3.5" /> {t.admin.fp.removeMap}
                </button>
              </div>
            )}
      </AnchoredPopup>
    </motion.span>
  );
}

const rowCls = "flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-ink py-2.5";
const nameCls = "w-32 min-w-0 bg-transparent text-sm font-display font-black outline-none focus:text-rose-hi sm:w-40";

function CatRow({ c, onChange, onRemove, prev }: { c: PlanCat; onChange: (c: PlanCat) => void; onRemove: () => void; prev: PlanRound[] }) {
  const t = useDict();
  const edit = useContext(Edit);
  const drag = useDragControls();
  const fresh = useFresh();
  const setMap = (id: string, subcategoryIds: string[]) => onChange({ ...c, maps: c.maps.map((m) => (m.id === id ? { ...m, note: "", subcategoryIds } : m)) });
  const add = (mod: PlanMod) => onChange({ ...c, maps: sortMaps([...c.maps, { id: newId(), mod, note: "" }]) });
  return (
    <Reorder.Item value={c} dragListener={false} dragControls={drag} whileDrag={{ scale: 1.01, boxShadow: "6px 6px 0 0 var(--rose-deep)", zIndex: 10 }} data-cascade={fresh || undefined} className={cn(rowCls, "relative focus-within:z-30", fresh && "in-left")}>
      {edit ? (
        <button type="button" onPointerDown={(e) => drag.start(e)} aria-label={t.admin.fp.drag} title={t.admin.fp.drag} className="-mx-1 grid h-8 w-6 cursor-grab touch-none place-items-center max-sm:hidden text-ash transition-colors hover:text-paper active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span className="-mx-1 w-6 max-sm:hidden" />
      )}
      <input value={c.name} readOnly={!edit} maxLength={30} onChange={(e) => onChange({ ...c, name: e.target.value })} aria-label={t.admin.fp.category} data-cascade={fresh || undefined} className={cn(nameCls, "max-sm:mx-auto max-sm:text-center", fresh && "in-wipe")} />
      <span data-cascade={fresh || undefined} className={cn("num w-6 text-center text-sm text-ash max-sm:hidden", fresh && "in-drop")}>{c.maps.length}</span>
      <div className="flex min-w-0 flex-1 basis-full flex-wrap gap-1.5 sm:basis-0">
        <AnimatePresence initial={false} mode="popLayout">
          {sortMaps(c.maps).map((m) => (
            <Tile key={m.id} mod={m.mod} ids={selectedSubcategories([...prev, { cats: [c] } as PlanRound], c.id, m.id)} title={c.name} onSelect={(ids) => setMap(m.id, ids)} onMod={(mod) => onChange({ ...c, maps: sortMaps(c.maps.map((x) => x.id === m.id ? { ...x, mod } : x)) })} onRemove={() => onChange({ ...c, maps: c.maps.filter((x) => x.id !== m.id) })} />
          ))}
        </AnimatePresence>
      </div>
      {edit && (
        <>
          <div data-cascade={fresh || undefined} className={cn("flex flex-1 flex-wrap justify-center gap-1 max-sm:basis-full sm:flex-none sm:justify-start", fresh && "in-right")}>
            {PLAN_MODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => add(m)}
                className="group/add relative isolate h-7 px-1.5 text-[0.62rem] font-display font-black text-ash transition-colors hover:text-[var(--mo)]"
                style={cssVars({ "--m": COLOR[m], "--mo": modOn(COLOR[m]) })}
              >
                <SlantBg className="border border-line transition-colors group-hover/add:border-[var(--m)] group-hover/add:bg-[var(--m)]" />
                +{m}
              </button>
            ))}
          </div>
          <button type="button" onClick={onRemove} aria-label={t.admin.fp.removeCat} className="grid size-7 place-items-center max-sm:absolute max-sm:right-1.5 max-sm:top-1.5 text-ash transition-colors hover:text-rose-hi">
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
  const intro = useIntroWindow();

  return (
    <Intro.Provider value={intro}>
    <section className="in-up relative border-b border-line [--i:0]">
      <RuleDiamond />
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line pb-3">
        <span data-cascade className="in-pop">
          <span className="heading-slam relative isolate inline-block px-2.5 py-1 text-xl leading-none text-white">
            <SlantBg className="bg-rose shadow-[3px_3px_0_0_var(--rose-deep)]" />
            BO{s.bestOf}
          </span>
        </span>
        <h2 data-cascade className="in-wipe heading-slam flex-1 whitespace-nowrap text-2xl sm:text-3xl">{roundName(t, r.name)}</h2>
        <div data-cascade className="in-drop flex items-center gap-2 text-[0.65rem] font-display font-bold text-ash">
          {t.admin.fp.firstTo}
          <Stepper value={r.firstTo} min={1} max={15} onChange={(n) => onChange({ ...r, firstTo: n })} label={t.admin.fp.firstTo} />
        </div>
        <div data-cascade className="in-drop flex items-center gap-2 text-[0.65rem] font-display font-bold text-ash">
          {t.admin.fp.bans}
          <Stepper value={r.bans} min={0} max={MAX_BANS} onChange={(n) => onChange({ ...r, bans: n })} label={t.admin.fp.bans} />
        </div>
        <div data-cascade className="in-drop flex items-center gap-2 text-[0.65rem] font-display font-bold text-ash">
          {t.admin.fp.targetSr}
          <SrInput value={r.sr ?? null} onChange={(sr) => onChange({ ...r, sr })} label={t.admin.fp.targetSr} />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-y-3 border-b border-line py-3 sm:grid-cols-6">
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
          <div key={k} className="flex flex-col gap-0.5 pl-3">
            <span data-cascade className="in-wipe text-[0.62rem] font-display font-bold text-ash">{k}</span>
            <span data-cascade className="in-up num text-xl leading-none text-paper">{val}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 py-4">
        <Reorder.Group axis="y" values={r.cats} onReorder={(cats) => onChange({ ...r, cats })}>
          {r.cats.map((c, k) => (
            <CatRow key={c.id} c={c} prev={prev} onChange={(x) => setCat(k, x)} onRemove={() => onChange({ ...r, cats: r.cats.filter((_, j) => j !== k) })} />
          ))}
        </Reorder.Group>
        <div data-cascade className={cn(rowCls, "in-left")}>
          <span className="-mx-1 w-6 max-sm:hidden" />
          <span data-cascade className={cn(nameCls, "in-wipe text-paper max-sm:mx-auto max-sm:text-center")}>{t.admin.fp.tb}</span>
          <span className="w-6 max-sm:hidden" />
          <div className="flex min-w-0 flex-1 basis-full sm:basis-0">
            <Tile mod="FM" ids={selectedSubcategories([...prev, r], "tb")} title={t.admin.fp.tb} onSelect={(tbSubcategoryIds) => onChange({ ...r, tbNote: "", tbSubcategoryIds })} />
          </div>
        </div>
        {edit && (
          <div data-cascade className="in-up">
          <button
            type="button"
            onClick={() => onChange({ ...r, cats: [...r.cats, { id: newId(), name: t.admin.fp.newCat, maps: [] }] })}
            className="group/cat relative isolate flex h-10 w-full items-center justify-center gap-2 text-xs font-display font-bold text-ash transition-colors hover:text-rose-hi"
          >
            <SlantBg className="-skew-x-6 border border-dashed border-line transition-colors group-hover/cat:border-rose" />
            <span className="flex items-center gap-2">
              <Plus className="size-3.5" strokeWidth={3} /> {t.admin.fp.addCat}
            </span>
          </button>
          </div>
        )}
      </div>
    </section>
    </Intro.Provider>
  );
}

