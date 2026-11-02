import { cn } from "@/lib/utils";

/** the house slant: only this background layer is skewed, so the parent's text and icons stay untransformed and crisp.
 *  the parent needs `relative isolate`; colours, borders, shadows and `group-hover:` states go in `className` (or `style`). */
export function SlantBg({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden style={style} className={cn("pointer-events-none absolute inset-0 -z-10 -skew-x-12", className)} />;
}
