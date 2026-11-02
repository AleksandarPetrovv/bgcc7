import { Fragment } from "react";
import { ChevronDown } from "lucide-react";
import type { LogRow } from "@/db/admin";
import { Avatar } from "@/components/site/avatar";
import type { Dict } from "@/lib/i18n/dict";
import { describe, summarize, type LogCtx } from "@/lib/log-text";
import { getFormat } from "@/db/edition";
import { matchNum, roundOf } from "@/lib/format";
import { compactLog, type CompactLogEntry } from "@/lib/log-compact";
import { groupOf, type LogGroup } from "@/lib/action-names";
import { fmtSofia, fmtSofiaDay, fmtSofiaTime, sofiaDate, tzLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";

const DOT: Record<LogGroup, string> = {
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
          <span key={i} className="font-display font-bold text-paper">
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
  if (!rows.length) return <p className="border-y border-line py-4 text-sm text-ash">{empty}</p>;
  const locale = localeOf(lang);
  const helpers = {
    lang,
    phase: (p: string) => t.admin.phases[p as keyof typeof t.admin.phases] ?? p,
    round: (s: string) => roundName(t, s),
    role: (r: string) => t.admin.roles[r] ?? r,
    date: (d: string) => `${fmtSofia(new Date(d), locale)} ${tzLabel(new Date(d))}`,
    match: (id: string) => {
      const f = getFormat();
      const r = f.rounds[roundOf(id)];
      const n = matchNum(f, id);
      return r ? (n ? `${roundName(t, r.name)} - ${n}` : roundName(t, r.name)) : id;
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
    const g = groupOf(r.action);
    return (
      <li key={r.id} className="in-left group relative flex items-center gap-3 border-b border-line px-3 py-2.5 transition-colors last:border-b-0 hover:bg-slate" style={{ "--i": Math.min(i, 24), "--s": "0.05s", "--d": "0.15s" } as React.CSSProperties}>
        <span className={cn("absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100", DOT[g])} aria-hidden />
        <span className="inline-flex">
          <Avatar src={r.avatarUrl} className="size-7 ring-offset-1" />
        </span>
        <p className="min-w-0 flex-1 break-words text-sm leading-snug text-paper/70">
          <span className="font-display font-black text-paper">{r.username ?? `#${r.osuId}`}</span>{" "}
          <Rich text={describe(r.action, r.payload, ctx, helpers)} />
        </p>
        <span className={cn("size-1.5 shrink-0 rotate-45", DOT[g])} title={t.admin.logGroups[g]} aria-hidden />
        <time className="num w-12 shrink-0 text-right text-sm text-ash" dateTime={r.at.toISOString()}>
          {fmtSofiaTime(r.at)}
        </time>
      </li>
    );
  };
  const days = new Map<string, { label: string; entries: CompactLogEntry[] }>();
  for (const entry of compactLog(rows)) {
    const r = entry.kind === "row" ? entry.row : entry.latest;
    const key = sofiaDate(r.at);
    let day = days.get(key);
    if (!day) {
      day = { label: fmtSofiaDay(r.at, locale), entries: [] };
      days.set(key, day);
    }
    day.entries.push(entry);
  }
  let n = 0;
  const step = (i: number) => ({ "--i": Math.min(i, 24), "--s": "0.05s", "--d": "0.15s" }) as React.CSSProperties;
  return (
    <div className="space-y-6">
      {[...days.entries()].map(([day, list]) => (
        <section key={day}>
          <h3 className="in-left mb-2 flex items-center gap-3 text-xs font-display font-bold text-ash" style={step(n)}>
            <span>{list.label}</span>
            <span className="h-px flex-1 border-t border-line" aria-hidden />
            <span className="size-2 shrink-0 rotate-45 bg-rose" aria-hidden />
          </h3>
          <ol className="relative border-y border-line">
            {list.entries.map((entry) => {
              if (entry.kind === "row") return renderRow(entry.row, n++);
              const r = entry.latest;
              return (
                <li key={r.id} className="in-left border-b border-line last:border-b-0" style={step(n++)}>
                  <details className="group/audit">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 hover:bg-slate focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rose [&::-webkit-details-marker]:hidden">
                      <Avatar src={r.avatarUrl} className="size-7 shrink-0 ring-offset-1" />
                      <span className="min-w-0 flex-1 break-words text-sm leading-snug text-paper/70">
                        <span className="font-display font-black text-paper">{r.username ?? `#${r.osuId}`}</span>{" "}
                        <Rich text={groupText(entry)} />
                        <span className="num ml-1.5 font-display font-black text-rose-hi">×{entry.rows.length}</span>
                      </span>
                      <time className="num w-12 shrink-0 text-right text-sm text-ash" dateTime={r.at.toISOString()}>{fmtSofiaTime(r.at)}</time>
                      <ChevronDown className="size-4 shrink-0 text-rose group-open/audit:rotate-180" aria-hidden />
                      <span className="sr-only">{t.admin.audit.expand}</span>
                    </summary>
                    <ol className="ml-3 border-l-2 border-t border-line sm:ml-6">{entry.rows.map(renderRow)}</ol>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
