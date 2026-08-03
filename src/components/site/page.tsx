"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rhombus } from "./graphics";
import { cn } from "@/lib/utils";

export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <div className="sticky top-16 z-30 bg-rose lg:top-[72px]">
      <nav className="mx-auto flex max-w-5xl items-stretch justify-center gap-2 overflow-x-auto px-4 sm:gap-10" aria-label="Section">
        {items.map((i) => {
          const active = path === i.href;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "flex shrink-0 items-center gap-2.5 px-3 py-2 text-[0.8rem] font-black uppercase tracking-wide transition-colors",
                active ? "text-white" : "text-ink/85 hover:text-white",
              )}
            >
              {active && <Rhombus className="text-white" />}
              {i.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageTitle({
  children,
  accent,
  right,
  className,
}: {
  children: React.ReactNode;
  accent?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-line pb-3", className)}>
      <h1 className="heading-slam text-5xl sm:text-6xl">
        {children}
        {accent && <span className="text-rose"> — {accent}</span>}
      </h1>
      {right && <div className="ml-auto flex flex-wrap items-center gap-3">{right}</div>}
    </div>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6", className)}>{children}</div>;
}

export function SectionHeading({ children, tone = "rose" }: { children: React.ReactNode; tone?: "rose" | "balkan" }) {
  return (
    <h2 className={cn("heading-slam mb-5 mt-14 border-b pb-2 text-4xl first:mt-0", tone === "rose" ? "border-rose" : "border-balkan")}>
      {children}
    </h2>
  );
}

export function Tag({ children, tone = "rose", className }: { children: React.ReactNode; tone?: "rose" | "balkan" | "ink" | "paper"; className?: string }) {
  const t = {
    rose: "bg-rose text-white",
    balkan: "bg-balkan text-white",
    ink: "bg-ink text-paper",
    paper: "bg-paper text-ink",
  }[tone];
  return <span className={cn("inline-block px-1.5 py-0.5 text-[0.6rem] font-black uppercase leading-none tracking-wide", t, className)}>{children}</span>;
}

export function SlantButton({
  children,
  tone = "rose",
  className,
  href,
}: {
  children: React.ReactNode;
  tone?: "rose" | "balkan" | "paper" | "outline";
  className?: string;
  href?: string;
}) {
  const t = {
    rose: "bg-rose text-white hover:bg-rose-deep",
    balkan: "bg-balkan text-white hover:bg-balkan-deep",
    paper: "bg-paper text-ink hover:bg-white",
    outline: "border border-line text-paper hover:border-rose",
  }[tone];
  const cls = cn("inline-flex -skew-x-12 items-center px-4 py-2 text-sm font-black uppercase tracking-wide transition", t, className);
  const inner = <span className="inline-flex skew-x-12 items-center gap-2">{children}</span>;
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls}>
      {inner}
    </button>
  );
}

export function StageSelect({ label, value, onPrev, onNext }: { label: string; value: string; onPrev?: () => void; onNext?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.6rem] font-black uppercase leading-tight text-ash">
        {label.split(" ").map((w) => (
          <span key={w} className="block">{w}</span>
        ))}
      </span>
      <button onClick={onPrev} aria-label="Previous" className="size-0 border-y-[9px] border-r-[14px] border-y-transparent border-r-rose transition hover:border-r-paper" />
      <span className="num min-w-24 text-center text-xl uppercase text-rose">{value}</span>
      <button onClick={onNext} aria-label="Next" className="size-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-rose transition hover:border-l-paper" />
    </div>
  );
}
