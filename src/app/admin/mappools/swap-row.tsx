"use client";

import { motion } from "motion/react";

export function SwapRow({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <motion.li layout="position" transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.9 }} className="relative bg-coal">
      <div className={className} style={style}>
        {children}
      </div>
    </motion.li>
  );
}
