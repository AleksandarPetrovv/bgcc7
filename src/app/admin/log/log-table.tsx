import { Fragment } from "react";
import type { LogRow } from "@/db/admin";
import { Avatar } from "@/components/site/avatar";
import { InView } from "@/components/site/in-view";
import type { Dict } from "@/lib/i18n/dict";
import { describe, type LogCtx } from "@/lib/log-text";
import { fmtSofia, fmtSofiaDay, fmtSofiaTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const LOG_GROUPS: Record<string, string[]> = {
  players: ["register.", "lobby.book", "lobby.leave", "reschedule.request", "reschedule.accepted", "reschedule.declined", "reschedule.cancelled"],
  phase: ["phase."],
  screening: ["screening."],
  lobbies: ["lobby."],
  qualifiers: ["qual."],
  mappools: ["stage.", "map.", "pack."],
  teams: ["team"],
  matches: ["match.", "reschedule.approve", "reschedule.deny"],
  site: ["site.", "sponsor."],
  staff: ["staff."],
};

export const groupOf = (action: string) => {
  if (LOG_GROUPS.players.some((p) => action.startsWith(p))) return "players";
  return Object.keys(LOG_GROUPS).find((g) => g !== "players" && LOG_GROUPS[g].some((p) => action.startsWith(p))) ?? "site";
};

const DOT: Record<string, string> = {
  players: "bg-balkan",
  screening: "bg-balkan",
  phase: "bg-paper",
  lobbies: "bg-rose",
  qualifiers: "bg-rose",
  mappools: "bg-[#a78bfa]",
  teams: "bg-[#f5b820]",
  matches: "bg-rose-hi",
  site: "bg-ash",
  staff: "bg-paper",
};

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") ? (
          <span key={i} className="font-bold text-paper">
            {part.slice(2, -2)}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function LogTable({ rows, ctx, lang, t, empty }: { rows: LogRow[]; ctx: LogCtx; lang: string; t: Dict; empty: string }) {
  if (!rows.length) return <p className="border border-line bg-coal p-4 text-sm text-ash">{empty}</p>;
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const helpers = {
    lang,
    phase: (p: string) => t.admin.phases[p as keyof typeof t.admin.phases] ?? p,
    round: (s: string) => t.rounds[s] ?? s,
    role: (r: string) => t.admin.roles[r] ?? r,
    date: (d: string) => `${fmtSofia(new Date(d), locale)} EET`,
  };
  const days = new Map<string, LogRow[]>();
  for (const r of rows) {
    const d = fmtSofiaDay(r.at, locale);
    days.set(d, [...(days.get(d) ?? []), r]);
  }
  return (
    <div className="space-y-6">
      {[...days.entries()].map(([day, list]) => (
        <section key={day}>
          <h3 className="mb-2 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-ash">
            <span className="in-wipe [--d:0.15s]">{day}</span>
            <span className="in-grow h-px flex-1 border-t border-dashed border-line [--d:0.25s]" aria-hidden />
          </h3>
          <InView as="ol" className="relative border border-line bg-coal">
            {list.map((r, i) => {
              const g = groupOf(r.action);
              return (
                <li key={r.id} className="in-left group relative flex items-center gap-3 border-b border-line px-3 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.02]" style={{ "--i": Math.min(i, 20), "--s": "0.04s", "--d": "0.2s" } as React.CSSProperties}>
                  <span className={cn("absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100", DOT[g])} aria-hidden />
                  <span className="in-spin inline-flex [--d:0.3s]">
                    <Avatar src={r.avatarUrl} className="size-7 ring-offset-1" />
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-snug text-paper/70">
                    <span className="font-black text-paper">{r.username ?? `#${r.osuId}`}</span>{" "}
                    <Rich text={describe(r.action, r.payload, ctx, helpers)} />
                  </p>
                  <span className={cn("in-pop size-1.5 shrink-0 rotate-45 [--d:0.5s]", DOT[g])} title={t.admin.logGroups[g]} aria-hidden />
                  <time className="in-wipe-r num w-12 shrink-0 text-right text-sm text-ash [--d:0.45s]" dateTime={r.at.toISOString()}>
                    {fmtSofiaTime(r.at)}
                  </time>
                </li>
              );
            })}
          </InView>
        </section>
      ))}
    </div>
  );
}
