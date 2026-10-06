import { draftAccess } from "@/db/drafts";
import { getFormat } from "@/db/edition";
import { matchIdFromSlug } from "@/lib/format";
import { log } from "@/lib/authz";
import { abortLobby, closeLobby, ensureBot, hostSlot, inviteMissing, kickSlot, lobbyView, makeLobby, moveSlot, onLobby, refreshLobby, sendChat, simpleCmd, startLobby, teamSlot } from "@/lib/bancho";
import { sse } from "@/lib/sse";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

async function who(ctx: Ctx) {
  const id = matchIdFromSlug(await getFormat(), (await ctx.params).slug);
  const a = await draftAccess(id);
  return a?.admin ? { id, osuId: a.osuId } : null;
}

export async function GET(req: Request, ctx: Ctx) {
  const w = await who(ctx);
  if (!w) return Response.json({ error: "forbidden" }, { status: 403 });
  void ensureBot().catch((e) => console.error("[bancho]", e));
  return sse(req, () => lobbyView(w.id, w.osuId), 3000, onLobby);
}

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : -1);

export async function POST(req: Request, ctx: Ctx) {
  const w = await who(ctx);
  if (!w) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const act = typeof b?.act === "string" ? b.act : "";
  const { id, osuId } = w;
  try {
    switch (act) {
      case "chat": {
        const r = await sendChat(id, osuId, String(b?.text ?? ""));
        if (r !== "ok") return Response.json({ ok: false, error: r }, { status: 429 });
        break;
      }
      case "make":
        await makeLobby(id, osuId);
        break;
      case "invite":
        await inviteMissing(id, osuId);
        break;
      case "refresh":
        await refreshLobby(id);
        break;
      case "start":
        await startLobby(id, osuId, 10);
        break;
      case "abort":
        await abortLobby(id, osuId);
        break;
      case "close":
        await closeLobby(id, osuId);
        break;
      case "aborttimer":
        await simpleCmd(id, osuId, "aborttimer");
        break;
      case "kick":
        await kickSlot(id, osuId, int(b?.slot));
        break;
      case "host":
        await hostSlot(id, osuId, int(b?.slot));
        break;
      case "team":
        await teamSlot(id, osuId, int(b?.slot), b?.team === "red" ? "red" : "blue");
        break;
      case "move":
        await moveSlot(id, osuId, int(b?.slot), int(b?.to));
        break;
      default:
        return Response.json({ ok: false, error: "invalid" }, { status: 400 });
    }
  } catch (e) {
    console.error("[lobby]", act, e);
    return Response.json({ ok: false, error: "failed" }, { status: 500 });
  }
  if (act !== "refresh") void log(osuId, `lobby.${act}`, { matchId: id, ...(b ?? {}) });
  return Response.json({ ok: true });
}
