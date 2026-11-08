import Link from "next/link";
import { cn } from "@/lib/utils";

/** the house slant: only this background layer is skewed, so the parent's text and icons stay untransformed and crisp.
 *  the parent needs `relative isolate`; colours, borders, shadows and `group-hover:` states go in `className` (or `style`). */
export function SlantBg({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden style={style} className={cn("pointer-events-none absolute inset-0 -z-10 -skew-x-12", className)} />;
}

export function SlantButton({
  children,
  tone = "rose",
  className,
  href,
  onClick,
  type = "button",
  download,
  disabled,
  fill,
}: {
  children: React.ReactNode;
  tone?: "rose" | "balkan" | "paper" | "outline";
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  download?: boolean;
  disabled?: boolean;
  fill?: string;
}) {
  // [text, skewed background]: skew on an absolute span so the text is never transformed (blurry otherwise)
  const [text, bg] = {
    rose: ["text-white", "bg-rose group-hover/sk:bg-rose-hi"],
    balkan: ["text-on-fill hover:text-ink", "bg-balkan group-hover/sk:bg-paper"],
    paper: ["text-ink", "bg-paper group-hover/sk:bg-rose-deep"],
    outline: ["text-paper", "border border-line group-hover/sk:border-rose"],
  }[tone];
  const cls = cn("group/sk relative isolate inline-flex items-center gap-2 px-4 py-2 text-sm font-display font-bold", text, className);
  const inner = (
    <>
      <SlantBg className={cn(bg, fill)} />
      {children}
    </>
  );
  if (href && download)
    return (
      <a href={href} download className={cls}>
        {inner}
      </a>
    );
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
    <button type={type} onClick={onClick} disabled={disabled} className={cn(cls, "disabled:pointer-events-none disabled:opacity-60")}>
      {inner}
    </button>
  );
}
