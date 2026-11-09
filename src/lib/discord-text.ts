import { fmtSofia } from "./time";
import { matchNum, type Format } from "./format";
import { dicts, roundName } from "./i18n/dict";
import { siteUrl } from "./links";
import { matchCosts } from "./match-cost";
import type { Embed } from "./discord";
import type { Beatmap, Match } from "./data";
import type { Scoreboard } from "./scoreboard";

export const when = (d: Date) => `${fmtSofia(d, "en-GB")} (BG time)`;

export function matchLabel(f: Format, id: string, round: string) {
  const num = matchNum(f, id);
  return `${roundName(dicts.en, round)}${num ? `, Match ${num}` : ""}`;
}

const esc = (s: string) => s.replace(/[\\*_~`|[\]<>]/g, "\\$&");
const SQ = ["⬛", "🟥", "🟦"] as const;
const num = (n: number) => n.toLocaleString("en-US");

export function resultMessage(f: Format, m: Match, sb: Scoreboard | null, tag: (teamId: string) => string | null) {
  const url = `${siteUrl()}/results/${m.id}`;
  const [n1, n2] = [m.team1.name, m.team2.name];
  const maps = (sb?.maps ?? []).filter((x) => x.note !== "warmup" && x.note !== "aborted");
  const lines = maps.map((x) => {
    const slot = x.slot ?? x.mod ?? "—";
    const [a, b] = [num(x.team1), num(x.team2)];
    const bold = (s: string | number, k: 1 | 2) => (x.winner === k ? `**${s}**` : `${s}`);
    const head = `${SQ[x.winner]}  \`${slot}\` [${esc(x.title)}](https://osu.ppy.sh/b/${x.beatmapId}) \\[${esc(x.version)}\\]`;
    const tail =
      x.note === "replayed" ? "-# replayed, not counted" : `-# ${bold(a, 1)} – ${bold(b, 2)}\n-# ${bold(x.running[0], 1)} – ${bold(x.running[1], 2)}`;
    return `${head}\n${tail}`;
  });
  // shortcut: drops whole maps from the end past discord's 4096 description limit, no real match gets close
  let description = "";
  for (const l of lines) if (description.length + l.length + 2 < 4000) description += (description ? "\n\n" : "") + l;
  const costs = sb ? matchCosts(sb, true) : [];
  // bathbot style: top 3 of the whole match get medals, rows are padded code cells
  const medal = new Map([...costs].sort((a, b) => b.cost - a.cost).slice(0, 3).map((c, i) => [c, ["🥇", "🥈", "🥉"][i]]));
  const side = (k: 1 | 2) => {
    const rows = costs.filter((c) => c.team === k).sort((a, b) => b.cost - a.cost);
    const w = Math.max(0, ...rows.map((c) => c.name.length));
    return (
      rows
        .map((c, i) => `\`${i + 1}.\` \`${c.name.replace(/`/g, "'").padEnd(w)}\` \`${c.cost.toFixed(2)}\`${medal.has(c) ? `  ${medal.get(c)}` : ""}`)
        .join("\n") || "—"
    );
  };
  const team = (k: 1 | 2) => ({ name: `${SQ[k]}  ${k === 1 ? n1 : n2}${m.winner === k ? "  🏆" : ""}`, value: side(k) });
  const order: (1 | 2)[] = m.winner === 2 ? [2, 1] : [1, 2];
  const mp = m.links.map((id, i) => `[MP${m.links.length > 1 ? ` ${i + 1}` : ""}](https://osu.ppy.sh/community/matches/${id})`);
  const embed: Embed = {
    author: { name: `${f.name}  ·  ${matchLabel(f, m.id, m.round)}` },
    title: `${n1}  ${m.team1.score} – ${m.team2.score}  ${n2}`,
    url,
    color: m.winner === 1 ? 0xe0303f : 0x2f6fe0,
    description: description || undefined,
    fields: [
      { name: "​", value: `**Match costs**`, inline: false },
      ...order.map(team),
      { name: "​", value: [`[Full results](${url})`, ...mp].join("  ·  ") },
    ],
    footer: { text: "Match played" },
    timestamp: m.datetime ? new Date(m.datetime).toISOString() : undefined,
  };
  const t1 = tag(m.team1.id) ?? `**${n1}**`;
  const t2 = tag(m.team2.id) ?? `**${n2}**`;
  return { content: `${t1}  **${m.team1.score} – ${m.team2.score}**  ${t2}`, embed };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
// whole lines only, up to discord's 1024-character field limit
const fit = (lines: string[]) => lines.reduce((v, l) => (v.length + l.length + 1 <= 1024 ? (v ? `${v}\n${l}` : l) : v), "");
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** the mappool release post: the plain line plus an embed with every section, each slot linked to its map with stats */
export function poolMessage(f: Format, stage: { slug: string; title: string; firstTo: number }, sections: { name: string; maps: Beatmap[] }[]) {
  const url = `${siteUrl()}/mappool/${stage.slug}`;
  const round = roundName(dicts.en, stage.title);
  const all = sections.flatMap((s) => s.maps);
  const shown = sections.filter((s) => s.maps.length);
  const avg = all.length ? all.reduce((n, m) => n + m.sr, 0) / all.length : 0;
  // one line per map: slot linked to the map, then a subtext stat row; titles are cut so a whole section fits one field
  const line = (m: Beatmap) =>
    `**${m.slot}** [${esc(cut(m.title, 36))}](https://osu.ppy.sh/b/${m.id}) \\[${esc(cut(m.version, 22))}\\]\n-# ${m.sr.toFixed(2)}★ ·${Math.round(m.bpm)} BPM · ${clock(m.length)} · AR ${m.ar} · OD ${m.od} · CS ${m.cs}`;
  const embed: Embed = {
    author: { name: `${f.name}  ·  Mappool` },
    title: round,
    url,
    color: 0xc4577f,
    description: [`**${all.length}** Maps  ·  **${avg.toFixed(2)}** ⭐  ·  First to **${stage.firstTo}**`, `[Open](${url})`, `[Download pack](${siteUrl()}/download/${stage.slug})`].join("\n"),
    // a zero-width line under every section but the last leaves an empty row between them
    fields: shown.map((s, i) => ({ name: s.name, value: i < shown.length - 1 ? `${fit(s.maps.map(line))}\n​` : fit(s.maps.map(line)) })),
    image: all.at(-1)?.cover ? { url: all.at(-1)!.cover } : undefined,
    footer: { text: "Mappool released" },
    timestamp: new Date().toISOString(),
  };
  return { content: `@everyone The **${round}** mappool is out: <${url}>`, embed };
}
