import { cn } from "@/lib/utils";
import { HEX } from "@/lib/theme";

export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "text-xl", md: "text-3xl", lg: "text-[clamp(4rem,13vw,11rem)]" }[size];
  return (
    <span className={cn("inline-flex items-baseline font-display font-black leading-none tracking-tight lowercase", s, className)}>
      <span>bgcc</span>
      <span className="ml-[0.04em] italic text-rose">7</span>
    </span>
  );
}

const GLYPHS = {
  leaf: (
    <>
      <path d="M12 15C6 15 1.5 10.5 2 3.5 5.5 5.5 9 5 11.3 2.5L12 8l.7-5.5C15 5 18.5 5.5 22 3.5 22.5 10.5 18 15 12 15Z" fill={HEX.balkan} />
      <path d="M12 14v8" stroke={HEX.paper} strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
  flag: (
    <>
      <path d="M5 2v21" stroke={HEX.paper} strokeWidth={2.6} />
      <polygon points="6,3 21,7.5 6,12" fill={HEX.rose} />
    </>
  ),
  hex: (
    <>
      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="none" stroke={HEX.paper} strokeWidth={2.6} />
      <circle cx={12} cy={12} r={3.2} fill={HEX.rose} />
    </>
  ),
  plus: (
    <>
      <path d="M12 2v20M2 12h20" stroke={HEX.balkan} strokeWidth={5} />
      <rect x={9.5} y={9.5} width={5} height={5} fill={HEX.rose} />
    </>
  ),
  ring: (
    <>
      <circle cx={12} cy={12} r={8.5} fill="none" stroke={HEX.rose} strokeWidth={3.4} />
      <circle cx={12} cy={12} r={3} fill={HEX.balkan} />
    </>
  ),
  spark: (
    <>
      <path d="M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z" fill={HEX.rose} />
      <circle cx={20} cy={4} r={2.4} fill={HEX.balkan} />
    </>
  ),
  diamond: (
    <>
      <rect x={4.5} y={4.5} width={15} height={15} transform="rotate(45 12 12)" fill={HEX.balkan} />
      <rect x={9.5} y={9.5} width={5} height={5} transform="rotate(45 12 12)" fill={HEX.rose} />
    </>
  ),
  asterisk: <path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10" stroke={HEX.rose} strokeWidth={3.4} />,
  crown: (
    <>
      <polygon points="2,19 3.5,6 8.5,12 12,3 15.5,12 20.5,6 22,19" fill={HEX.gold} />
      <circle cx={12} cy={15} r={2} fill={HEX.rose} />
    </>
  ),
  bolt: <polygon points="14,1 4,14 11,14 9,23 20,9 13,9" fill={HEX.rose} />,
  target: (
    <>
      <circle cx={12} cy={12} r={9.5} fill="none" stroke={HEX.paper} strokeWidth={2.4} />
      <circle cx={12} cy={12} r={5} fill={HEX.balkan} />
      <circle cx={12} cy={12} r={1.8} fill={HEX.rose} />
    </>
  ),
  play: (
    <>
      <polygon points="5,3 21,12 5,21" fill={HEX.balkan} />
      <polygon points="5,9 11,12 5,15" fill={HEX.rose} />
    </>
  ),
};

export function Glyph({ kind, className }: { kind: keyof typeof GLYPHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 shrink-0 overflow-visible", className)} aria-hidden>
      {GLYPHS[kind]}
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

export function Sparkle({ className, delay = 0, enter }: { className?: string; delay?: number; enter?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("anim-twinkle pointer-events-none absolute fill-current", enter !== undefined && "star-in", className)}
      style={{ animationDelay: enter !== undefined ? `${enter}s, ${enter + 0.7 + delay}s` : `${delay}s` }}
      aria-hidden
    >
      <path d={STAR} />
    </svg>
  );
}

export function Sparkles({ className }: { className?: string }) {
  return (
    <span className={cn("pointer-events-none absolute block size-12", className)} aria-hidden>
      <Sparkle className="right-0 top-0 size-4 text-rose-hi" />
      <Sparkle className="bottom-1 left-1 size-2.5 text-balkan-hi" delay={0.8} />
      <Sparkle className="bottom-0 right-3 size-1.5 text-paper/60" delay={1.6} />
    </span>
  );
}
