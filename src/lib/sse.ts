import "server-only";
import { onDraft } from "@/db/drafts";

export function sse(req: Request, read: () => Promise<unknown>, every = 3000, subscribe: (fn: () => void) => () => void = onDraft) {
  const enc = new TextEncoder();
  let closed = false;
  let last = "";
  let off = () => {};
  let timer: ReturnType<typeof setInterval> | undefined;
  const t0 = Date.now();
  const path = new URL(req.url).pathname;
  const stop = (why = "?") => {
    if (closed) return;
    console.log(`[sse] close ${path} after ${Math.round((Date.now() - t0) / 1000)}s (${why})`);
    closed = true;
    off();
    clearInterval(timer);
  };
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (s: string) => {
        if (closed) return;
        try {
          ctrl.enqueue(enc.encode(s));
        } catch {
          stop("write failed");
        }
      };
      let busy = false;
      const push = async () => {
        if (busy || closed) return;
        busy = true;
        try {
          const json = JSON.stringify((await read()) ?? null);
          if (json !== last) {
            last = json;
            send(`data: ${json}\n\n`);
          }
        } catch {
        } finally {
          busy = false;
        }
      };
      off = subscribe(() => void push());
      timer = setInterval(() => {
        send(": ping\n\n");
        void push();
      }, every);
      req.signal.addEventListener("abort", () => {
        stop("client gone");
        try {
          ctrl.close();
        } catch {}
      });
      await push();
    },
    cancel: () => stop("cancelled"),
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
