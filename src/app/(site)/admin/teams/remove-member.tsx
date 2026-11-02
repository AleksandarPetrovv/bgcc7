"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Crown } from "lucide-react";
import { Btn, ErrorNote } from "@/components/admin/form";
import { Popup } from "@/components/site/popup";
import { useDict } from "@/components/site/lang";
import { SlantBg } from "@/components/site/slant";
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
        setFail(true);
      }
    });

  return (
    <>
      <Btn type="button" tone="outline" small disabled={pending} onClick={() => (captain && mates.length ? setOpen(true) : run())}>
        {pending ? t.admin.saving : t.admin.remove}
      </Btn>
      {fail && !pending && <ErrorNote />}
      <Popup open={open} onClose={() => !pending && setOpen(false)} tone="gold" shadow={6} className="max-w-sm p-5 sm:p-6">
        <Crown className="size-7 fill-current text-gold-hi" />
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
              className="group relative isolate flex min-h-12 items-center gap-3 px-3 text-left disabled:opacity-50"
            >
              <SlantBg className="-skew-x-6 border border-line transition-colors group-hover:border-gold group-hover:bg-gold/10" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.avatar} alt="" className="size-8" />
              <span className="font-display font-black">{m.name}</span>
              <Crown className="ml-auto size-4 text-ash transition-colors group-hover:text-gold-hi" />
            </motion.button>
          ))}
        </div>
        {fail && !pending && <p className="mt-3"><ErrorNote /></p>}
      </Popup>
    </>
  );
}
