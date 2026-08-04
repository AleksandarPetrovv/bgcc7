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

const GLYPHS: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001",
  B: "11110 10001 10001 11110 10001 10001 11110",
  C: "01111 10000 10000 10000 10000 10000 01111",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01111 10000 10000 10011 10001 10001 01111",
  H: "10001 10001 10001 11111 10001 10001 10001",
  I: "11111 00100 00100 00100 00100 00100 11111",
  J: "00111 00010 00010 00010 10010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001",
  L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001",
  N: "10001 11001 10101 10011 10001 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 10101 01010",
  X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100",
  Z: "11111 00001 00010 00100 01000 10000 11111",
  "0": "01110 10001 10011 10101 11001 10001 01110",
  "1": "00100 01100 00100 00100 00100 00100 01110",
  "2": "01110 10001 00001 00010 00100 01000 11111",
  "3": "11110 00001 00001 01110 00001 00001 11110",
  "4": "00010 00110 01010 10010 11111 00010 00010",
  "5": "11111 10000 11110 00001 00001 10001 01110",
  "6": "00110 01000 10000 11110 10001 10001 01110",
  "7": "11111 00001 00010 00100 01000 01000 01000",
  "8": "01110 10001 10001 01110 10001 10001 01110",
  "9": "01110 10001 10001 01111 00001 00010 01100",
  "-": "00000 00000 00000 01110 00000 00000 00000",
  "#": "01010 01010 11111 01010 11111 01010 01010",
  ".": "00000 00000 00000 00000 00000 00000 00100",
  " ": "00000 00000 00000 00000 00000 00000 00000",
};

export function StitchText({
  value,
  colors = ["currentColor"],
  label,
  className,
}: {
  value: string;
  colors?: string[];
  label?: string;
  className?: string;
}) {
  const chars = [...value.toUpperCase()].filter((c) => GLYPHS[c]);
  const width = chars.length * 24 - 4;
  return (
    <svg
      viewBox={`-1 -1 ${width + 2} 30`}
      preserveAspectRatio="xMinYMid meet"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {chars.flatMap((c, ci) =>
        GLYPHS[c].split(" ").flatMap((row, y) =>
          [...row].map((on, x) => {
            if (on === "0") return null;
            const px = ci * 24 + x * 4;
            const py = y * 4;
            return (
              <path
                key={`${ci}-${x}-${y}`}
                d={`M${px + 0.6} ${py + 0.6}L${px + 3.4} ${py + 3.4}M${px + 3.4} ${py + 0.6}L${px + 0.6} ${py + 3.4}`}
                stroke={colors[ci % colors.length]}
                strokeWidth={1.1}
                strokeLinecap="square"
              />
            );
          }),
        ),
      )}
    </svg>
  );
}

export function StitchRule({ className, tone = "rose" }: { className?: string; tone?: "rose" | "balkan" | "paper" }) {
  return <span className={cn("stitch-rule block h-1.5", `stitch-rule-${tone}`, className)} aria-hidden />;
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
