"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { animate, motion, MotionConfig, useMotionValue, useTransform, type Variants } from "motion/react";
import { belowFold } from "./in-view";

export const EASE = [0.16, 1, 0.3, 1] as const;

// the boot script only catches known software renderers (firefox often reports the real gpu with acceleration off),
// so slow frames after load also switch to lite for the rest of the session
function watchFrames(onLite: () => void) {
  const gaps: number[] = [];
  let last = 0;
  let raf = 0;
  const tick = (t: number) => {
    if (last && document.visibilityState === "visible") gaps.push(t - last);
    last = t;
    if (gaps.length < 40) raf = requestAnimationFrame(tick);
    else if ([...gaps].sort((a, b) => a - b)[20] > 24) onLite();
  };
  const start = setTimeout(() => (raf = requestAnimationFrame(tick)), 2500);
  return () => {
    clearTimeout(start);
    cancelAnimationFrame(raf);
  };
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // lite: small loops wait until the page intro (every finite animation) has finished (presentation.css .lite-loops)
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("lite-loops");
    const until = Date.now() + 4000;
    let t = 0;
    const check = () => {
      const busy = document.getAnimations().some((a) => a.playState === "running" && Number.isFinite(Number(a.effect?.getComputedTiming().endTime)));
      if (busy && Date.now() < until) t = window.setTimeout(check, 150);
      else html.classList.add("lite-loops");
    };
    t = window.setTimeout(check, 150);
    return () => clearTimeout(t);
  }, [path]);
  useEffect(() => {
    if (document.documentElement.classList.contains("lite")) return;
    return watchFrames(() => {
      document.documentElement.classList.add("lite");
      try {
        sessionStorage.setItem("lite", "1");
      } catch {}
    });
  }, []);
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: EASE }}>
      {children}
    </MotionConfig>
  );
}

export function useBelowFold<T extends Element>() {
  const ref = useRef<T>(null);
  const [below, setBelow] = useState(false);
  useLayoutEffect(() => {
    if (ref.current && belowFold(ref.current)) setBelow(true);
  }, []);
  return [ref, below] as const;
}

const Skip = createContext(false);

export function Reveal({ children, className, delay = 0, y = 24 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  const [ref, below] = useBelowFold<HTMLDivElement>();
  if (below)
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
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
  const [ref, below] = useBelowFold<HTMLDivElement>();
  if (below) {
    const Plain = as;
    return (
      <Skip.Provider value>
        <Plain ref={ref as React.Ref<never>} className={className}>
          {children}
        </Plain>
      </Skip.Provider>
    );
  }
  const Tag = motion[as];
  return (
    <Tag ref={ref as React.Ref<never>} className={className} variants={group} custom={gap} initial="hidden" whileInView="show" viewport={{ once: true, amount: "some" }}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" | "article" }) {
  const skip = useContext(Skip);
  if (skip) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  const Tag = motion[as];
  return (
    <Tag className={className} variants={item}>
      {children}
    </Tag>
  );
}

export function CountUp({ to, className, decimals = 0, suffix = "", delay = 0 }: { to: number; className?: string; decimals?: number; suffix?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const value = useMotionValue(0);
  const shown = useTransform(value, (v) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix);
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (belowFold(ref.current)) {
      value.set(to);
      return;
    }
    const c = animate(value, to, { duration: 1.6, ease: EASE, delay });
    return () => c.stop();
  }, [to, value, delay]);
  return (
    <motion.span ref={ref} className={className}>
      {shown}
    </motion.span>
  );
}
