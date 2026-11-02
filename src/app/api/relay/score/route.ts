import "server-only";
import { relayAuth } from "@/lib/relay";
import { relayAccess } from "@/lib/authz";
import { getLive, putLive, rejectLive } from "@/lib/live-scores";
import { IPC_PLAYING, parseScore, relayError, scoreOk, type LiveReject } from "@/lib/relay-contract";
import { currentStreamMatch } from "@/db/stream";
import { getAllTeams } from "@/db/tournament";
import { getDraft } from "@/db/drafts";
import { getPoolStages } from "@/db/mappools";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const app = await relayAuth(req);
  if (!app) return relayError("unpaired");

  if (!(await relayAccess(app.osuId)).stream) return relayError("nostream");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const packet = parseScore(body);
  if (!packet) return relayError("invalid");

  const m = await currentStreamMatch(app.osuId);
  if (!m) return relayError("nomatch");

  const [teams, draft, stages] = await Promise.all([getAllTeams(), getDraft(m.id), getPoolStages()]);
  const left = new Set(teams.find((t) => t.id === m.team1.id)?.players.map((p) => p.userId) ?? []);
  const right = new Set(teams.find((t) => t.id === m.team2.id)?.players.map((p) => p.userId) ?? []);
  const pool = stages.find((s) => s.slug === (draft?.stageSlug ?? m.stage));
  packet.clients = packet.clients.filter((c) => c.userId > 0);
  const reject = (why: LiveReject) => {
    rejectLive(m.id, why);
    return relayError(why, { match: m.slug });
  };
  if (!packet.clients.length) return reject("noplayers");
  if (!packet.clients.every((c) => left.has(c.userId) || right.has(c.userId))) return reject("players");
  if (!packet.clients.every((c) => (c.team === "left" ? left : right).has(c.userId))) return reject(packet.clients.every((c) => (c.team === "left" ? right : left).has(c.userId)) ? "swapped" : "players");
  if (!pool?.pools.some((p) => p.maps.some((map) => map.id === packet.mapId))) return reject("map");
  // a previous lobby's results must not become the first packet of a new match.
  if (m.winner === null && packet.ipcState !== IPC_PLAYING && !getLive(m.id)) {
    return Response.json(scoreOk(m.slug));
  }
  putLive(m.id, packet);
  return Response.json(scoreOk(m.slug));
}
