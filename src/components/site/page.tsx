"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import { useIntroSkip } from "./in-view";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/ease";
import { MARKS, type Mark } from "./title-marks";
import { LineDiamond } from "./rule";

export function Container({ children, className, plain }: { children: React.ReactNode; className?: string; plain?: boolean }) {
  return <div className={cn(!plain && "enter-kids", "mx-auto w-full max-w-page px-4 pt-6 sm:px-6 sm:pt-10 lg:px-10 2xl:px-14", className)}>{children}</div>;
}

export function SectionHeading({ children, mark = "glints" }: { children: React.ReactNode; mark?: Mark }) {
  const M = MARKS[mark];
  const ref = useRef<HTMLHeadingElement>(null);
  const below = useIntroSkip(ref);
  const cls = "heading-slam mb-5 mt-14 flex items-center gap-3 text-[clamp(1.6rem,7.5vw,2.25rem)] first:mt-0";
  if (below)
    return (
      <h2 ref={ref} className={cls}>
        <span>
          <M />
        </span>
        <span className="min-w-0 break-words">{children}</span>
        <LineDiamond />
      </h2>
    );
  return (
    <motion.h2
      ref={ref}
      className={cls}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: "some" }}
    >
      <motion.span variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }} transition={{ duration: 0.5, ease: EASE }}>
        <M />
      </motion.span>
      <motion.span className="min-w-0 break-words" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.6, delay: 0.05, ease: EASE }}>
        {children}
      </motion.span>
      <motion.span
        className="h-px flex-1 origin-left border-t-2 border-dashed border-line"
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }}
        transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
        aria-hidden
      />
      <motion.span
        className="size-2 shrink-0 rotate-45 bg-rose"
        variants={{ hidden: { opacity: 0, scale: 0 }, show: { opacity: 1, scale: 1 } }}
        transition={{ duration: 0.4, delay: 0.8, ease: EASE }}
        aria-hidden
      />
    </motion.h2>
  );
}

export function SubHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 flex items-center gap-2.5 text-sm font-display font-bold text-paper", className)}>
      {children}
      <span className="h-px flex-1 border-t border-dashed border-line" aria-hidden />
    </h2>
  );
}

export function Tag({ children, tone = "rose", className }: { children: React.ReactNode; tone?: "rose" | "balkan" | "ink" | "paper"; className?: string }) {
  const t = {
    rose: "bg-rose text-white",
    balkan: "bg-balkan text-on-fill",
    ink: "bg-ink text-paper",
    paper: "bg-paper text-ink",
  }[tone];
  return <span className={cn("inline-block px-1.5 py-0.5 text-[0.6rem] font-display font-bold leading-none", t, className)}>{children}</span>;
}
