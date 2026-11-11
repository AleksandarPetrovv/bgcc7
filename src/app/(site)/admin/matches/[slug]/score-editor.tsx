"use client";

import { useState, useTransition } from "react";
import { Pencil, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ActionForm, Btn, Field } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { MapCard, ModBadge } from "@/components/site/match-dialog";
import { Popup } from "@/components/site/popup";
import { errorText, type ActionError } from "@/lib/action-result";
import { EASE } from "@/lib/ease";
import { slotColor } from "@/lib/format-plan";
import { validPick } from "@/lib/mods";
import { decideWinner, mapWinner, MAX_SCORE, tally } from "@/lib/result";
import type { MapResult, PlayerLine } from "@/lib/scoreboard";
import { modHi } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { saveMatchScores, undoScore, type ScoreChange } from "./actions";
import { ModPick } from "./mod-pick";

type Draft = Record<string, { score?: string; mods?: string[] }>;
type Winner = 0 | 1 | 2;

const WIN_TEXT = ["text-ash", "text-crimson-hi", "text-azure-hi"];
const keyOf = (gameId: number, osuId: number) => `${gameId}:${osuId}`;
const modsOf = (p: PlayerLine) => (p.mods.length ? p.mods : ["NM"]);

export function ScoreEditor({ id, stamp, firstTo, names, maps, wiped }: { id: string; stamp: string; firstTo: number; names: [string, string]; maps: { m: MapResult; multi: boolean }[]; wiped: string[] }) {
  const t = useDict();
  const [draft, setDraft] = useState<Draft>({});
  const [seen, setSeen] = useState(stamp);
  // the page reloaded after a save (or someone else's): start again from what it now shows
  if (seen !== stamp) {
    setSeen(stamp);
    setDraft({});
  }
  const [pick, setPick] = useState<{ open: boolean; k: string; multi: boolean; sel: string[]; name: string } | null>(null);
  const [ask, setAsk] = useState<"maps" | "match" | null>(null);
  const [fail, setFail] = useState<{ error?: ActionError } | null>(null);
  const [pending, start] = useTransition();

  const now = (m: MapResult, p: PlayerLine) => {
    const d = draft[keyOf(m.gameId, p.id)];
    return { score: d?.score ? Number(d.score) : p.score, mods: d?.mods ?? modsOf(p) };
  };

  const view = maps
    .map(({ m }): MapResult => {
      const players = m.players.map((side) => side.map((p) => ({ ...p, ...now(m, p) }))) as [PlayerLine[], PlayerLine[]];
      const [team1, team2] = players.map((side) => side.reduce((n, p) => n + p.score, 0));
      return { ...m, players, team1, team2, winner: mapWinner(team1, team2) };
    })
    .map((m, n, all): MapResult => ({ ...m, running: tally(all.slice(0, n + 1).map((x) => x.winner)) }));

  const changes = maps.flatMap(({ m }) =>
    m.players.flatMap((side, k) =>
      side.flatMap((p): ScoreChange[] => {
        const c = now(m, p);
        const modsChanged = c.score > 0 && c.mods.join("") !== modsOf(p).join("");
        if (c.score === p.score && !modsChanged) return [];
        return [{ gameId: m.gameId, osuId: p.id, side: (k + 1) as 1 | 2, score: c.score, mods: modsChanged ? c.mods : null }];
      }),
    ),
  );

  const was = maps.map(({ m }) => m.winner);
  const mapFlips = maps.flatMap(({ m }, n) => (was[n] !== view[n].winner ? [{ m, from: was[n], to: view[n].winner }] : []));
  const before = decideWinner(tally(was), firstTo);
  const after = decideWinner(tally(view.map((m) => m.winner)), firstTo);
  const matchFlips = before !== after;
  const who = (w: Winner | null, none: string) => (w ? names[w - 1] : none);

  const commit = () =>
    start(async () => {
      setFail(null);
      const r = await saveMatchScores(id, stamp, changes).catch(() => null);
      if (!r?.ok) setFail({ error: r?.error });
    });
  const save = () => (mapFlips.length ? setAsk("maps") : matchFlips ? setAsk("match") : commit());

  const setScore = (k: string, raw: string) => {
    const v = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    if (Number(v) <= MAX_SCORE) setDraft((d) => ({ ...d, [k]: { ...d[k], score: v } }));
  };
  const setMods = (k: string, mods: string[]) => setDraft((d) => ({ ...d, [k]: { ...d[k], mods } }));
  const dropScore = (k: string) => setDraft((d) => ({ ...d, [k]: { mods: d[k]?.mods } }));

  // p is the row as shown (current values), o the row as loaded
  const fields = (n: number, multi: boolean, p: PlayerLine) => {
    const m = maps[n].m;
    const o = m.players.flat().find((x) => x.id === p.id)!;
    const k = keyOf(m.gameId, p.id);
    const played = p.score > 0;
    return (
      <>
        <Field
          inputMode="numeric"
          autoComplete="off"
          value={draft[k]?.score ?? String(o.score)}
          aria-label={t.admin.ms.scoreOf(p.name)}
          onChange={(e) => setScore(k, e.target.value)}
          onBlur={() => draft[k]?.score === "" && dropScore(k)}
          className={cn("adm-tight w-28 shrink-0", p.score !== o.score && "before:!border-gold")}
          inputClassName="num text-right"
        />
        <button
          type="button"
          disabled={!played}
          aria-label={t.admin.ms.modsOf(p.name)}
          onClick={() => setPick({ open: true, k, multi, sel: validPick(p.mods, multi) ? p.mods : [], name: p.name })}
          className="group/mod inline-flex shrink-0 items-center gap-1 p-0.5 disabled:opacity-40"
        >
          <ModBadge mods={p.mods} d="0s" className="px-2 py-1 text-[0.7rem]" />
          <Pencil className="size-3 text-ash transition-colors group-hover/mod:text-paper group-disabled/mod:hidden" aria-hidden />
        </button>
        {!played && <span className="text-[0.6rem] font-display font-bold text-rose-hi">{t.admin.ms.noScore}</span>}
        {o.edited && changes.length === 0 && <ActionForm action={undoScore.bind(null, id, m.gameId, p.id)} submit={t.admin.ms.undo} ghost />}
      </>
    );
  };

  const slotText = (m: MapResult) => (
    <span className="heading-slam text-lg leading-none" style={{ color: modHi(m.slot ? slotColor(m.slot) : undefined) ?? "var(--ash)" }}>
      {m.slot ?? "—"}
    </span>
  );

  return (
    <>
      <div className="in-up mx-auto w-full min-w-0 max-w-4xl space-y-(--gap) border border-line bg-ink py-(--pad) pl-(--px) pr-(--px) [--gap:1.25rem] [--pad:0.75rem] [--px:0.75rem] sm:[--gap:1.5rem] sm:[--pad:1.25rem] sm:[--px:1.25rem]">
        {maps.map(({ m, multi }, n) => (
          <MapCard
            key={m.gameId}
            m={view[n]}
            i={n}
            collapsible
            edit={(p) => fields(n, multi, p)}
            className={cn("-mx-(--px) px-(--px)", n ? "[--up:var(--gap)]" : "[--up:var(--pad)]")}
          />
        ))}
      </div>

      <AnimatePresence>
        {changes.length > 0 && (
          <motion.div
            key="save"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="sticky bottom-4 z-20 mx-auto mt-6 flex w-full max-w-4xl items-center justify-end gap-3"
          >
            {fail && !pending && (
              <span role="status" className="text-xs font-display font-bold text-rose-hi">
                {errorText(t, fail.error)}
              </span>
            )}
            <Btn type="button" disabled={pending} onClick={save}>
              {pending ? t.admin.saving : t.admin.ms.save}
            </Btn>
          </motion.div>
        )}
      </AnimatePresence>

      {pick && (
        <ModPick
          open={pick.open}
          label={t.admin.ms.modsOf(pick.name)}
          sel={pick.sel}
          multi={pick.multi}
          onSel={(sel) => setPick({ ...pick, sel })}
          onDone={(mods) => {
            setMods(pick.k, mods);
            setPick({ ...pick, open: false });
          }}
          onClose={() => setPick({ ...pick, open: false })}
        />
      )}

      <Popup open={ask === "maps"} onClose={() => setAsk(null)} tone="gold" shadow={6} className="p-5 sm:p-6">
        <p className="pr-8 text-base font-display font-black leading-snug text-paper">{t.admin.ms.flipMaps(mapFlips.length)}</p>
        <ul className="mt-4 space-y-2.5">
          {mapFlips.map(({ m, from, to }) => (
            <li key={m.gameId} className="flex flex-wrap items-center gap-x-2.5 text-sm font-display font-bold">
              {slotText(m)}
              <span className={WIN_TEXT[from]}>{who(from, t.admin.ms.draw)}</span>
              <span className="text-ash">→</span>
              <span className={WIN_TEXT[to]}>{who(to, t.admin.ms.draw)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Btn
            type="button"
            onClick={() => {
              setAsk(null);
              if (matchFlips) setAsk("match");
              else commit();
            }}
          >
            {matchFlips ? t.admin.ms.cont : t.admin.ms.save}
          </Btn>
          <Btn type="button" tone="outline" onClick={() => setAsk(null)}>
            {t.sched.cancel}
          </Btn>
        </div>
      </Popup>

      <Popup open={ask === "match"} onClose={() => setAsk(null)} tone="rose" shadow={12} className="max-w-lg border-4 p-6 sm:p-8">
        <div className="flex items-center gap-3 pr-8">
          <TriangleAlert className="size-7 shrink-0 text-rose-hi" aria-hidden />
          <p className="text-lg font-display font-black leading-snug text-rose-hi">{t.admin.ms.flipMatch}</p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xl font-display font-black">
          <span className={WIN_TEXT[before ?? 0]}>{who(before, t.admin.ms.nobody)}</span>
          <span className="text-ash">→</span>
          <span className={WIN_TEXT[after ?? 0]}>{who(after, t.admin.ms.nobody)}</span>
        </div>
        <p className="mt-3 text-sm text-ash">{t.admin.ms.flipMatchMoves}</p>
        {wiped.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-display font-black text-rose-hi">{t.admin.ms.flipWipes}</p>
            <ul className="mt-2 space-y-1 text-sm font-display font-bold">
              {wiped.map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rotate-45 bg-rose" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-ash">{t.admin.ms.flipWipesNote}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ash">{t.admin.ms.flipNoWipes}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Btn
            type="button"
            onClick={() => {
              setAsk(null);
              commit();
            }}
          >
            {t.admin.ms.flipMatchYes}
          </Btn>
          <Btn type="button" tone="outline" onClick={() => setAsk(null)}>
            {t.sched.cancel}
          </Btn>
        </div>
      </Popup>
    </>
  );
}
