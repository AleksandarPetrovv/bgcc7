import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { onDraft } from "@/db/drafts";

// gap: min ms between reads, so bursts of change events coalesce into one read
export function sse(req: Request, read: () => Promise<unknown>, every = 3000, subscribe: (fn: () => void) => () => void = onDraft, gap = 250) {
  const enc = new TextEncoder();
  let closed = false;
  let last = "";
  let off = () => {};
  let timer: ReturnType<typeof setInterval> | undefined;
  const t0 = Date.now();
  const path = new URL(req.url).pathname;
  const here = AsyncLocalStorage.snapshot();
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
