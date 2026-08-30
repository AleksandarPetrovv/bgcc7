"use client";

import { Fragment, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkle, SpeedMark, Wordmark } from "./graphics";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";
import { login, logout } from "@/app/pickems/actions";
import type { NavItem } from "@/lib/sections";

const bar = "pointer-events-none absolute left-0 h-1 w-[100px] origin-left opacity-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform";

const isActive = (path: string, base: string) => (base === "/" ? path === "/" : path === base || path.startsWith(`${base}/`));

type Props = { user: { name: string; image: string | null; admin: boolean } | null; nav: NavItem[]; register: boolean; live: string[] };

function LivePill({ big }: { big?: boolean }) {
  const t = useDict();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 bg-rose px-1.5 py-0.5 font-black uppercase leading-none tracking-wide text-white",
        big ? "ml-2 text-xs" : "pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[0.55rem]",
      )}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
      {t.home.live}
    </span>
  );
}

export function SiteNav({ user, nav, register, live }: Props) {
  const path = usePathname();
  const [pending, start] = useTransition();
  const t = useDict();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const glintRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const [clicked, setClicked] = useState<{ base: string; from: string } | null>(null);
  const target = clicked && clicked.from === path ? clicked.base : null;
  const on = (base: string) => (target ? target === base : isActive(path, base));
  const activeBase = nav.find((n) => on(n.base))?.base ?? "";

  useLayoutEffect(() => {
    const place = (animate: boolean) => {
      const el = navRef.current?.querySelector<HTMLElement>("a[aria-current=page]");
      const parts = [barRef.current, shadowRef.current, glintRef.current];
      if (!el) {
        for (const p of parts) if (p) p.style.opacity = "0";
        placed.current = false;
        return;
      }
      const x = el.offsetLeft + 8;
      const w = (el.offsetWidth - 16) / 100;
      const set = (p: HTMLSpanElement | null, transform: string) => {
        if (!p) return;
        p.style.transition = animate && placed.current ? "" : "none";
        p.style.transform = transform;
        p.style.opacity = "1";
      };
      set(barRef.current, `translate3d(${x}px,0,0) scaleX(${w})`);
      set(shadowRef.current, `translate3d(${x + 3}px,0,0) scaleX(${w})`);
      set(glintRef.current, `translate3d(${el.offsetLeft + el.offsetWidth - 12}px,0,0)`);
      placed.current = true;
    };
    place(true);
    const again = () => place(true);
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(again);
    window.addEventListener("resize", again);
    return () => window.removeEventListener("resize", again);
  }, [activeBase]);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-6 pr-4 lg:h-20 lg:pr-6">
        <Link href="/" className="group flex h-full items-center gap-1 pl-0" aria-label={t.nav.homeLabel}>
          <SpeedMark className="h-8 w-24 transition-transform duration-300 group-hover:translate-x-1 lg:h-10 lg:w-28" />
          <Wordmark size="md" className="text-paper" />
        </Link>

        <nav ref={navRef} className="relative ml-auto hidden h-full items-stretch xl:flex" aria-label={t.nav.main}>
          <span ref={shadowRef} className={cn(bar, "bottom-0")} aria-hidden>
            <span className="block h-full -skew-x-[30deg] bg-rose-deep" />
          </span>
          <span ref={barRef} className={cn(bar, "bottom-1")} aria-hidden>
            <span className="block h-full -skew-x-[30deg] bg-rose" />
          </span>
          <span ref={glintRef} className={cn(bar, "top-4 size-3.5 w-3.5 text-rose-hi")} aria-hidden>
            <Sparkle className="inset-0 size-full" />
          </span>
          {nav.map((n, i) => {
            const active = on(n.base);
            return (
              <Fragment key={n.href}>
                {i > 0 && <span className="my-auto size-1 shrink-0 rotate-45 bg-line" aria-hidden />}
                <Link
                  href={n.href}
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) setClicked({ base: n.base, from: path });
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center whitespace-nowrap px-2.5 text-[0.78rem] font-black uppercase tracking-wide transition-colors 2xl:px-3.5",
                    active ? "text-paper" : "text-paper/60 hover:text-paper",
                  )}
                >
                  {!active && n.key !== "me" && <span className="absolute inset-x-0.5 inset-y-4 -skew-x-12 scale-90 bg-white/0 transition duration-200 group-hover:scale-100 group-hover:bg-white/[0.05]" aria-hidden />}
                  {n.key === "me" ? (
                    <span
                      className={cn(
                        "relative inline-flex -skew-x-12 items-center border px-2.5 py-1 transition-colors duration-200",
                        active ? "border-rose bg-rose/20 text-paper" : "border-rose/50 bg-rose/10 text-rose-hi group-hover:border-rose group-hover:text-paper",
                      )}
                    >
                      <span className="inline-flex skew-x-12 items-center gap-1.5">
                        <UserRound className="size-3.5" strokeWidth={3} />
                        {t.nav.me}
                      </span>
                    </span>
                  ) : (
                    <span className={cn("relative transition-transform duration-200 group-hover:-translate-y-px", n.hidden && "opacity-40")}>{t.nav[n.key]}</span>
                  )}
                  {live.includes(n.key) && <LivePill />}
                </Link>
              </Fragment>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-4">
          {register && (
          <Link
            href="/register"
            className="lift-sm sheen hidden h-9 -skew-x-12 items-center bg-paper px-4 text-[0.8rem] font-black uppercase tracking-wide text-ink [--lift:var(--color-rose)] hover:bg-white sm:inline-flex"
          >
            <span className="inline-block skew-x-12">{t.nav.register}</span>
          </Link>
          )}
          {user?.admin && (
            <Link
              href="/admin"
              aria-current={isActive(path, "/admin") ? "page" : undefined}
              className={cn(
                "lift-sm hidden h-9 -skew-x-12 items-center border px-3.5 text-[0.8rem] font-black uppercase tracking-wide [--lift:var(--color-rose)] xl:inline-flex",
                isActive(path, "/admin") ? "border-rose bg-rose text-white" : "border-line text-ash hover:border-rose hover:text-paper",
              )}
            >
              <span className="inline-block skew-x-12">{t.nav.admin}</span>
            </Link>
          )}
          {user ? (
            <div className="hidden h-9 -skew-x-12 items-center border border-line pl-1 md:flex">
              <Link href="/me" title={t.nav.me} className="flex h-full skew-x-12 items-center gap-2.5 pr-3 transition-colors hover:text-rose-hi">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {user.image && <img src={user.image} alt="" className="size-7 object-cover" />}
                <span className="max-w-32 truncate text-[0.8rem] font-black leading-none">{user.name}</span>
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(() => logout())}
                aria-label={t.nav.logout}
                title={t.nav.logout}
                className="flex h-full items-center border-l border-line px-2.5 text-ash transition-colors hover:bg-rose hover:text-white"
              >
                <LogOut className="size-4 skew-x-12" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(() => login(path))}
              className="lift-sm hidden h-9 -skew-x-12 items-center whitespace-nowrap border border-line px-3.5 text-[0.8rem] font-black text-paper [--lift:var(--color-rose)] hover:border-rose disabled:opacity-60 md:inline-flex"
            >
              <span className="inline-block skew-x-12">{t.nav.login}</span>
            </button>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="relative p-2 text-paper xl:hidden" aria-label={t.nav.openMenu}>
              <Menu className="size-6" />
              {live.length > 0 && <span className="absolute right-1.5 top-1.5 size-2 animate-pulse rounded-full bg-rose" aria-hidden />}
            </SheetTrigger>
            <SheetContent side="right" className="flex h-dvh w-full max-w-sm flex-col border-line bg-ink p-0">
              <SheetTitle className="sr-only">{t.nav.menu}</SheetTitle>
              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-14" aria-label={t.nav.main}>
                {[
                  ...nav,
                  ...(register ? [{ key: "register", href: "/register", base: "/register", hidden: false } as const] : []),
                  ...(user?.admin ? [{ key: "admin", href: "/admin", base: "/admin", hidden: false } as const] : []),
                ].map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(path, n.base) ? "page" : undefined}
                    className={cn(
                      "heading-slam flex min-h-12 items-center border-b border-line px-6 py-2.5 text-2xl",
                      isActive(path, n.base) ? "bg-rose text-white" : "text-paper hover:bg-slate",
                      n.hidden && "opacity-40",
                    )}
                  >
                    {t.nav[n.key]}
                    {live.includes(n.key) && <LivePill big />}
                  </Link>
                ))}
              </nav>
              <div className="shrink-0 border-t border-line bg-coal p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {user ? (
                  <div className="flex items-center gap-3">
                    <Link href="/me" onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-3 hover:text-rose-hi">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {user.image && <img src={user.image} alt="" className="size-9 object-cover" />}
                      <span className="min-w-0 flex-1 truncate text-sm font-black">{user.name}</span>
                    </Link>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => start(() => logout())}
                      className="flex min-h-11 items-center gap-2 border border-line px-3 text-[0.8rem] font-black uppercase text-ash transition hover:text-paper disabled:opacity-60"
                    >
                      <LogOut className="size-4" /> {t.nav.logout}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(() => login(path))}
                    className="flex min-h-11 w-full items-center justify-center border border-line text-sm font-black uppercase text-paper transition hover:border-rose disabled:opacity-60"
                  >
                    {t.nav.login}
                  </button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
