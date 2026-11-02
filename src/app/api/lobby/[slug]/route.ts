import { currentEdition, siteEdition } from "@/db";
import { log } from "@/lib/authz";
import { abortLobby, canLobby, closeLobby, lobbyOwner, ensureBot, inviteMissing, kickSlot, lobbyView, makeLobby, moveSlot, onLobby, refreshLobby, sayLocal, sendChat, abortTimer, spareSlot, startLobby, teamSlot } from "@/lib/bancho";
import { sse } from "@/lib/sse";
import { visibleChatLine } from "@/lib/chat-visibility";
import { withMatch } from "@/lib/match-access";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

// live lobbies are keyed by bare match id and only exist for the site edition; bgcc6 shares those ids
const otherEdition = () => (currentEdition() !== siteEdition() ? Response.json({ error: "notFound" }, { status: 404 }) : null);

export async function GET(req: Request, ctx: Ctx) {
  const off = otherEdition();
  if (off) return off;
  const { id, access: a } = await withMatch((await ctx.params).slug);
  if (!a) return Response.json({ error: "forbidden" }, { status: 403 });
  void ensureBot().catch((e) => console.error("[bancho]", e));
  if (a.admin) return sse(req, () => lobbyView(id, a.osuId), onLobby);
  return sse(
    req,
    async () => {
      const v = await lobbyView(id);
      return { ...v, password: "", chat: v.chat.filter(visibleChatLine) };
    },
    onLobby,
  );
}

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : -1);

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
  if (act === "make" ? (owner !== null && owner !== osuId) || !canLobby(osuId) : owner !== osuId) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
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
      default:
        return Response.json({ ok: false, error: "invalid" }, { status: 400 });
    }
  } catch (e) {
    console.error("[lobby]", act, e);
    return Response.json({ ok: false, error: "failed" }, { status: 500 });
  }
  if (act !== "refresh") void log(osuId, `lobby.${act}`, { ...(b ?? {}), matchId: id });
  return Response.json({ ok: true });
}
