import { currentEdition, siteEdition } from "@/db";
import { log } from "@/lib/authz";
import { abortLobby, canLobby, closeLobby, lobbyOwner, ensureBot, inviteMissing, kickSlot, lobbyView, makeLobby, moveSlot, onLobby, refreshLobby, sayLocal, sendChat, abortTimer, spareSlot, startLobby, teamSlot } from "@/lib/bancho";
import { staffIds } from "@/db/users";
import { relayOnline } from "@/lib/relay";
import { sse } from "@/lib/sse";
import { visibleChatLine } from "@/lib/chat-visibility";
import { flagChat } from "@/lib/chat-filter";
import { withMatch } from "@/lib/match-access";
import type { ActionName } from "@/lib/action-names";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };
const RECHECK = 3000;

// live lobbies are keyed by bare match id and only exist for the site edition; bgcc6 shares those ids
const otherEdition = () => (currentEdition() !== siteEdition() ? Response.json({ error: "notFound" }, { status: 404 }) : null);

export async function GET(req: Request, ctx: Ctx) {
  const off = otherEdition();
  if (off) return off;
  const slug = (await ctx.params).slug;
  const { id, access: a } = await withMatch(slug);
  if (!a) return Response.json({ error: "forbidden" }, { status: 403 });
  void ensureBot().catch((e) => console.error("[bancho]", e));
  // a ref taken off the match mid-stream drops to the players' view (no password, filtered chat) within RECHECK
  let admin = a.admin;
  let checked = Date.now();
  return sse(
    req,
    async () => {
      if (admin && Date.now() - checked > RECHECK) {
        checked = Date.now();
        admin = !!(await withMatch(slug)).access?.admin;
      }
      if (admin) {
        const v = await lobbyView(id, a.osuId);
        return { ...v, chat: flagChat(v.chat) };
      }
      const v = await lobbyView(id);
      return { ...v, password: "", chat: flagChat(v.chat.filter(visibleChatLine)) };
    },
    onLobby,
  );
}

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : -1);

const LOBBY_ACTS = {
  make: "lobby.make",
  chat: "lobby.chat",
  invite: "lobby.invite",
  refresh: "lobby.refresh",
  start: "lobby.start",
  abort: "lobby.abort",
  close: "lobby.close",
  aborttimer: "lobby.aborttimer",
  kick: "lobby.kick",
  spare: "lobby.spare",
  team: "lobby.team",
  move: "lobby.move",
} as const satisfies Record<string, ActionName>;

type LobbyAct = keyof typeof LOBBY_ACTS;
const isLobbyAct = (a: string): a is LobbyAct => Object.hasOwn(LOBBY_ACTS, a);

export async function POST(req: Request, ctx: Ctx) {
  const off = otherEdition();
  if (off) return off;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const act = typeof b?.act === "string" ? b.act : "";
  const { id, access: a } = await withMatch((await ctx.params).slug);
  if (act === "say") {
    if (!a || (!a.team && !a.admin)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    const r = await sayLocal(a.match.id, a.osuId, String(b?.text ?? ""), a.team);
    return r === "ok" ? Response.json({ ok: true }) : Response.json({ ok: false, error: r }, { status: 429 });
  }
  if (!a?.admin) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  const { osuId } = a;
  const owner = await lobbyOwner(id);
  // a named referee (or host) may take over a lobby whose owner is another named referee with the helper offline
  const mine = owner === osuId || (owner !== null && (await staffIds(a.match.referee)).includes(owner) && !relayOnline(owner));
  if (act === "make" ? (owner !== null && !mine) || !canLobby(osuId) : !mine) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!isLobbyAct(act)) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  try {
    switch (act) {
      case "chat": {
        const r = await sendChat(id, osuId, String(b?.text ?? ""));
        if (r !== "ok") return Response.json({ ok: false, error: r }, { status: r === "noslot" || r === "nouser" ? 404 : r === "forbidden" ? 403 : 429 });
        break;
      }
      case "make":
        await makeLobby(id, osuId);
        break;
      case "invite":
        await inviteMissing(id);
        break;
      case "refresh":
        await refreshLobby(id);
        break;
      case "start":
        await startLobby(id, osuId, Math.min(300, Math.max(0, int(b?.secs))));
        break;
      case "abort":
        await abortLobby(id);
        break;
      case "close":
        await closeLobby(id);
        break;
      case "aborttimer":
        await abortTimer(id);
        break;
      case "kick":
        if ((await kickSlot(id, osuId, int(b?.slot))) === "empty") return Response.json({ ok: false, error: "empty" }, { status: 409 });
        break;
      case "spare":
        await spareSlot(id, osuId, !!b?.open);
        break;
      case "team":
        if ((await teamSlot(id, osuId, int(b?.slot), b?.team === "red" ? "red" : "blue")) === "empty") return Response.json({ ok: false, error: "empty" }, { status: 409 });
        break;
      case "move":
        if ((await moveSlot(id, osuId, int(b?.slot), int(b?.to))) === "empty") return Response.json({ ok: false, error: "empty" }, { status: 409 });
        break;
    }
  } catch (e) {
    console.error("[lobby]", act, e);
    const msg = e instanceof Error ? e.message : "";
    return Response.json({ ok: false, error: msg === "irc off" ? "ircOff" : msg === "teams missing" ? "noTeams" : msg === "no lobby" ? "noLobby" : "failed" }, { status: 500 });
  }
  if (act !== "refresh") void log(osuId, LOBBY_ACTS[act], { slot: b?.slot, to: b?.to, team: b?.team, secs: b?.secs, text: b?.text, open: b?.open, matchId: id });
  return Response.json({ ok: true });
}
