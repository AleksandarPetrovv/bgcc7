"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Crown, X } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { removeMember } from "./actions";

type Mate = { id: number; name: string; avatar: string };

export function RemoveMember({ osuId, captain, mates }: { osuId: number; captain: boolean; mates: Mate[] }) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [fail, setFail] = useState(false);

  const run = (heir?: number) =>
    start(async () => {
      try {
        const res = await removeMember(osuId, heir);
        setFail(!res?.ok);
        if (res?.ok) setOpen(false);
      } catch {
        window.location.reload();
      }
    });

  return (
    <>
      <Btn type="button" tone="outline" small disabled={pending} onClick={() => (captain && mates.length ? setOpen(true) : run())}>
        {pending ? t.admin.saving : t.admin.remove}
      </Btn>
      {fail && !pending && <span className="text-xs font-bold uppercase text-rose-hi">{t.admin.error}</span>}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
                onClick={() => !pending && setOpen(false)}
              >
                <motion.div
                  initial={{ y: 40, scale: 0.92 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 340, damping: 26 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-sm border-2 border-[#e8c547] bg-coal p-5 shadow-[6px_6px_0_0_#9c7f1f]"
                  role="dialog"
                  aria-modal="true"
                >
                  <button type="button" onClick={() => setOpen(false)} aria-label={t.draft.close} className="absolute right-2 top-2 p-2 text-ash hover:text-paper">
                    <X className="size-4" />
                  </button>
                  <Crown className="size-7 fill-current text-[#e8c547]" />
                  <h3 className="heading-slam mt-2 text-2xl">{t.admin.heirTitle}</h3>
                  <p className="mt-1 text-sm text-ash">{t.admin.heirText}</p>
                  <div className="mt-4 grid gap-2">
                    {mates.map((m, i) => (
                      <motion.button
                        key={m.id}
                        type="button"
                        disabled={pending}
                        onClick={() => run(m.id)}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: 0.08 + i * 0.05 } }}
                        className="group flex min-h-12 -skew-x-6 items-center gap-3 border border-line px-3 text-left transition-colors hover:border-[#e8c547] hover:bg-[#e8c547]/10 disabled:opacity-50"
                      >
                        <span className="flex skew-x-6 items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.avatar} alt="" className="size-8" />
                          <span className="font-black">{m.name}</span>
                        </span>
                        <Crown className="ml-auto size-4 skew-x-6 text-ash transition-colors group-hover:text-[#e8c547]" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
