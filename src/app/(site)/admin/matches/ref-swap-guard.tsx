"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useConfirmWhen } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { SlantBg } from "@/components/site/slant";

function Name({ n }: { n: string }) {
  return (
    <span className="relative isolate inline-flex min-w-0 max-w-full px-3 py-1.5">
      <SlantBg className="border border-line bg-slate" />
      <span className="truncate text-base font-display font-black">{n}</span>
    </span>
  );
}

export function RefSwapGuard({ live, lobby, from }: { live: boolean; lobby: boolean; from: string }) {
  const t = useDict();
  const r = t.admin.refSwap;
  useConfirmWhen(
    live
      ? (fd) => {
          const to = String(fd.get("referee") ?? "");
          if (to === from) return null;
          return {
            text: r.title,
            yes: r.yes,
            no: r.no,
            body: (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Name n={from || t.common.tbd} />
                  <motion.span initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1, transition: { delay: 0.15 } }}>
                    <ArrowRight className="size-5 text-rose-hi" />
                  </motion.span>
                  <Name n={to || t.common.tbd} />
                </div>
                <p className="mt-4 text-sm text-paper/75">{r.text(to || t.common.tbd, from || t.common.tbd)}</p>
                {lobby && <p className="mt-1.5 text-sm font-display font-bold text-gold-hi">{r.lobby}</p>}
              </>
            ),
          };
        }
      : null,
  );
  return null;
}
