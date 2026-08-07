"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TriTick } from "./graphics";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";

export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  const t = useDict();
  return (
    <div className="sticky top-16 z-30 border-b border-line bg-coal/95 backdrop-blur lg:top-[72px]">
      <nav className="mx-auto flex max-w-6xl items-stretch gap-1 overflow-x-auto px-4 sm:gap-6 sm:px-6" aria-label={t.nav.section}>
        {items.map((i) => {
          const active = path === i.href;
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 shrink-0 items-center px-2 text-[0.8rem] font-black uppercase tracking-wide transition-colors",
                active ? "text-paper" : "text-ash hover:text-paper",
              )}
            >
              {i.label}
              {active && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-rose" aria-hidden />}
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
      <h1 className="heading-slam min-w-0 max-w-full text-[clamp(2rem,8.5vw,3rem)] break-words sm:text-6xl">
        {children}
        {accent && <span className="text-rose-hi"> / {accent}</span>}
      </h1>
      {right && <div className="ml-auto flex flex-wrap items-center gap-3">{right}</div>}
    </div>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6", className)}>{children}</div>;
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="heading-slam mb-5 mt-14 flex items-center gap-3 text-[clamp(1.6rem,7.5vw,2.25rem)] first:mt-0">
      <TriTick />
      <span className="min-w-0 break-words">{children}</span>
      <span className="h-px flex-1 border-t border-dashed border-line" aria-hidden />
    </h2>
  );
}

export function SubHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 flex items-center gap-2.5 text-sm font-black uppercase tracking-wide text-paper", className)}>
      {children}
      <span className="h-px flex-1 border-t border-dashed border-line" aria-hidden />
    </h2>
  );
}

export function Tag({ children, tone = "rose", className }: { children: React.ReactNode; tone?: "rose" | "balkan" | "ink" | "paper"; className?: string }) {
  const t = {
    rose: "bg-rose text-white",
    balkan: "bg-balkan text-ink",
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
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  tone?: "rose" | "balkan" | "paper" | "outline";
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const t = {
    rose: "bg-rose text-white hover:bg-rose-deep",
    balkan: "bg-balkan text-ink hover:bg-paper",
    paper: "bg-paper text-ink hover:bg-white",
    outline: "border border-line text-paper hover:border-rose",
  }[tone];
  const cls = cn("inline-flex -skew-x-12 items-center px-4 py-2 text-sm font-black uppercase tracking-wide transition", t, className);
  const inner = <span className="inline-flex skew-x-12 items-center gap-2">{children}</span>;
  if (href?.startsWith("http"))
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type={type} onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function StageTabs({ options, index, onChange, locked = [] }: { options: string[]; index: number; onChange: (i: number) => void; locked?: number[] }) {
  const t = useDict();
  return (
    <div className="flex overflow-x-auto border border-line" role="tablist" aria-label={t.common.stage}>
      {options.map((o, i) => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={i === index}
          disabled={locked.includes(i)}
          onClick={() => onChange(i)}
          className={cn(
            "num min-h-10 shrink-0 border-r border-line px-3.5 text-base uppercase transition-colors last:border-r-0",
            i === index ? "bg-paper text-ink" : "text-ash hover:bg-slate hover:text-paper",
            "disabled:cursor-not-allowed disabled:text-ash/35 disabled:hover:bg-transparent",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
