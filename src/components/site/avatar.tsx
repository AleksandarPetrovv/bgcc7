import { cn } from "@/lib/utils";

export function Avatar({ src, alt = "", className }: { src?: string | null; alt?: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("size-10 shrink-0 rounded-full object-cover ring-2 ring-rose ring-offset-2 ring-offset-coal", className)} />
  ) : (
    <span className={cn("size-10 shrink-0 rounded-full bg-slate ring-2 ring-rose ring-offset-2 ring-offset-coal", className)} aria-hidden />
  );
}
