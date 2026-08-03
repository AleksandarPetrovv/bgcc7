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

export function Barcode({ value, className }: { value: string; className?: string }) {
  const state = { seed: [...value].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0 };
  const rnd = () => {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    return state.seed / 4294967296;
  };
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  while (x < 300) {
    const w = rnd() < 0.3 ? 5 : rnd() < 0.6 ? 2.5 : 1.2;
    bars.push({ x, w });
    x += w + (rnd() < 0.5 ? 2 : 4.5);
  }
  return (
    <svg viewBox="0 0 300 44" preserveAspectRatio="none" className={className} aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={44} fill="currentColor" />
      ))}
    </svg>
  );
}

const MOTIF = ["0001000", "0101010", "0012100", "1122211", "0012100", "0101010", "0001000"];

export function Shevitsa({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} className={className} shapeRendering="crispEdges" aria-hidden>
      {MOTIF.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "0" ? null : <rect key={`${x}-${y}`} x={x * 4} y={y * 4} width={4} height={4} fill={c === "1" ? "#e0242f" : "#0fa06a"} />,
        ),
      )}
    </svg>
  );
}

export function StitchRibbon({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-9 overflow-hidden bg-paper", className)} aria-hidden>
      <div className="stitch-bg absolute inset-x-0 top-1/2 h-7 -translate-y-1/2" style={{ backgroundSize: "36px 28px", backgroundPosition: "4px 0" }} />
    </div>
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
