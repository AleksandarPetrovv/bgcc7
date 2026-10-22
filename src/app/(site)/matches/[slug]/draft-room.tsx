"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Ban, Crown, Swords, WifiOff } from "lucide-react";
import { Sparkle } from "@/components/site/graphics";
import { useDict } from "@/components/site/lang";
import { EASE } from "@/components/site/motion";
import type { Match } from "@/lib/data";
import { Confetti } from "@/components/site/confetti";
import { deadline, limitOf, pickable, rollWinner, scoreOf, turnOf, type DraftView, type Side, type Turn } from "@/lib/draft";
import { cn } from "@/lib/utils";
import { TEAM } from "@/lib/theme";
import { resetDraft } from "@/app/(site)/admin/draft/actions";
import { LobbyPanel } from "./lobby-panel";
import { LobbyHelp, lobbyPost } from "./lobby-popups";
import { useSSE } from "@/components/site/use-sse";
import { MatchDialog } from "@/components/site/match-dialog";
import { ChoosePopup, Portal, ResetPopup, ScoresPopup, TimerDock, Waiting, WinnerPopup } from "./draft-popups";
import { AdminBar, Rolls, Sequence, TeamsHeader, type TeamInfo } from "./draft-parts";
import { MapGrid, type Pool } from "./draft-maps";

function isDraftResponse(value: unknown): value is DraftView {
  const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
  const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  const side = (v: unknown) => v === 1 || v === 2;
  const roll = (v: unknown) => v === null || (number(v) && Number.isInteger(v) && v >= 1 && v <= 100);
  const time = (v: unknown) => v === null || (typeof v === "string" && Number.isFinite(Date.parse(v)));
  const step = (v: unknown) => object(v) && side(v.team) && (v.kind === "ban" || v.kind === "pick") && typeof v.slot === "string" &&
    (v.winner === undefined || side(v.winner)) && [v.skip, v.auto].every((flag) => flag === undefined || typeof flag === "boolean");
  const undo = (v: unknown) => v == null || (object(v) && (
    v.kind === "winner" ? typeof v.slot === "string" && side(v.winner) :
    v.kind === "step" ? step(v.step) :
    v.kind === "choice" ? typeof v.choice === "string" :
    v.kind === "rolls" && roll(v.roll1) && roll(v.roll2)
  ));
  return object(value) && typeof value.open === "boolean" && typeof value.stageSlug === "string" && value.stageSlug.length > 0 &&
    [value.bans, value.rev, value.firstTo].every((v) => number(v) && Number.isInteger(v) && v >= 0) &&
    (value.banOrder === "abab" || value.banOrder === "abba") && roll(value.roll1) && roll(value.roll2) &&
    (value.choice === null || value.choice === "pick" || value.choice === "ban") &&
    Array.isArray(value.steps) && value.steps.every(step) &&
    [value.turnAt, value.pausedAt, value.pauseUntil].every(time) && number(value.now) &&
    [value.banSecs, value.pickSecs].every((v) => number(v) && v >= 0) && typeof value.hasTb === "boolean" &&
    (value.playing == null || (object(value.playing) && number(value.playing.at) && number(value.playing.mapId) && Number.isInteger(value.playing.mapId) && value.playing.mapId > 0)) &&
    undo(value.undo) && undo(value.redo);
}

export function DraftRoom({
  slug,
  matchId,
  match,
  initial,
  teams,
  pools,
  title,
  firstTo,
  admin,
  streams,
  side,
  canSay,
}: {
  slug: string;
  matchId: string;
  match: Match | null;
  initial: DraftView;
  teams: [TeamInfo, TeamInfo];
  pools: Pool;
  title: string;
  firstTo: number;
  admin: boolean;
  streams: boolean;
  side: Side | null;
  canSay: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [acting, setActing] = useState<Side>(side ?? 1);
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [holdUntil, setHoldUntil] = useState(0);
  const rolled = useRef(initial.roll1 != null && initial.roll2 != null);
  const wonBy = (v: DraftView): Side | null => {
    const [a, b] = scoreOf(v);
    return v.firstTo && a >= v.firstTo ? 1 : v.firstTo && b >= v.firstTo ? 2 : null;
  };
  const won = useRef(!admin && !!side && wonBy(initial) === side);
  const [party, setParty] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const [pending, start] = useTransition();
  const adminAct = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
      } catch {
        window.location.reload();
      }
    });
  const [ask, setAsk] = useState<string | null>(null);
  const savingResult = useRef(false);
  const [scores, setScores] = useState<string | null>(null);
  const lobbyOpen = useRef(false);
  const [askReset, setAskReset] = useState(false);
  const [help, setHelp] = useState(false);
  const [lobbyShown, setLobbyShown] = useState(false);
  const onLobby = useCallback((o: boolean) => {
    lobbyOpen.current = o;
    setLobbyShown(o);
  }, []);
  const mapOf = useMemo(() => new Map(pools.flatMap((p) => p.maps.map((m) => [m.slot, m] as const))), [pools]);

  const take = useCallback(
    (next: DraftView) => {
      const both = next.roll1 != null && next.roll2 != null;
      if (both && !rolled.current) setHoldUntil(Date.now() + 1600);
      rolled.current = both;
      const w = !!side && wonBy(next) === side;
      if (w && !won.current) setParty(true);
      won.current = w;
      setD((cur) => (next.rev >= cur.rev ? next : cur));
    },
    [side],
  );
  const me: Side | null = admin ? acting : side;

  const slots = useMemo(() => pools.flatMap((p) => p.maps.map((m) => m.slot)).filter(pickable), [pools]);
  const hold = clock < holdUntil;
  const real = turnOf(d, slots);
  const turn: Turn = hold && (real.kind === "choose" || real.kind === "tie") ? { kind: "roll" } : real;
  const winner = hold ? null : rollWinner(d);
  const name = (s: Side) => teams[s - 1].name;
  const names: [string, string] = [teams[0].name, teams[1].name];
  const mine = "team" in turn && turn.team === me;
  const stageRef = useRef(initial.stageSlug);

  useEffect(() => {
    if (!err) return;
    const id = setTimeout(() => setErr(false), 3500);
    return () => clearTimeout(id);
  }, [err]);

  useSSE(
    `/api/draft/${slug}`,
    (raw) => {
      try {
        const next = JSON.parse(raw) as DraftView | null;
        if (!next || (!next.open && !admin) || next.stageSlug !== stageRef.current) {
          router.refresh();
          if (next) stageRef.current = next.stageSlug;
        }
        if (next) {
          setOffset(next.now - Date.now());
          take(next);
        }
      } catch {}
    },
    (on) => setOffline(!on),
  );

  async function act(body: Record<string, unknown>) {
    if (busy || !me) return;
    setBusy(true);
    setErr(false);
    const res = await fetch(`/api/draft/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, side: me }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setErr(true);
    const next = (await res.json()) as DraftView;
    take(next);
    setSel(null);
  }

  const picked = d.steps.filter((s) => s.kind === "pick" && !s.skip);
  const scored = picked.length > 0;
  const score = [picked.filter((s) => s.winner === 1).length, picked.filter((s) => s.winner === 2).length];

  async function result(slot: string, winner: Side): Promise<boolean> {
    if (savingResult.current) return false;
    savingResult.current = true;
    setErr(false);
    try {
      const res = await fetch(`/api/draft/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ act: "result", slot, winner }),
      });
      if (!res.ok) throw new Error("result failed");
      const next: unknown = await res.json();
      if (!isDraftResponse(next) || !next.steps.some((step) => step.kind === "pick" && !step.skip && step.slot === slot && step.winner === winner)) {
        throw new Error("invalid result");
      }
      take(next);
      setAsk((current) => current === slot ? null : current);
      return true;
    } catch {
      setErr(true);
      return false;
    } finally {
      savingResult.current = false;
    }
  }

  const used = new Map(
    d.steps.flatMap((s, i) =>
      s.skip
        ? []
        : [
            [
              s.slot,
              {
                ...s,
                n: d.steps.slice(0, i + 1).filter((x) => x.kind === s.kind).length,
              },
            ] as const,
          ],
    ),
  );
  const paused = !!d.pausedAt;
  const now = clock + offset;
  const dl = deadline(d, slots);
  const limit = limitOf(d, turn.kind) * 1000;
  const left = dl == null ? null : Math.max(0, dl - (paused ? new Date(d.pausedAt!).getTime() : now));
  const pauseLeft = paused && d.pauseUntil ? Math.max(0, new Date(d.pauseUntil).getTime() - now) : 0;
  const playMap = d.playing ? pools.flatMap((p) => p.maps).find((m) => m.id === d.playing!.mapId) : undefined;
  const playTotal = playMap ? (playMap.length * 1000) / (playMap.mod === "DT" ? 1.5 : 1) : 0;
  const playLeft = d.playing ? (playTotal ? Math.max(0, d.playing.at + playTotal - now) : Math.max(0, now - d.playing.at)) : 0;
  const playTeam = (playMap && used.get(playMap.slot)?.team) || 1;
  const canTap = (slot: string) => !paused && (turn.kind === "ban" || turn.kind === "pick") && mine && pickable(slot) && !used.has(slot);

  const headline =
    turn.kind === "roll"
      ? t.draft.rollHint
      : turn.kind === "tie"
        ? t.draft.tie
        : turn.kind === "choose"
          ? t.draft.choosing(name(turn.team))
          : turn.kind === "done"
            ? score[0] >= d.firstTo || score[1] >= d.firstTo
              ? t.draft.matchWon(name(score[0] > score[1] ? 1 : 2))
              : t.draft.done
            : turn.kind === "wait"
              ? d.playing
                ? ""
                : t.draft.waitStart
              : turn.team === me
                ? t.draft.yours(turn.kind)
                : t.draft.turn(name(turn.team), turn.kind);
  const headColor = "team" in turn ? TEAM[turn.team].hi : "var(--paper)";

  const unscored = admin ? picked.find((s) => !s.winner) : undefined;

  return (
    <div className="relative mx-auto w-full max-w-page px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:px-10 2xl:px-14">
      {admin && (
        <AdminBar d={d} matchId={matchId} names={names} acting={acting} onActing={setActing} pending={pending} adminAct={adminAct} onHelp={() => setHelp(true)} onReset={() => setAskReset(true)} />
      )}
      <Portal>
      <AnimatePresence>
        {help && <LobbyHelp key="help" onClose={() => setHelp(false)} />}
        {askReset && (
          <ResetPopup
            lobby
            busy={pending}
            onCancel={() => setAskReset(false)}
            onReset={(close) => {
              setAskReset(false);
              adminAct(async () => {
                await resetDraft(matchId);
                if (close) await lobbyPost(slug, { act: "close" });
              });
            }}
          />
        )}
      </AnimatePresence>
      </Portal>

      <div className={cn((admin || lobbyShown) && "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(26rem,30%)] xl:items-start xl:gap-8 2xl:gap-10")}>
      <motion.aside
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        className="xl:col-start-2 xl:row-start-1"
      >
        <LobbyPanel slug={slug} maps={pools.flatMap((p) => p.maps)} onOpen={onLobby} readOnly={!admin} streams={streams} canSay={canSay} teamNames={names} />
      </motion.aside>
      <div className="@container min-w-0 xl:col-start-1 xl:row-start-1">
      <TeamsHeader teams={teams} turn={turn} me={me} score={scored ? score : null} />

      {match && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4, ease: EASE }} className="mt-3 flex justify-center">
          <MatchDialog match={match} compact />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs font-black uppercase tracking-[0.15em] text-ash"
      >
        <span>{title}</span>
        <span className="size-1 rotate-45 bg-line" aria-hidden />
        <span>{t.admin.firstToShort(firstTo)}</span>
      </motion.div>

      <div className="relative mt-8 flex min-h-16 items-center justify-center overflow-hidden text-center sm:mt-10">
        <AnimatePresence mode="wait">
          <motion.h2
            key={headline}
            initial={{ y: 40, opacity: 0, skewX: -12 }}
            animate={{ y: 0, opacity: 1, skewX: 0 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="heading-slam flex items-center gap-3 text-[clamp(1.6rem,6vw,3.25rem)] leading-none"
            style={{ color: headColor }}
          >
            {mine && turn.kind !== "choose" && <Sparkle className="relative size-6 text-current" />}
            {headline}
            {"team" in turn && !mine && <Waiting />}
          </motion.h2>
        </AnimatePresence>
      </div>
      {mine && !paused && (turn.kind === "ban" || turn.kind === "pick") && (
        <motion.p key={`${turn.kind}${turn.n}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-center text-sm font-bold text-ash">
          {t.draft.tapMap(turn.kind)}
        </motion.p>
      )}

      <AnimatePresence>
        {unscored && mapOf.get(unscored.slot) && (
          <motion.div
            key={`ask${unscored.slot}`}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className="mt-4 flex justify-center"
          >
            <button
              type="button"
              onClick={() => setAsk(unscored.slot)}
              title={t.draft.whoWonHint}
              className="group inline-flex min-h-8 -skew-x-12 items-center border border-dashed border-gold-deep/60 bg-gold/10 px-3 text-gold-hi transition-colors hover:border-gold-deep hover:bg-gold/25"
            >
              <span className="flex skew-x-12 items-center gap-1.5 text-[0.7rem] font-black uppercase tracking-wide">
                <Crown className="size-3.5" />
                {t.draft.whoWonSlot(unscored.slot)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Rolls d={d} turn={turn} me={me} winner={winner} hold={hold} busy={busy} paused={paused} names={names} onRoll={() => act({ act: "roll" })} />

      {d.choice && <Sequence d={d} turn={turn} />}

      <MapGrid pools={pools} used={used} canTap={canTap} sel={sel} onSel={setSel} me={me} admin={admin} names={names} onPeek={(slot) => (admin ? setAsk(slot) : setScores(slot))} />
      </div>
      </div>

      <Portal>
        {party && <Confetti onDone={() => setParty(false)} />}
        <AnimatePresence>
          {paused ? (
            <TimerDock
              key="pause"
              pause
              left={pauseLeft}
              total={d.pauseUntil && d.pausedAt ? new Date(d.pauseUntil).getTime() - new Date(d.pausedAt).getTime() : 1}
              color={TEAM[1]}
              label={t.draft.paused}
            />
          ) : d.playing ? (
            <TimerDock key="play" calm left={playLeft} total={playTotal} color={TEAM[playTeam]} label={playMap ? `${t.lobby.mapPlaying} · ${playMap.slot}` : t.lobby.mapPlaying} />
          ) : (
            left != null && "team" in turn && <TimerDock key="turn" left={left} total={limit} color={TEAM[turn.team]} label={headline} raised={!!sel && mine} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {ask && mapOf.get(ask) && (
            <WinnerPopup
              key={`w${ask}`}
              slot={ask}
              map={mapOf.get(ask)!}
              teams={[name(1), name(2)]}
              current={used.get(ask)?.winner}
              onPick={(w) => result(ask, w)}
              onClose={() => setAsk(null)}
              onScores={used.get(ask)?.winner ? () => (setScores(ask), setAsk(null)) : undefined}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>{scores && <ScoresPopup key={`s${scores}`} slug={slug} slot={scores} names={[name(1), name(2)]} onClose={() => setScores(null)} />}</AnimatePresence>
        <AnimatePresence>
          {sel && (turn.kind === "ban" || turn.kind === "pick") && mine && me && (
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-40 border-t-2 bg-ink/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"
              style={{ borderColor: TEAM[me].c }}
            >
              <div className="mx-auto flex max-w-page items-center gap-3 lg:px-6">
                <button type="button" onClick={() => setSel(null)} className="min-h-12 px-3 text-sm font-black uppercase tracking-wide text-ash hover:text-paper">
                  {t.draft.cancel}
                </button>
                <motion.button
                  type="button"
                  disabled={busy}
                  onClick={() => act({ act: turn.kind, slot: sel })}
                  whileTap={{ scale: 0.95 }}
                  className="sheen heading-slam ml-auto inline-flex min-h-12 flex-1 -skew-x-12 items-center justify-center px-6 text-xl text-white disabled:opacity-60 sm:flex-none sm:text-2xl"
                  style={{
                    background: TEAM[me].c,
                    boxShadow: `5px 5px 0 0 ${TEAM[me].deep}`,
                  }}
                >
                  <span className="inline-flex skew-x-12 items-center gap-2">
                    {turn.kind === "ban" ? <Ban className="size-5" /> : <Swords className="size-5" />}
                    {t.draft.confirm(turn.kind, sel)}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {turn.kind === "choose" && turn.team === me && <ChoosePopup key="choose" me={me} busy={busy} onPick={(c) => act({ act: "choose", value: c })} />}
        </AnimatePresence>

        <AnimatePresence>
          {(err || offline) && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed left-1/2 top-20 z-50 inline-flex -translate-x-1/2 items-center gap-2 border border-rose bg-field px-3 py-2 shadow-[3px_3px_0_0_var(--rose-deep)] text-xs font-black uppercase tracking-wide text-rose-hi lg:top-24"
              role="status"
            >
              {offline ? (
                <>
                  <WifiOff className="size-3.5" /> {t.draft.offline} <Waiting />
                </>
              ) : (
                t.draft.error
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
