import { cn } from "@/lib/utils";

export function SpeedMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 40" className={className} aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={i} x={0} y={8 + i * 3} width={70 - i * 4} height={1.2} fill="#f4f3ee" opacity={0.18 + i * 0.06} />
      ))}
      <polygon points="48,6 64,6 52,34 36,34" fill="#f4f3ee" />
      <polygon points="68,6 84,6 72,34 56,34" fill="#0fa06a" />
      <polygon points="88,6 104,6 92,34 76,34" fill="#e0242f" />
    </svg>
  );
}

export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "text-xl", md: "text-3xl", lg: "text-[clamp(4rem,13vw,11rem)]" }[size];
  return (
    <span className={cn("inline-flex items-baseline font-display font-black leading-none tracking-tight lowercase", s, className)}>
      <span>bgcc</span>
      <span className="ml-[0.04em] italic text-rose">7</span>
    </span>
  );
}

export function TriTick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 16" className={cn("h-4 w-[30px] shrink-0", className)} aria-hidden>
      <polygon points="4,0 10,0 6,16 0,16" fill="#f4f3ee" />
      <polygon points="14,0 20,0 16,16 10,16" fill="#0fa06a" />
      <polygon points="24,0 30,0 26,16 20,16" fill="#e0242f" />
    </svg>
  );
}

export function Tricolor({ className, vertical }: { className?: string; vertical?: boolean }) {
  return (
    <div className={cn("flex", vertical ? "flex-row" : "flex-col", className)} aria-hidden>
      <div className="flex-1 bg-paper" />
      <div className="flex-1 bg-balkan" />
      <div className="flex-1 bg-rose" />
    </div>
  );
}

export function SpeedLines({ className, count = 14 }: { className?: string; count?: number }) {
  return (
    <svg viewBox="0 0 400 100" preserveAspectRatio="none" className={className} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <rect key={i} x={i * 9} y={(i * 100) / count} width={400 - i * 18} height={100 / count / 2.2} fill="currentColor" opacity={0.15 + (i / count) * 0.7} />
      ))}
    </svg>
  );
}

export function CheckerStitch({ className }: { className?: string }) {
  const cells = [];
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 16; x++)
      if ((x + y) % 2 === 0) cells.push(<rect key={`${x}-${y}`} x={x * 10} y={y * 10} width={10} height={10} fill="currentColor" opacity={(x / 16) * 0.9} />);
  return (
    <svg viewBox="0 0 160 60" className={className} shapeRendering="crispEdges" aria-hidden>
      {cells}
    </svg>
  );
}

export function Rhombus({ className }: { className?: string }) {
  return <span className={cn("inline-block size-1.5 rotate-45 bg-current", className)} aria-hidden />;
}

const STAR = "M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z";

export function Sparkle({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("anim-twinkle pointer-events-none absolute fill-current", className)} style={{ animationDelay: `${delay}s` }} aria-hidden>
      <path d={STAR} />
    </svg>
  );
}

export function Sparkles({ className }: { className?: string }) {
  return (
    <span className={cn("pointer-events-none absolute block size-12", className)} aria-hidden>
      <Sparkle className="right-0 top-0 size-4 text-rose-hi" />
      <Sparkle className="bottom-1 left-1 size-2.5 text-balkan" delay={0.8} />
      <Sparkle className="bottom-0 right-3 size-1.5 text-paper/60" delay={1.6} />
    </span>
  );
}
