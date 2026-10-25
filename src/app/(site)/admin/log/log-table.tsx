import { Fragment } from "react";
import { ChevronDown } from "lucide-react";
import type { LogRow } from "@/db/admin";
import { Avatar } from "@/components/site/avatar";
import { InView } from "@/components/site/in-view";
import type { Dict } from "@/lib/i18n/dict";
import { describe, summarize, type LogCtx } from "@/lib/log-text";
import { getFormat } from "@/db/edition";
import { compactLog, type CompactLogEntry } from "@/lib/log-compact";
import { fmtSofia, fmtSofiaDay, fmtSofiaTime, TZ, TZ_LABEL } from "@/lib/time";
import { cn } from "@/lib/utils";

const categoryPrefixes: Record<string, string[]> = {
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

const categoryOf = (action: string) => {
  if (categoryPrefixes.players.some((p) => action.startsWith(p))) return "players";
  if (action.startsWith("draft.")) return "lobbies";
  if (action.startsWith("pool.")) return "mappools";
  return Object.keys(categoryPrefixes).find((g) => g !== "players" && categoryPrefixes[g].some((p) => action.startsWith(p))) ?? "site";
};

const DOT: Record<string, string> = {
  players: "bg-balkan",
  screening: "bg-balkan",
  phase: "bg-paper",
  lobbies: "bg-rose",
  qualifiers: "bg-rose",
  mappools: "bg-mod-dt",
  teams: "bg-mod-hd",
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
    date: (d: string) => `${fmtSofia(new Date(d), locale)} ${TZ_LABEL}`,
    match: (id: string) => {
      const m = id.match(/^(GF|[WL]B-R\d+)-M(\d+)$/);
      const r = m && getFormat().rounds[m[1]];
      return r && m ? `${t.rounds[r.name] ?? r.name} - ${m[2]}` : id;
    },
  };
  const matchName = (id: string) => {
    const [a, b] = ctx.match.get(id) ?? [];
    return a && b ? `${a} vs ${b} (${helpers.match(id)})` : helpers.match(id);
  };
  const groupText = (entry: Extract<CompactLogEntry, { kind: "group" }>) => {
    switch (entry.category) {
      case "refereed": return t.admin.audit.refereed(matchName(entry.context));
      case "poolWork": return t.admin.audit.poolWork(helpers.round(ctx.stage.get(Number(entry.context)) ?? `#${entry.context}`));
      case "ratings": return t.admin.audit.ratings;
      case "screening": return t.admin.audit.screening;
      case "qualifierScores": return t.admin.audit.qualifierScores(ctx.user.get(Number(entry.context)) ?? `#${entry.context}`);
      case "matchScores": return t.admin.audit.matchScores(matchName(entry.context));
      case "action": return summarize(entry.latest.action, entry.latest.payload, ctx, helpers);
    }
  };
  const renderRow = (r: LogRow, i: number) => {
    const g = categoryOf(r.action);
    return (
      <li key={r.id} className="in-left group relative flex items-center gap-3 border-b border-line px-3 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.02]" style={{ "--i": Math.min(i, 20), "--s": "0.04s", "--d": "0.2s" } as React.CSSProperties}>
        <span className={cn("absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100", DOT[g])} aria-hidden />
        <span className="in-spin inline-flex [--d:0.3s]">
          <Avatar src={r.avatarUrl} className="size-7 ring-offset-1" />
        </span>
        <p className="min-w-0 flex-1 break-words text-sm leading-snug text-paper/70">
          <span className="font-black text-paper">{r.username ?? `#${r.osuId}`}</span>{" "}
          <Rich text={describe(r.action, r.payload, ctx, helpers)} />
        </p>
        <span className={cn("in-pop size-1.5 shrink-0 rotate-45 [--d:0.5s]", DOT[g])} title={t.admin.logGroups[g]} aria-hidden />
        <time className="in-wipe-r num w-12 shrink-0 text-right text-sm text-ash [--d:0.45s]" dateTime={r.at.toISOString()}>
          {fmtSofiaTime(r.at)}
        </time>
      </li>
    );
  };
  const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const days = new Map<string, { label: string; entries: CompactLogEntry[] }>();
  for (const entry of compactLog(rows)) {
    const r = entry.kind === "row" ? entry.row : entry.latest;
    const key = dayFormat.format(r.at);
    let day = days.get(key);
    if (!day) {
      day = { label: fmtSofiaDay(r.at, locale), entries: [] };
      days.set(key, day);
    }
    day.entries.push(entry);
  }
  return (
    <div className="space-y-6">
      {[...days.entries()].map(([day, list]) => (
        <section key={day}>
          <h3 className="mb-2 flex items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-ash">
            <span className="in-wipe [--d:0.15s]">{list.label}</span>
            <span className="in-grow h-px flex-1 border-t border-dashed border-line [--d:0.25s]" aria-hidden />
          </h3>
          <InView as="ol" className="relative border border-line bg-coal">
            {list.entries.map((entry, i) => {
              if (entry.kind === "row") return renderRow(entry.row, i);
              const r = entry.latest;
              return (
                <li key={r.id} className="border-b border-line last:border-b-0">
                  <details className="group/audit">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rose [&::-webkit-details-marker]:hidden">
                      <Avatar src={r.avatarUrl} className="size-7 shrink-0 ring-offset-1" />
                      <span className="min-w-0 flex-1 break-words text-sm leading-snug text-paper/70">
                        <span className="font-black text-paper">{r.username ?? `#${r.osuId}`}</span>{" "}
                        <Rich text={groupText(entry)} />
                        <span className="num ml-1.5 font-black text-rose-hi">×{entry.rows.length}</span>
                      </span>
                      <time className="num w-12 shrink-0 text-right text-sm text-ash" dateTime={r.at.toISOString()}>{fmtSofiaTime(r.at)}</time>
                      <ChevronDown className="size-4 shrink-0 text-rose group-open/audit:rotate-180" aria-hidden />
                      <span className="sr-only">{t.admin.audit.expand}</span>
                    </summary>
                    <ol className="ml-3 border-t border-l border-line bg-ink/30 sm:ml-6">{entry.rows.map(renderRow)}</ol>
                  </details>
                </li>
              );
            })}
          </InView>
        </section>
      ))}
    </div>
  );
}
