import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarPath } from "@/lib/avatar";
import { meP } from "./me";
import { SlantBg } from "./slant";

type PicProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string; lazy?: boolean };

export function Pic({ lazy, alt = "", ...rest }: PicProps) {
  if (!rest.src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} {...(lazy && { loading: "lazy" as const, decoding: "async" as const })} {...rest} />;
}

/** round player avatar, no border. `me` marks it for the viewer highlight, `crown` puts the crown on top. */
export function Pfp({
  src,
  me,
  crown,
  className,
  ...rest
}: Omit<PicProps, "src"> & { src?: string | null; me?: number | string | null; crown?: boolean }) {
  const cls = cn("size-10 shrink-0 rounded-full", me != null && "me-av", className);
  const img = src ? (
    <Pic src={src} className={cn(cls, "object-cover")} {...rest} {...(me != null && meP(me))} />
  ) : (
    <span className={cn(cls, "bg-slate")} style={rest.style} {...(me != null && meP(me))} aria-hidden />
  );
  if (!crown) return img;
  return (
    <span className="relative shrink-0">
      {img}
      <Crown className="absolute -top-3 left-1/2 size-4 -translate-x-1/2 fill-gold text-gold-hi" aria-hidden />
    </span>
  );
}

/** round avatar by osu id; null id draws the empty placeholder. `className` sets size. */
export function TeamPfp({ id, className }: { id: number | null; className?: string }) {
  const cls = cn("shrink-0 rounded-full", className);
  return id == null ? <span className={cn(cls, "bg-slate")} aria-hidden /> : <Pic src={avatarPath(id)} className={cn(cls, "object-cover")} />;
}

// 10.63cqh = tan(12deg) / 2 of the frame height: how far a -skew-x-12 edge leans at the top and bottom
const SLANT_CLIP = "[clip-path:polygon(10.63cqh_0,calc(100%_+_10.63cqh)_0,calc(100%_-_10.63cqh)_100%,-10.63cqh_100%)]";

/** slanted avatar frame: the picture is cut with a clip-path and only the background and edge layers are skewed.
 *  `className` sizes the frame, `bg` fills/borders behind, `edge` draws a border/shadow above, `layer` places the picture. */
export function SlantPfp({
  src,
  className,
  bg,
  edge,
  edgeStyle,
  layer = "-left-[12.5%] -top-[12.5%] size-[125%]",
}: {
  src?: string | null;
  className?: string;
  bg?: string;
  edge?: string;
  edgeStyle?: React.CSSProperties;
  layer?: string;
}) {
  return (
    <span className={cn("relative isolate inline-flex shrink-0 [container-type:size]", className)}>
      <SlantBg className={bg} />
      <span className={cn("absolute inset-0", SLANT_CLIP)}>{src && <Pic src={src} className={cn("absolute max-w-none object-cover", layer)} />}</span>
      {edge && <SlantBg className={cn("z-10", edge)} style={edgeStyle} />}
    </span>
  );
}
