"use client";

import { useEffect, useRef } from "react";
import { animate, motion, MotionConfig, useInView, useMotionValue, useTransform, type Variants } from "motion/react";

export const EASE = [0.16, 1, 0.3, 1] as const;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: EASE }}>
      {children}
    </MotionConfig>
  );
}

export function Reveal({ children, className, delay = 0, y = 24 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const group: Variants = { hidden: {}, show: (gap: number) => ({ transition: { staggerChildren: gap } }) };
const item: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

export function Stagger({ children, className, gap = 0.06, as = "div" }: { children: React.ReactNode; className?: string; gap?: number; as?: "div" | "ul" | "ol" }) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={group} custom={gap} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px 0px -5% 0px" }}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" | "article" }) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={item}>
      {children}
    </Tag>
  );
}

export function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const value = useMotionValue(0);
  const shown = useTransform(value, (v) => Math.round(v).toLocaleString("en-US"));
  useEffect(() => {
    if (!inView) return;
    const c = animate(value, to, { duration: 1.4, ease: EASE });
    return () => c.stop();
  }, [inView, to, value]);
  return (
    <motion.span ref={ref} className={className}>
      {shown}
    </motion.span>
  );
}
