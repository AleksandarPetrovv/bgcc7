import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { ipOf } from "@/lib/ip";
import { globalStore } from "@/lib/global-store";
import { currentOsuId } from "@/auth";
import { currentEdition } from "@/db";
import { readRoles } from "@/lib/authz";

// open streams per ip, so one client can't pile up connections that each poll the db. a host's pc alone holds a lot
// (every site tab's alerts, admin, /draw, each obs overlay source), and viewers behind one shared ip add up, so this stays roomy
const MAX_PER_IP = 120;
const openPerIp = globalStore("bgccSseOpen", () => new Map<string, number>());

// a signed-in stream closes once the viewer's roles change, so a demotion cuts it off within this; the client reconnects and the route re-checks access
const ROLE_CHECK = 3000;
// one roles read per viewer per check, shared by all their open streams
const rolesSeen = globalStore("bgccSseRoles", () => new Map<string, { at: number; roles: Promise<string> }>());
const rolesNow = (osuId: number) => {
  const key = `${currentEdition()}:${osuId}`;
  const hit = rolesSeen.get(key);
  if (hit && Date.now() - hit.at < ROLE_CHECK) return hit.roles;
  const roles = readRoles(osuId).then((r) => JSON.stringify(r));
  rolesSeen.set(key, { at: Date.now(), roles });
  return roles;
};

export const SSE_HEADERS = { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" };

/**
 * a read-and-diff stream: `read` runs on every `subscribe` event and every `every` ms, only changed results go out.
 * gap: min ms between reads, so bursts of change events coalesce into one read
 */
export function sse(req: Request, read: () => Promise<unknown>, subscribe: (fn: () => void) => () => void, every = 3000, gap = 250) {
  const ip = ipOf(req);
  const count = openPerIp.get(ip) ?? 0;
  if (count >= MAX_PER_IP) return new Response("too many streams", { status: 429, headers: { "Retry-After": "60" } });
  openPerIp.set(ip, count + 1);
  const enc = new TextEncoder();
  let closed = false;
  let last = "";
  let off = () => {};
  let timer: ReturnType<typeof setInterval> | undefined;
  let roleTimer: ReturnType<typeof setInterval> | undefined;
  const t0 = Date.now();
  const path = new URL(req.url).pathname;
  const here = AsyncLocalStorage.snapshot();
  const stop = (why = "?") => {
    if (closed) return;
    console.log(`[sse] close ${path} after ${Math.round((Date.now() - t0) / 1000)}s (${why})`);
    closed = true;
    const n = (openPerIp.get(ip) ?? 1) - 1;
    if (n > 0) openPerIp.set(ip, n);
    else openPerIp.delete(ip);
    off();
    clearInterval(timer);
    clearInterval(roleTimer);
  };
  const stream = new ReadableStream({
    async start(ctrl) {
      const end = (why: string) => {
        stop(why);
        try {
          ctrl.close();
        } catch {}
      };
      const who = await currentOsuId().catch(() => null);
      const had = who && (await rolesNow(who).catch(() => null));
      if (who && had && !closed)
        roleTimer = setInterval(
          () =>
            here(() =>
              rolesNow(who).then(
                (r) => r !== had && end("roles changed"),
                // a db blip keeps the stream; the next check decides
                () => {},
              ),
            ),
          ROLE_CHECK,
        );
      const send = (s: string) => {
        if (closed) return;
        try {
          ctrl.enqueue(enc.encode(s));
        } catch {
          stop("write failed");
        }
      };
      let busy = false;
      let again = false;
      let lastRead = 0;
      const push = async () => {
        if (closed) return;
        // a change during a read is queued, not dropped, so the newest state always goes out
        if (busy) {
          again = true;
          return;
        }
        busy = true;
        try {
          do {
            again = false;
            const wait = lastRead + gap - Date.now();
            if (wait > 0) await new Promise((r) => setTimeout(r, wait));
            if (closed) break;
            lastRead = Date.now();
            try {
              const json = JSON.stringify((await read()) ?? null);
              if (json !== last) {
                last = json;
                send(`data: ${json}\n\n`);
              }
            } catch {}
          } while (again && !closed);
        } finally {
          busy = false;
        }
      };
      off = subscribe(() => here(() => void push()));
      timer = setInterval(() => {
        send(": ping\n\n");
        here(() => void push());
      }, every);
      req.signal.addEventListener("abort", () => end("client gone"));
      if (req.signal.aborted) return stop("client gone");
      await push();
    },
    cancel: () => stop("cancelled"),
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
