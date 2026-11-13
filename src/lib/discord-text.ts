import { dayTime, fmtSofia, fmtSofiaTime, fullDayTime, sofiaDate } from "./time";
import type { OutKind } from "@/lib/out";
import { matchNum, type Format } from "./format";
import { dicts, roundName } from "./i18n/dict";
import { siteUrl } from "./links";
import { matchCosts } from "./match-cost";
import type { Role } from "./roles";
import type { Embed } from "./discord";
import type { Beatmap, Match } from "./data";
import type { Scoreboard } from "./scoreboard";

export const when = (d: Date) => `${fmtSofia(d, "en-GB")} (BG time)`;

export function matchLabel(f: Format, id: string, round: string) {
  const num = matchNum(f, id);
  return `${roundName(dicts.en, round)}${num ? `, Match ${num}` : ""}`;
}

const span = (min: number) => (min % 60 === 0 ? `${min / 60} hour${min === 60 ? "" : "s"}` : `${min} minutes`);

/** `ping` is a ready-made role mention, empty for the DM copy */
export const noRefMessage = (ping: string, label: string, t1: string, t2: string, min: number, at: Date) =>
  `${ping ? `${ping} ` : ""}**${label}** between **${t1}** and **${t2}** has no referee and is scheduled to begin in ${span(min)} (${dayTime(`${sofiaDate(at)}T${fmtSofiaTime(at)}`, "en")}).`;

export const refGoneMessage = (ping: string, label: string, t1: string, t2: string, refs: string[], min: number) =>
  `${ping ? `${ping} ` : ""}**${label}** (${t1} vs ${t2}) started ${min} minutes ago and the referee **${refs.join(", ")}**'s helper is offline.`;

export const refWantedMessage =(ping: string, label: string, t1: string, t2: string, at: Date, hours: number, link: string) =>
  `${ping ? `${ping} ` : ""}**${label}** · **${t1}** vs **${t2}** · ${fullDayTime(at, "en")} BG time (in ${hours} hours) has no referee. Take it: ${link}`;

export const refTakenMessage = (label: string, t1: string, t2: string, at: Date, by: string) => `~~**${label}** · **${t1}** vs **${t2}** · ${fullDayTime(at, "en")} BG time~~ taken by **${by}**.`;

export const deadlineSoonMessage = (label: string, opp: string, deadline: Date, link: string) =>
  `No time is agreed yet for your match against **${opp}** (${label}). The scheduling deadline is **${when(deadline)}**. Propose or accept a time: ${link}`;

export const signupDecidedMessage = (tournament: string, approved: boolean, reason: string | null) =>
  approved ? `Your ${tournament} sign-up was approved. You're in.` : `Your ${tournament} sign-up was denied.${reason ? ` Reason: ${reason}` : ""}`;

export const teamRequestDecidedMessage = (team: string, approved: boolean, reason: string | null) =>
  approved ? `Your team name and picture request for **${team}** was approved.` : `Your team name and picture request for **${team}** was declined.${reason ? ` Reason: ${reason}` : ""}`;

export const yourTeamMessage = (tournament: string, team: string, mate: string | null) =>
  `Your ${tournament} team is **${team}**${mate ? `, with **${mate}**` : ""}.`;

export const helperOfflineMessage =(match: string) =>
  `Your BGCC7 Helper has been offline for 3 minutes while the lobby of **${match}** is open, so the match can't be run from the site. Open the helper on your PC.`;

/** no pick and ban link here: the DM 35 minutes before the match carries it */
export const refAssignedMessage = (label: string, t1: string, t2: string, at: Date | null) =>
  `You have been assigned as referee for **${label}**: **${t1}** vs **${t2}**, ${at ? when(at) : "time not set yet"}.`;

export const refRemovedMessage = (label: string, t1: string, t2: string) => `You are no longer the referee of **${label}**: **${t1}** vs **${t2}**.`;

export const commentMessage = (label: string, t1: string, t2: string, at: Date, link: string) =>
  `You are commenting on **${label}**: **${t1}** vs **${t2}** in 1 hour, at ${when(at)}. ${link}`;

export const staffTimeMessage = (label: string, t1: string, t2: string, at: Date) => `The time of **${label}**: **${t1}** vs **${t2}** changed. It is now **${when(at)}**.`;

const roleNames = (roles: Role[]) => roles.map((r) => dicts.en.admin.roles[r]);

export const rolesGivenMessage = (tournament: string, roles: Role[]) =>
  roles.length === 1 ? `You have been assigned as a ${roleNames(roles)[0].toLowerCase()} for ${tournament}!` : `You have been assigned the following roles for ${tournament}: ${roleNames(roles).join(", ")}!`;

export const rolesTakenMessage = (tournament: string, roles: Role[]) =>
  roles.length === 1 ? `Your ${roleNames(roles)[0].toLowerCase()} role for ${tournament} has been revoked.` : `The following roles for ${tournament} have been revoked: ${roleNames(roles).join(", ")}.`;

export const staffLeftMessage = (name: string, roles: Role[]) => `**${name}** (${roleNames(roles).join(", ")}) left the server.`;

export const streamMessage = (label: string, t1: string, t2: string, at: Date, link: string) =>
  `You are streaming **${label}**: **${t1}** vs **${t2}** in 1 hour, at ${when(at)}. Open the tourney client only after the referee has made the lobby. ${link}`;

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
  const mp = m.links.map((id, i) => `[${dicts.en.match.osuLobby(i + 1, m.links.length)}](https://osu.ppy.sh/community/matches/${id})`);
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

/** `pings` are ready-made role mentions */
export const poolOpenMessage = (pings: string[], title: string, closes: Date, link: string) =>
  `${pings.length ? `${pings.join(" ")} ` : ""}Pooling for **${roundName(dicts.en, title)}** has started. Suggestions and votes close ${when(closes)}. The sheet: <${link}>`;

export const poolReminderMessage = (pings: string[], title: string) =>
  `${pings.length ? `${pings.join(" ")} ` : ""}you have exactly **24 hours** left to send suggestions and votes for the **${roundName(dicts.en, title)}** mappool.`;

export const poolClosedMessage = (pings: string[], title: string) =>
  `${pings.length ? `${pings.join(" ")} ` : ""}Suggestions for the **${roundName(dicts.en, title)}** mappool are closed, and the leading map of every slot has been submitted.`;

const WALKOVER: Record<OutKind, string> = { dq: "being disqualified", forfeit: "forfeiting", other: "being out of the tournament" };
/** `on` and `gone` are ready-made mentions or bold names */
export const walkoverMessage = (on: string, gone: string, kind: OutKind) => `${on} advances, due to ${gone} ${WALKOVER[kind]}.`;
