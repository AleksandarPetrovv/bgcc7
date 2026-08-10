"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { SubHeading } from "@/components/site/page";
import { cn } from "@/lib/utils";
import { answerReschedule, cancelReschedule, requestReschedule, type RescheduleResult } from "./actions";

export type RescheduleItem = {
  matchId: string;
  round: string;
  opponent: string;
  when: string | null;
  deadline: string | null;
  closed: boolean;
  open: { id: number; own: boolean; status: "pending" | "accepted"; proposed: string; reason: string | null } | null;
  last: { status: string; proposed: string } | null;
};

const field = "h-10 min-w-0 border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-balkan";
const btn = "inline-flex min-h-10 items-center justify-center px-3 text-xs font-black uppercase tracking-wide transition disabled:opacity-50";

function ErrorText({ res }: { res: RescheduleResult }) {
  const t = useDict();
  if (!res || res.ok) return null;
  return <p className="text-xs font-bold text-rose-hi">{t.schedule.resched.errors[res.error ?? "error"] ?? t.schedule.resched.errors.error}</p>;
}

function RequestForm({ matchId, onDone }: { matchId: string; onDone: () => void }) {
  const t = useDict();
  const [res, action, pending] = useActionState(async (prev: RescheduleResult, fd: FormData) => {
    const r = await requestReschedule(matchId, prev, fd);
    if (r?.ok) onDone();
    return r;
  }, null);
  return (
    <form action={action} className="mt-3 space-y-2 border-t border-line pt-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ash">
          {t.schedule.resched.newTime}
          <input type="datetime-local" name="proposedAt" required className={cn(field, "[color-scheme:dark]")} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ash">
          {t.schedule.resched.reason}
          <input name="reason" maxLength={300} className={field} />
        </label>
      </div>
      <button disabled={pending} className={cn(btn, "bg-balkan text-ink hover:bg-paper")}>
        {pending ? "…" : t.schedule.resched.send}
      </button>
      <ErrorText res={res} />
    </form>
  );
}

function Row({ item }: { item: RescheduleItem }) {
  const t = useDict();
  const r = t.schedule.resched;
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const [res, setRes] = useState<RescheduleResult>(null);
  const run = (fn: () => Promise<RescheduleResult>) => start(async () => setRes(await fn()));
  return (
    <div className="border border-line bg-coal p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xs font-black uppercase text-rose-hi">{t.rounds[item.round] ?? item.round}</span>
        <span className="font-black">{r.vs(item.opponent)}</span>
        <span className="num ml-auto text-sm text-paper/80">{item.when ?? t.common.tbd}</span>
      </div>

      {item.open ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
          <p>
            {item.open.own ? r.proposed(item.open.proposed) : r.incoming(item.opponent, item.open.proposed)}
            {item.open.reason && <span className="text-ash"> · {item.open.reason}</span>}
          </p>
          <p className={cn("text-xs font-black uppercase", item.open.status === "accepted" ? "text-balkan" : "text-ash")}>
            {item.open.own || item.open.status === "accepted" ? r.status[item.open.status] : r.status.yourMove}
          </p>
          <div className={cn("flex flex-wrap gap-2", pending && "pointer-events-none opacity-60")}>
            {!item.open.own && item.open.status === "pending" && (
              <>
                <button type="button" onClick={() => run(() => answerReschedule(item.open!.id, true))} className={cn(btn, "bg-balkan text-ink hover:bg-paper")}>
                  {r.accept}
                </button>
                <button type="button" onClick={() => run(() => answerReschedule(item.open!.id, false))} className={cn(btn, "border border-rose text-rose-hi hover:bg-rose/10")}>
                  {r.decline}
                </button>
              </>
            )}
            {item.open.own && (
              <button type="button" onClick={() => run(() => cancelReschedule(item.open!.id))} className={cn(btn, "border border-line text-ash hover:border-rose hover:text-paper")}>
                {r.cancel}
              </button>
            )}
          </div>
          <ErrorText res={res} />
        </div>
      ) : (
        <>
          {item.last && <p className="mt-2 text-xs text-ash">{r.lastWas(r.status[item.last.status] ?? item.last.status, item.last.proposed)}</p>}
          {item.closed ? (
            <p className="mt-3 border-t border-line pt-3 text-sm text-ash">{r.closed}</p>
          ) : asking ? (
            <RequestForm matchId={item.matchId} onDone={() => setAsking(false)} />
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
              <button type="button" onClick={() => setAsking(true)} className={cn(btn, "gap-2 border border-line text-paper hover:border-rose")}>
                <CalendarClock className="size-4" /> {r.request}
              </button>
              {item.deadline && <span className="text-xs text-ash">{r.deadline(item.deadline)}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function RescheduleBox({ items }: { items: RescheduleItem[] }) {
  const t = useDict();
  if (!items.length) return null;
  return (
    <section className="mb-10">
      <SubHeading>{t.schedule.resched.yourMatches}</SubHeading>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((i) => (
          <Row key={i.matchId} item={i} />
        ))}
      </div>
    </section>
  );
}
