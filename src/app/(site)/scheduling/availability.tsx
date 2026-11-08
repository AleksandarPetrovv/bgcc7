"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil } from "lucide-react";
import { SlantButton } from "@/components/site/slant";
import { AnimatePresence, motion } from "motion/react";
import { TeamPfp } from "@/components/site/pfp";
import { useDict, useLang } from "@/components/site/lang";
import { hourKeys } from "@/lib/schedule";
import { addDays, dayFmt as fmt, dayHead } from "@/lib/time";
import { cn } from "@/lib/utils";
import { at } from "@/components/site/rich";
import { setBusy } from "./actions";
import type { Side } from "./sched-card";

const dayLong = (date: string, lang: string) => {
  const n = +date.slice(8, 10);
  const [m, w] = [fmt(date, lang, { month: "long" }), fmt(date, lang, { weekday: "long" })];
  return lang === "bg" ? `${n} ${m}, ${w}` : `${m} ${n}, ${w}`;
};

export function Availability({ matchId, week, busy, me, opp, viewer, editable }: { matchId: string; week: { min: string; max: string }; busy: Record<number, string[]>; me: Side; opp: Side; viewer: number; editable: boolean }) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();
  const keys = hourKeys(week.min, week.max);
  // midnight closes the evening before it: shown as the last row of the previous day
  const keyOf = (d: string, h: number) => `${h ? d : addDays(d, 1)}T${String(h).padStart(2, "0")}`;
  const days = [...new Set(keys.filter((k) => !k.endsWith("T00")).map((k) => k.slice(0, 10)))];
  const hours = [...new Set(keys.map((k) => +k.slice(11)))].sort((a, b) => (a || 24) - (b || 24));
  const valid = new Set(keys);
  const players = [...me.players.map((id, i) => ({ id, name: me.names[i] ?? String(id), team: "me" as const })), ...opp.players.map((id, i) => ({ id, name: opp.names[i] ?? String(id), team: "opp" as const }))];
  const canEdit = editable && players.some((p) => p.id === viewer);
  const [didSave, setDidSave] = useState(false);
  const saved = (id: number) => id in busy || (id === viewer && didSave);
  const [editing, setEditing] = useState(() => canEdit && !(viewer in busy));
  const [mine, setMine] = useState(() => new Set(busy[viewer] ?? []));
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState(false);
  const live = canEdit && editing;
  const paint = useRef<boolean | null>(null);
  const ptr = useRef("");
  const [tip, setTip] = useState<{ k: string; d: string; h: number; r: DOMRect; touch: boolean } | null>(null);
  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    if (tip.touch) window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", esc);
    };
  }, [tip]);

  const apply = (k: string, on: boolean) =>
    setMine((cur) => {
      if (cur.has(k) === on) return cur;
      const next = new Set(cur);
      if (on) next.add(k);
      else next.delete(k);
      return next;
    });
  const edit = () => {
    setMine(new Set(busy[viewer] ?? []));
    setErr(false);
    setEditing(true);
  };
  const save = async () => {
    setPending(true);
    const r = await setBusy(matchId, [...mine]).catch(() => ({ ok: false }));
    setPending(false);
    if (!r.ok) return setErr(true);
    setDidSave(true);
    setEditing(false);
    router.refresh();
  };
  useEffect(() => {
    const up = () => (paint.current = null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const busyOf = (id: number, k: string) => (id === viewer ? mine.has(k) : (busy[id] ?? []).includes(k));

  return (
    <div className="pb-5">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {players.map((p, i) => (
          <span key={p.id} style={at(2.3, i, 0.08)} className={cn("in-up inline-flex items-end gap-1.5 text-xs font-display", p.id === viewer ? "font-black text-paper" : "font-bold text-ash")}>
            <TeamPfp id={p.id} className="size-5" />
            <span className="flex flex-col items-center gap-1">
              <span className="grid h-3.5 place-items-center">
                {saved(p.id) && !(p.id === viewer && editing) ? <Check className="size-3.5 text-balkan-hi" strokeWidth={3.5} aria-hidden /> : <span className="text-[0.75rem] font-black leading-none text-paper">?</span>}
              </span>
              <span className="leading-5">{p.name}</span>
            </span>
          </span>
        ))}
      </div>
      <p style={at(2.5)} className="in-up mb-3 text-center text-xs font-bold text-ash">{live ? t.sched.availHint : t.sched.availView}</p>
      <div className={cn("mx-auto grid max-w-md select-none transition-[opacity,filter] duration-300", canEdit && !editing && "opacity-60 saturate-50")} style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <span />
        {days.map((d, i) => (
          <span key={d} style={at(2.6, i, 0.06)} className="in-drop pb-1 text-center text-[0.7rem] font-display font-bold text-ash">
            {dayHead(d, lang)}
          </span>
        ))}
        {hours.map((h, r) => (
          <div key={h} className="contents">
            <span style={at(2.7, r, 0.05)} className="in-left num pr-2 text-right text-[0.7rem] leading-6 text-ash">{String(h).padStart(2, "0")}:00</span>
            {days.map((d) => {
              const k = keyOf(d, h);
              if (!valid.has(k)) return <span key={k} />;
              const out = players.filter((p) => busyOf(p.id, k));
              const label = `${dayLong(h ? d : addDays(d, 1), lang)} ${String(h).padStart(2, "0")}:00${out.length ? ` · ${t.sched.cantPlay(out.map((p) => p.name).join(", "), out.length)}` : ""}`;
              return (
                <button
                  key={k}
                  type="button"
                  aria-disabled={!live}
                  style={at(2.7, r, 0.05)}
                  aria-label={label}
                  aria-pressed={mine.has(k)}
                  onPointerDown={(e) => {
                    ptr.current = e.pointerType;
                    if (!live || e.pointerType !== "mouse") return;
                    paint.current = !mine.has(k);
                    apply(k, paint.current);
                  }}
                  onPointerEnter={(e) => {
                    if (paint.current != null) apply(k, paint.current);
                    else if (e.pointerType === "mouse") setTip({ k, d: h ? d : addDays(d, 1), h, r: e.currentTarget.getBoundingClientRect(), touch: false });
                  }}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setTip((cur) => (cur?.k === k ? null : cur))}
                  onClick={(e) => {
                    if (ptr.current !== "mouse" || e.detail === 0) setTip({ k, d: h ? d : addDays(d, 1), h, r: e.currentTarget.getBoundingClientRect(), touch: true });
                    if (!live || (ptr.current === "mouse" && e.detail > 0)) return;
                    apply(k, !mine.has(k));
                  }}
                  className={cn(
                    // own transparent border instead of a grid gap: 1px gaps vanish at fractional sizes
                    "in-up relative flex h-7 items-center justify-center gap-0.5 border border-transparent bg-clip-padding transition-colors duration-150",
                    out.length ? "bg-slate" : "bg-balkan/15",
                    live ? "cursor-pointer hover:brightness-95" : "cursor-default",
                    mine.has(k) && "outline outline-1 -outline-offset-1 outline-crimson",
                  )}
                >
                  {out.length ? (
                    out.map((p) => (
                      <TeamPfp key={p.id} id={p.id} className="size-[1.15rem]" />
                    ))
                  ) : (
                    <Check className="size-3.5 text-white/25" strokeWidth={3} aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {canEdit && (
        <div style={at(2.7, hours.length + 1, 0.05)} className="in-up flex flex-col items-center gap-2 pt-5">
          {editing ? (
            <SlantButton onClick={save} disabled={pending} className="px-7 py-2">
              {pending ? "…" : t.sched.availSave}
            </SlantButton>
          ) : (
            <SlantButton tone="outline" onClick={edit} className="px-6 py-2">
              <Pencil className="size-3.5" /> {t.sched.availEdit}
            </SlantButton>
          )}
          {err && <p className="text-xs font-bold text-rose-hi">{t.sched.availState.error}</p>}
        </div>
      )}
      <AnimatePresence>{tip && <Tip key={tip.k} tip={tip} out={players.filter((p) => busyOf(p.id, tip.k))} lang={lang} />}</AnimatePresence>
    </div>
  );
}

function Tip({ tip, out, lang }: { tip: { d: string; h: number; r: DOMRect }; out: { id: number; name: string; team: "me" | "opp" }[]; lang: string }) {
  const t = useDict();
  if (!out.length) return null;
  const flip = tip.r.right + 280 > window.innerWidth;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onPointerDown={(e) => e.stopPropagation()}
      role="status"
      className="fixed z-50 flex max-w-[16rem] items-center gap-3 border border-line bg-coal px-3 py-2 shadow-lg"
      style={{ top: Math.round(tip.r.top), ...(flip ? { right: Math.round(window.innerWidth - tip.r.left + 6) } : { left: Math.round(tip.r.right + 6) }) }}
    >
      <ul className="grid shrink-0 gap-1">
        {out.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5 text-xs font-display font-bold text-paper">
            <TeamPfp id={p.id} className="size-[1.15rem]" />
            {p.name}
          </li>
        ))}
      </ul>
      <p className="text-xs text-ash">{t.sched.cantPlayOn(`${dayLong(tip.d, lang)}, ${String(tip.h).padStart(2, "0")}:00`, out.length)}</p>
    </motion.div>
  );
}
