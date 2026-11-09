"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { Bell, Eye } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popup, PopupTitle } from "./popup";
import { SlantBg, SlantButton } from "./slant";
import { useDict, useLang } from "./lang";
import { clearTeamNotes, decideTeamRequest, seeHostNote } from "@/actions/team-requests";
import { errorText } from "@/lib/action-result";
import { localeOf } from "@/lib/i18n/locale";
import { fmtSofia } from "@/lib/time";
import type { CaptainNote, HostReq } from "@/db/team-requests";
import type { HostNote } from "@/db/host-notes";

// requests: hosts only. notes: answers to the viewer's own team requests
export type BellFeed = { requests: HostReq[]; notes: CaptainNote[]; hostNotes: HostNote[] };

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

function Diamond() {
  return (
    <div className="flex items-center gap-3 px-5" aria-hidden>
      <span className="h-px flex-1 border-t border-dashed border-line" />
      <span className="size-2 rotate-45 bg-rose" />
      <span className="h-px flex-1 border-t border-dashed border-line" />
    </div>
  );
}

/** only drawn while there is something */
export function TeamBell({ feed }: { feed: BellFeed | null }) {
  const t = useDict();
  const r = t.teamReq;
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ req: HostReq; step: "review" | "decline" } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const count = (feed?.requests.length ?? 0) + (feed?.notes.length ?? 0) + (feed?.hostNotes.length ?? 0);
  if (!count && !view) return null;

  const decide = (accept: boolean) =>
    start(async () => {
      const res = await decideTeamRequest(view!.req.id, accept, reason).catch(() => null);
      if (!res?.ok) return setError(errorText(t, res?.error));
      setView(null);
      router.refresh();
    });

  const goMe = () =>
    start(async () => {
      await clearTeamNotes().catch(() => null);
      setOpen(false);
      router.push("/me");
      router.refresh();
    });

  return (
    <>
      {!!feed && count > 0 && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger aria-label={r.bell} title={r.bell} className="in-pop relative flex size-9 items-center justify-center text-paper transition-colors hover:text-rose-hi" style={d(0.3)}>
            <Bell className="size-5" />
            <span className="absolute right-1.5 top-1.5 size-2 animate-pulse rounded-full bg-rose shadow-[0_0_0_2px_var(--ink)]" aria-hidden />
          </SheetTrigger>
          <SheetContent side="right" className="flex h-dvh w-full max-w-xs flex-col overflow-hidden border-line bg-ink p-0 sm:max-w-xs">
            <SheetTitle className="in-up heading-slam px-5 pb-2 pt-5 text-xl" style={d(0.1)}>
              {r.bell}
            </SheetTitle>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
              {feed.notes.map((n, i) => (
                <Fragment key={`n${n.id}`}>
                  {i > 0 && <Diamond />}
                  <div className="in-up flex flex-col gap-2 px-5 py-4" style={d(0.18 + i * 0.07)}>
                    <span className="num text-[0.75rem] text-ash">{fmtSofia(new Date(n.at), localeOf(lang))}</span>
                    <p className={n.ok ? "text-sm font-bold text-balkan-hi" : "text-sm font-bold text-rose-hi"}>{r.done(n.ok)}</p>
                    {!n.ok && n.note && (
                      <p className="text-sm text-paper">
                        <span className="font-display font-bold text-ash">{r.note}: </span>
                        {n.note}
                      </p>
                    )}
                  </div>
                </Fragment>
              ))}
              {feed.notes.length > 0 && (
                <div className="in-up flex justify-center px-5 pb-4 pt-1" style={d(0.18 + feed.notes.length * 0.07)}>
                  <SlantButton onClick={goMe} disabled={pending} className="px-6 py-2.5">
                    {r.goMe}
                  </SlantButton>
                </div>
              )}
              {feed.requests.map((q, i) => (
                <Fragment key={`r${q.id}`}>
                  {(i > 0 || feed.notes.length > 0) && <Diamond />}
                  <div className="in-up flex flex-col gap-3 px-5 py-4" style={d(0.25 + (feed.notes.length + i) * 0.07)}>
                    <p className="text-sm text-paper">
                      <span className="font-display font-bold">{q.team}</span> {r.asked(q.team).slice(q.team.length).trim()}
                    </p>
                    <SlantButton
                      tone="outline"
                      className="self-start px-4 py-1.5"
                      onClick={() => {
                        setOpen(false);
                        setError(null);
                        setReason("");
                        setTimeout(() => setView({ req: q, step: "review" }), 220);
                      }}
                    >
                      <Eye className="size-4 text-rose" aria-hidden />
                      {r.view}
                    </SlantButton>
                  </div>
                </Fragment>
              ))}
              {feed.hostNotes.map((n, i) => {
                const before = feed.notes.length + feed.requests.length;
                return (
                  <Fragment key={`h${n.id}`}>
                    {(i > 0 || before > 0) && <Diamond />}
                    <div className="in-up flex flex-col gap-3 px-5 py-4" style={d(0.25 + (before + i) * 0.07)}>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-paper">{n.title}</p>
                        {n.lines.map((l, j) => (
                          <p key={j} className="break-all text-sm text-paper">
                            {l}
                          </p>
                        ))}
                      </div>
                      <SlantButton
                        tone="outline"
                        className="self-start px-4 py-1.5"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await seeHostNote(n.id).catch(() => null);
                            setOpen(false);
                            router.push(n.href);
                          })
                        }
                      >
                        {r.open}
                      </SlantButton>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      )}
      <AnimatePresence>
        {view?.step === "review" && (
          <Popup key="review" onClose={() => setView(null)} label={r.view} className="p-5 sm:p-6">
            <PopupTitle className="in-up pr-6 text-sm text-ash" style={d(0.1)}>
              {r.review(view.req.team)}
            </PopupTitle>
            <div className="in-up mt-5 flex flex-col items-center gap-3" style={d(0.2)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={view.req.pic} alt="" className="size-32 rounded-full bg-slate object-cover sm:size-36" />
              <span className="heading-slam max-w-full truncate text-center text-2xl">{view.req.name}</span>
            </div>
            {error && <p className="mt-4 text-center text-sm font-bold text-rose-hi">{error}</p>}
            <div className="in-up mt-6 flex justify-center gap-3" style={d(0.3)}>
              <SlantButton tone="outline" disabled={pending} onClick={() => setView({ ...view, step: "decline" })} className="px-6 py-2.5">
                {r.decline}
              </SlantButton>
              <SlantButton tone="balkan" disabled={pending} onClick={() => decide(true)} className="px-6 py-2.5">
                {r.accept}
              </SlantButton>
            </div>
          </Popup>
        )}
        {view?.step === "decline" && (
          <Popup key="decline" onClose={() => setView({ ...view, step: "review" })} label={r.declineTitle} className="p-5 sm:p-6">
            <PopupTitle className="in-up heading-slam pr-6 text-2xl" style={d(0.1)}>
              {r.declineTitle}
            </PopupTitle>
            <label className="in-up mt-4 flex flex-col gap-2" style={d(0.18)}>
              <span className="text-xs font-display font-bold text-paper">{r.reason}</span>
              <span className="group/rs relative isolate flex border border-transparent">
                <SlantBg className="-inset-px border border-line bg-ink group-focus-within/rs:border-rose" />
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  rows={4}
                  autoFocus
                  className="adm-bare min-w-0 flex-1 resize-none border-0 bg-transparent px-4 py-3 text-base text-paper outline-none"
                />
              </span>
              <span className="text-[0.7rem] text-ash">{r.reasonHint}</span>
            </label>
            {error && <p className="mt-3 text-sm font-bold text-rose-hi">{error}</p>}
            <div className="in-up mt-5 flex justify-center gap-3" style={d(0.26)}>
              <SlantButton tone="outline" disabled={pending} onClick={() => setView({ ...view, step: "review" })} className="px-6 py-2.5">
                {r.cancel}
              </SlantButton>
              <SlantButton disabled={pending || !reason.trim()} onClick={() => decide(false)} className="px-6 py-2.5">
                {r.decline}
              </SlantButton>
            </div>
          </Popup>
        )}
      </AnimatePresence>
    </>
  );
}
