import "server-only";
import { relayAuth } from "@/lib/relay";
import { relayPerms } from "@/lib/relay-perms";
import { getLive, IPC_PLAYING, putLive, rejectLive, type LiveReject } from "@/lib/live-scores";
import type { ScorePacket } from "@/lib/overlay-types";
import { currentStreamMatch } from "@/db/stream";
import { getAllTeams } from "@/db/tournament";
import { getDraft } from "@/db/drafts";
import { getPoolStages } from "@/db/mappools";

export const dynamic = "force-dynamic";

function isNumber(x: unknown): x is number {
  return typeof x === "number" && isFinite(x);
}

function isString(x: unknown): x is string {
  return typeof x === "string";
}

function isBoolean(x: unknown): x is boolean {
  return typeof x === "boolean";
}

function isArray(x: unknown): x is unknown[] {
  return Array.isArray(x);
}

function isInteger(x: unknown): x is number {
  return Number.isInteger(x);
}

function parse(b: unknown): ScorePacket | null {
  if (!b || typeof b !== "object") return null;

  const obj = b as Record<string, unknown>;

  if (!isInteger(obj.ipcState) || obj.ipcState < 0 || obj.ipcState > 10) return null;
  if (!isInteger(obj.mapId) || obj.mapId < 0) return null;
  if (!isArray(obj.clients) || obj.clients.length > 16) return null;

  const clients: ScorePacket["clients"] = [];
  for (const c of obj.clients) {
    if (!c || typeof c !== "object") return null;
    const client = c as Record<string, unknown>;

    if (!isInteger(client.ipcId) || client.ipcId < 0) return null;
    if (client.team !== "left" && client.team !== "right") return null;
    if (!isInteger(client.userId) || client.userId < 0) return null;
    if (!isString(client.name) || client.name.length > 32) return null;
    if (!isNumber(client.score) || client.score < 0 || client.score > 2147483647) return null;
    if (!isNumber(client.accuracy) || client.accuracy < 0 || client.accuracy > 100) return null;
    if (!isInteger(client.combo) || client.combo < 0) return null;
    if (!isInteger(client.maxCombo) || client.maxCombo < 0) return null;
    if (!isArray(client.mods) || client.mods.length > 16) return null;
    if (!isBoolean(client.failed)) return null;

    const mods: string[] = [];
    for (const mod of client.mods) {
      if (!isString(mod) || !/^[A-Z0-9]{2}$/.test(mod)) return null;
      mods.push(mod);
    }

    const team: "left" | "right" = client.team;
    clients.push({
      ipcId: client.ipcId as number,
      team,
      userId: client.userId as number,
      name: client.name as string,
      score: Math.floor(client.score as number),
      accuracy: client.accuracy as number,
      combo: client.combo as number,
      maxCombo: client.maxCombo as number,
      mods,
      failed: client.failed as boolean,
    });
  }

  return {
    ipcState: obj.ipcState as number,
    mapId: obj.mapId as number,
    clients,
  };
}

export async function POST(req: Request) {
  const app = await relayAuth(req);
  if (!app) return Response.json({ error: "unpaired" }, { status: 401 });

  const perms = await relayPerms(app.osuId);
  if (!perms.stream) return Response.json({ error: "nostream" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const packet = parse(body);
  if (!packet) return Response.json({ error: "invalid" }, { status: 400 });

  const m = await currentStreamMatch(app.osuId);
  if (!m) return Response.json({ error: "nomatch" }, { status: 409 });

  const [teams, draft, stages] = await Promise.all([getAllTeams(), getDraft(m.id), getPoolStages()]);
  const left = new Set(teams.find((t) => t.id === m.team1.id)?.players.map((p) => p.userId) ?? []);
  const right = new Set(teams.find((t) => t.id === m.team2.id)?.players.map((p) => p.userId) ?? []);
  const pool = stages.find((s) => s.slug === (draft?.stageSlug ?? m.stage));
  packet.clients = packet.clients.filter((c) => c.userId > 0);
  const reject = (why: LiveReject) => {
    rejectLive(m.id, why);
    return Response.json({ error: why, match: m.slug }, { status: 409 });
  };
  if (!packet.clients.length) return reject("noplayers");
  if (!packet.clients.every((c) => left.has(c.userId) || right.has(c.userId))) return reject("players");
  if (!packet.clients.every((c) => (c.team === "left" ? left : right).has(c.userId))) return reject(packet.clients.every((c) => (c.team === "left" ? right : left).has(c.userId)) ? "swapped" : "players");
  if (!pool?.pools.some((p) => p.maps.some((map) => map.id === packet.mapId))) return reject("map");
  // a previous lobby's results must not become the first packet of a new match.
  if (m.winner === null && packet.ipcState !== IPC_PLAYING && !getLive(m.id)) {
    return Response.json({ ok: true, match: m.slug });
  }
  putLive(m.id, packet);
  return Response.json({ ok: true, match: m.slug });
}
