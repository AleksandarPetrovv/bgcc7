const STAR = "M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z";

const BITS: { kind: "star" | "plus" | "diamond" | "slash" | "ring"; pos: React.CSSProperties; size: number; color: string; delay: number }[] = [
  { kind: "star", pos: { left: "3%", top: "22%" }, size: 16, color: "text-rose-hi", delay: 0 },
  { kind: "plus", pos: { left: "6%", top: "58%" }, size: 12, color: "text-paper", delay: 1.4 },
  { kind: "diamond", pos: { left: "2.5%", top: "84%" }, size: 10, color: "text-balkan", delay: 2.6 },
  { kind: "slash", pos: { right: "4%", top: "30%" }, size: 22, color: "text-rose", delay: 0.8 },
  { kind: "ring", pos: { right: "2.5%", top: "64%" }, size: 14, color: "text-paper", delay: 2 },
  { kind: "star", pos: { right: "6%", top: "88%" }, size: 11, color: "text-paper", delay: 3.2 },
  { kind: "plus", pos: { right: "7%", top: "12%" }, size: 9, color: "text-balkan", delay: 4 },
];

function Bit({ kind, size }: { kind: string; size: number }) {
  if (kind === "star")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className="fill-current">
        <path d={STAR} />
      </svg>
    );
  if (kind === "plus")
    return (
      <svg viewBox="0 0 12 12" width={size} height={size} className="stroke-current" strokeWidth={2}>
        <path d="M6 0V12M0 6H12" />
      </svg>
    );
  if (kind === "diamond") return <span className="block rotate-45 border-2 border-current" style={{ width: size, height: size }} />;
  if (kind === "ring") return <span className="block rounded-full border-2 border-dashed border-current" style={{ width: size, height: size }} />;
  return (
    <svg viewBox="0 0 22 12" width={size} height={size * 0.55} className="fill-current">
      <polygon points="4,0 7,0 3,12 0,12" />
      <polygon points="11,0 14,0 10,12 7,12" />
      <polygon points="18,0 21,0 17,12 14,12" />
    </svg>
  );
}

export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="anim-blob-a absolute -left-[20vw] -top-[25vh] h-[80vh] w-[70vw] bg-[radial-gradient(closest-side,rgb(15_160_106/0.09),transparent)]" />
      <div className="anim-blob-b absolute -bottom-[30vh] -right-[20vw] h-[85vh] w-[75vw] bg-[radial-gradient(closest-side,rgb(224_36_47/0.09),transparent)]" />
      <div className="backdrop-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_75%)]" />
      <div className="absolute inset-0 hidden 2xl:block">
        {BITS.map((b, i) => (
          <span key={i} className={`anim-float absolute opacity-25 ${b.color}`} style={{ ...b.pos, animationDelay: `-${b.delay}s`, animationDuration: `${7 + (i % 3) * 2}s` }}>
            <Bit kind={b.kind} size={b.size} />
          </span>
        ))}
      </div>
    </div>
  );
}
