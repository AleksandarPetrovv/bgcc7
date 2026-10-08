import { draftAccess } from "@/db/drafts";
import { getFormat } from "@/db/edition";
import { matchIdFromSlug } from "@/lib/format";
import { log } from "@/lib/authz";
import { abortLobby, closeLobby, ensureBot, inviteMissing, kickSlot, lobbyView, makeLobby, moveSlot, onLobby, refreshLobby, sayLocal, sendChat, simpleCmd, spareSlot, startLobby, teamSlot } from "@/lib/bancho";
import { sse } from "@/lib/sse";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

async function who(ctx: Ctx) {
  const id = matchIdFromSlug(await getFormat(), (await ctx.params).slug);
  const a = await draftAccess(id);
  return a?.admin ? { id, osuId: a.osuId } : null;
}

export async function GET(req: Request, ctx: Ctx) {
  const id = matchIdFromSlug(await getFormat(), (await ctx.params).slug);
  const a = await draftAccess(id);
  if (!a) return Response.json({ error: "forbidden" }, { status: 403 });
  void ensureBot().catch((e) => console.error("[bancho]", e));
  if (a.admin) return sse(req, () => lobbyView(id), 3000, onLobby);
  return sse(
    req,
    async () => {
      const v = await lobbyView(id);
      return { ...v, password: "", chat: v.chat.filter((c) => (c.text.startsWith("!") ? SHOW_CMD.test(c.text) : c.local || c.ref || c.from !== "BanchoBot" || KEEP.test(c.text))) };
    },
    3000,
    onLobby,
  );
}

const KEEP = /^(Match starts in|Queued the match to start|The match has started|Started the match|Good luck|Aborted the match|The match has finished|Countdown ends in|Countdown finished|Countdown aborted|Changed beatmap to|Enabled .*FreeMod|Changed match host)/i;

const SHOW_CMD = /^!mp (start|timer|aborttimer|abort)\b/i;

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : -1);

export async function POST(req: Request, ctx: Ctx) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const act = typeof b?.act === "string" ? b.act : "";
  if (act === "say") {
    const a = await draftAccess(matchIdFromSlug(await getFormat(), (await ctx.params).slug));
    if (!a || (!a.team && !a.admin)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    const r = await sayLocal(a.match.id, a.osuId, String(b?.text ?? ""), a.team);
    return r === "ok" ? Response.json({ ok: true }) : Response.json({ ok: false, error: r }, { status: 429 });
  }
  const w = await who(ctx);
  if (!w) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  const { id, osuId } = w;
  try {
    switch (act) {
      case "chat": {
        const r = await sendChat(id, osuId, String(b?.text ?? ""));
        if (r !== "ok") return Response.json({ ok: false, error: r }, { status: r === "noslot" || r === "nouser" ? 404 : 429 });
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
        await simpleCmd(id, osuId, "aborttimer");
        break;
      case "kick":
        await kickSlot(id, osuId, int(b?.slot));
        break;
      case "spare":
        await spareSlot(id, osuId, !!b?.open);
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
