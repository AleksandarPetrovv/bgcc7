"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Gavel, LogOut } from "lucide-react";
import { Btn, ErrorNote } from "@/components/admin/form";
import { Popup, PopupTitle } from "@/components/site/popup";
import { Pic } from "@/components/site/pfp";
import { useDict, useLang } from "@/components/site/lang";
import { fullDayTime } from "@/lib/time";
import { errorText, type ActionError } from "@/lib/action-result";
import { dropMatch, takeMatch } from "./actions";

export type TakeKind = "take" | "drop" | "gone";
export type TakeInfo = { id: string; kind: TakeKind; label: string; teams: { name: string; image: string | null }[]; at: string | null };

const LIST = "/admin/matches";
const Ctx = createContext<(id: string) => void>(() => {});

/** the take / abandon popup; taking lives at /admin/matches/take/<match> so a discord link opens it straight away */
export function TakeHost({ infos, initial, children }: { infos: TakeInfo[]; initial?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState<string | null>(initial ?? null);
  const info = infos.find((i) => i.id === open);
  const show = (id: string) => {
    setOpen(id);
    if (infos.find((i) => i.id === id)?.kind !== "drop") history.pushState(null, "", `${LIST}/take/${id}`);
  };
  const close = () => {
    setOpen(null);
    if (location.pathname !== LIST) history.replaceState(null, "", LIST);
  };
  // the browser's back button closes it
  useEffect(() => {
    const back = () => location.pathname === LIST && setOpen(null);
    addEventListener("popstate", back);
    return () => removeEventListener("popstate", back);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <AnimatePresence>{info && <TakePopup key={info.id} info={info} onClose={close} />}</AnimatePresence>
    </Ctx.Provider>
  );
}

function TakePopup({ info, onClose }: { info: TakeInfo; onClose: () => void }) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [fail, setFail] = useState<ActionError | "" | null>(null);
  const tk = t.admin.take;
  const drop = info.kind === "drop";
  const go = () =>
    start(async () => {
      setFail(null);
      const r = await (drop ? dropMatch : takeMatch)(info.id).catch(() => null);
      if (!r?.ok) return setFail(r?.error ?? "");
      onClose();
      router.refresh();
    });
  return (
    <Popup onClose={onClose} tone={drop ? "line" : "rose"} className="max-w-2xl p-6 sm:p-10" label={drop ? tk.askAbandon : tk.askTake}>
      <PopupTitle className="heading-slam pr-6 text-2xl leading-tight sm:text-4xl">{info.kind === "gone" ? tk.gone : drop ? tk.askAbandon : tk.askTake}</PopupTitle>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        {info.teams.map((team, i) => (
          <div key={i} className={i === 0 ? "col-start-1 flex min-w-0 flex-col items-center gap-3 text-center" : "col-start-3 row-start-1 flex min-w-0 flex-col items-center gap-3 text-center"}>
            {team.image ? <Pic src={team.image} className="size-20 rounded-full object-cover sm:size-28" /> : <span className="size-20 rounded-full bg-slate sm:size-28" aria-hidden />}
            <span className="w-full break-words font-display text-base font-black leading-tight text-paper sm:text-xl">{team.name}</span>
          </div>
        ))}
        <span className="heading-slam col-start-2 row-start-1 text-xl text-ash sm:text-3xl">{t.common.vs}</span>
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center font-display text-sm font-bold text-paper sm:text-base">
        <CalendarClock className="size-4 shrink-0 text-ash" />
        {info.at ? fullDayTime(new Date(info.at), lang) : t.common.tbd}
      </p>
      <p className="mt-1.5 text-center text-xs font-display font-bold text-ash">{info.label}</p>

      {info.kind === "gone" ? (
        <div className="mt-8 flex justify-center">
          <Btn type="button" tone="outline" className="min-w-36" onClick={onClose}>
            {t.common.close}
          </Btn>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mx-auto sm:max-w-md">
          <Btn type="button" tone="outline" disabled={pending} onClick={onClose}>
            {drop ? tk.cancel : tk.decline}
          </Btn>
          <Btn type="button" tone={drop ? "danger" : "rose"} disabled={pending} onClick={go}>
            {drop ? tk.abandon : tk.accept}
          </Btn>
        </div>
      )}
      {fail && !pending && (
        <p className="mt-3 text-center">
          <ErrorNote>{errorText(t, fail || undefined)}</ErrorNote>
        </p>
      )}
    </Popup>
  );
}

/** the small button over a card's scoreline */
export function TakeButton({ id, kind }: { id: string; kind: Exclude<TakeKind, "gone"> }) {
  const t = useDict();
  const show = useContext(Ctx);
  const Icon = kind === "drop" ? LogOut : Gavel;
  return (
    <Btn type="button" small tone={kind === "drop" ? "outline" : "rose"} onClick={() => show(id)} className="min-h-8 px-3 text-[0.7rem]">
      <Icon className="size-3.5" />
      {kind === "drop" ? t.admin.take.abandon : t.admin.take.take}
    </Btn>
  );
}

/** a card glides to its new list when it changes hands */
export function CardSlot({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div layout="position" layoutId={`match-${id}`} transition={{ type: "spring", duration: 0.5, bounce: 0.12 }} className={className}>
      {children}
    </motion.div>
  );
}
