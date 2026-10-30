"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, Pause, Swords } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkle, Wordmark } from "./graphics";
import { useDict } from "./lang";
import { EditionView } from "./edition-view-bgcc6";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { login, logout } from "@/app/(site)/pickems/actions";
import type { NavItem } from "@/lib/sections";

const bar = "pointer-events-none absolute left-0 h-1 w-[100px] origin-left opacity-0 transition-[transform,opacity,translate,scale,rotate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform";

const withSched = (nav: NavItem[]): NavItem[] => {
  const item: NavItem = { key: "scheduling", href: "/scheduling", base: "/scheduling", hidden: false };
  const at = nav.findIndex((n) => n.key === "schedule");
  return at < 0 ? [...nav, item] : [...nav.slice(0, at + 1), item, ...nav.slice(at + 1)];
};

const isActive = (path: string, base: string) => (base === "/" ? path === "/" : path === base || path.startsWith(`${base}/`));

function AdminCrest({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="adm-crest size-[1.35rem] overflow-visible" aria-hidden>
      <g className={cn("adm-sword-a", on ? "fill-white stroke-white" : "fill-rose stroke-rose")}>
        <path d="M5.1 17.1 16.6 5.6 20 4 18.4 7.4 6.9 18.9Z" stroke="none" />
        <path d="M4.2 14.2 9.8 19.8" strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <path d="M6 18 3.8 20.2" strokeWidth={2.2} strokeLinecap="round" />
        <circle cx="3.1" cy="20.9" r="1.4" stroke="none" />
      </g>
      <g className="adm-sword-b fill-paper stroke-paper">
        <path d="M18.9 17.1 7.4 5.6 4 4 5.6 7.4 17.1 18.9Z" stroke="none" />
        <path d="M19.8 14.2 14.2 19.8" strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <path d="M18 18 20.2 20.2" strokeWidth={2.2} strokeLinecap="round" />
        <circle cx="20.9" cy="20.9" r="1.4" stroke="none" />
      </g>
      <path d="M12 0.2 12.8 2.4 15 3.2 12.8 4 12 6.2 11.2 4 9 3.2 11.2 2.4Z" className="adm-spark fill-gold" />
    </svg>
  );
}

type Props = { user: { name: string; image: string | null; admin: boolean } | null; nav: NavItem[]; register: boolean; live: string[]; captain: boolean; match: string | null; sched: { dot: boolean; discord: boolean } | null };

type Clock = { end: number | null; pause: boolean; offset: number };

function useMatch(captain: boolean, initial: string | null) {
  const [slug, setSlug] = useState(initial);
  const [clock, setClock] = useState<Clock>({ end: null, pause: false, offset: 0 });
  useEffect(() => {
    if (!captain) return;
    const es = new EventSource("/api/draft/mine");
    es.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data) as { slug: string | null; end: number | null; pause: boolean; now: number } | null;
        setSlug(m?.slug ?? null);
        setClock({ end: m?.end ?? null, pause: !!m?.pause, offset: m ? m.now - Date.now() : 0 });
      } catch {}
    };
    return () => es.close();
  }, [captain]);
  return { slug, clock };
}

function Countdown({ clock }: { clock: Clock }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  if (clock.end == null) return null;
  const left = Math.max(0, clock.end - (now + clock.offset));
  const s = Math.ceil(left / 1000);
  const low = !clock.pause && s <= 10;
  return (
    <span className={cn("num ml-0.5 tabular-nums", clock.pause ? "text-white/70" : low ? "text-white" : "text-white/85")}>
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}

function MatchLink({ slug, path, big, onClick, clock }: { slug: string; path: string; big?: boolean; onClick?: () => void; clock: Clock }) {
  const t = useDict();
  const href = `/matches/${slug}`;
  const on = path === href;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 480, damping: 22 }}
      className={cn("inline-flex", big && "flex")}
    >
      <Link
        href={href}
        onClick={onClick}
        aria-current={on ? "page" : undefined}
        className={cn(
          "group relative inline-flex -skew-x-12 items-center overflow-hidden font-display font-bold text-white",
          big ? "match-cta heading-slam min-h-12 w-full px-6 text-2xl" : "lift-sm h-9 border border-rose px-3.5 text-[0.8rem] [--lift:var(--rose-deep)]",
          on ? "bg-rose-deep" : "bg-rose",
        )}
      >
        {!on && (
          <svg className="pointer-events-none absolute inset-px size-[calc(100%-2px)] overflow-visible" aria-hidden>
            <rect width="100%" height="100%" fill="none" stroke="white" strokeWidth={2} pathLength={100} strokeDasharray="16 84" className="match-run" />
          </svg>
        )}
        <span className={cn("relative inline-flex skew-x-12 items-center", big ? "gap-2" : "gap-1.5")}>
          <Swords className={big ? "size-5" : "size-3.5"} strokeWidth={2.6} />
          {t.nav.match}
          {!on &&
            (clock.pause ? (
              <span className="ml-0.5 inline-flex items-center gap-1 text-white/85">
                <Pause className="size-3 fill-current" /> {t.draft.paused}
              </span>
            ) : (
              clock.end != null && <Countdown clock={clock} />
            ))}
        </span>
      </Link>
    </motion.span>
  );
}

function LivePill({ big }: { big?: boolean }) {
  const t = useDict();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 bg-rose px-1.5 py-0.5 font-display font-bold leading-none text-white",
        big ? "ml-2 text-xs" : "pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[0.55rem]",
      )}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
      {t.home.live}
    </span>
  );
}

function Dot({ className }: { className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full bg-rose shadow-[0_0_0_2px_var(--ink)]", className)} aria-hidden />;
}

export function SiteNav({ user, nav: base, register, live, captain, match: initialMatch, sched }: Props) {
  const nav = sched ? withSched(base) : base;
  const desk: (Omit<NavItem, "key"> & { key: NavItem["key"] | "admin" })[] = user?.admin ? [...nav, { key: "admin", href: "/admin", base: "/admin", hidden: false }] : nav;
  const meDot = !!sched?.discord;
  const schedDot = !!sched?.dot;
  const dots = [...(sched?.dot ? ["scheduling"] : []), ...(meDot ? ["me"] : [])];
  const { slug: match, clock } = useMatch(captain, initialMatch);
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
  // a nav click only highlights early until the route changes; otherwise returning to `from` (e.g. via the logo) revives it
  if (clicked && clicked.from !== path) setClicked(null);
  const target = clicked && clicked.from === path ? clicked.base : null;
  const on = (base: string) => (target ? target === base : isActive(path, base));
  const activeBase = desk.find((n) => on(n.base))?.base ?? "";

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
      // the me / scheduling dot sits where the sparkle would
      if (glintRef.current && ((meDot && activeBase === "/me") || (schedDot && activeBase === "/scheduling"))) glintRef.current.style.opacity = "0";
      placed.current = true;
    };
    place(true);
    const again = () => place(true);
    // links resize when a late font (e.g. cyrillic) swaps in
    const ro = new ResizeObserver(again);
    navRef.current?.querySelectorAll("a").forEach((a) => ro.observe(a));
    return () => ro.disconnect();
  }, [activeBase, meDot, schedDot]);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-field/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 pr-4 sm:gap-6 lg:h-20 lg:pr-6">
        <Link href="/" className="group flex h-full items-center gap-1 pl-4 lg:pl-6" aria-label={t.nav.homeLabel}>
          <Wordmark size="md" className="text-paper" />
        </Link>
        <EditionView className="ml-1 sm:ml-0" />
        <ThemeToggle />

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
          {desk.map((n, i) => {
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
                    "group relative flex items-center whitespace-nowrap px-2.5 text-[0.78rem] font-display font-bold transition-colors 2xl:px-3.5",
                    active ? "text-paper" : "text-paper/70 hover:text-paper",
                  )}
                >
                  {!active && <span className="absolute inset-x-0.5 inset-y-4 -skew-x-12 scale-90 bg-white/0 transition duration-200 group-hover:scale-100 group-hover:bg-white/40" aria-hidden />}
                  <span className={cn("relative transition-transform duration-200 group-hover:-translate-y-px", n.hidden && "opacity-40")}>{t.nav[n.key]}</span>
                  {live.includes(n.key) && <LivePill />}
                  {dots.includes(n.key) && <Dot className="absolute right-1 top-5" />}
                </Link>
              </Fragment>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-4">
          {register && (
          <Link
            href="/register"
            className="lift-sm sheen hidden h-9 -skew-x-12 items-center bg-paper px-4 text-[0.8rem] font-display font-bold text-ink [--lift:var(--rose)] hover:bg-rose-deep sm:inline-flex"
          >
            <span className="inline-block skew-x-12">{t.nav.register}</span>
          </Link>
          )}
          <AnimatePresence>{match && <MatchLink key={match} slug={match} path={path} clock={clock} />}</AnimatePresence>
          {user ? (
            <div className="hidden h-9 -skew-x-12 items-center border border-line md:flex">
              <Link
                href="/me"
                title={t.nav.me}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) setClicked({ base: "/me", from: path });
                }}
                className="flex h-full items-center gap-2.5 pr-3 transition-colors hover:text-rose-hi">
                {user.image && (
                  <span className="h-full w-10 shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={user.image} alt="" className="size-full skew-x-12 scale-x-125 object-cover" />
                  </span>
                )}
                <span className={cn("max-w-32 skew-x-12 truncate text-[0.8rem] font-display font-black leading-none", !user.image && "pl-3")}>{user.name}</span>
                {meDot && <Dot className="-ml-1 skew-x-12" />}
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
              className="lift-sm hidden h-9 -skew-x-12 items-center whitespace-nowrap border border-line px-3.5 text-[0.8rem] font-display font-black text-paper [--lift:var(--rose)] hover:border-rose disabled:opacity-60 md:inline-flex"
            >
              <span className="inline-block skew-x-12">{t.nav.login}</span>
            </button>
          )}
          {user?.admin && (
            <Link
              href="/admin"
              aria-label={t.nav.admin}
              title={t.nav.admin}
              aria-current={isActive(path, "/admin") ? "page" : undefined}
              className={cn(
                "group relative -mr-2 flex size-10 items-center justify-center xl:hidden",
                isActive(path, "/admin") && "adm-on",
              )}
            >
              <AdminCrest on={false} />
            </Link>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="relative p-2 text-paper xl:hidden" aria-label={t.nav.openMenu}>
              <Menu className="size-6" />
              {(live.length > 0 || dots.length > 0 || meDot) && <span className="absolute right-1.5 top-1.5 size-2 animate-pulse rounded-full bg-rose" aria-hidden />}
            </SheetTrigger>
            <SheetContent side="right" className="flex h-dvh w-full max-w-sm flex-col border-line bg-ink p-0">
              <SheetTitle className="sr-only">{t.nav.menu}</SheetTitle>
              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-14" aria-label={t.nav.main}>
                {match && (
                  <div className="border-b border-line px-4 py-3">
                    <MatchLink slug={match} path={path} big clock={clock} onClick={() => setOpen(false)} />
                  </div>
                )}
                {[
                  ...nav,
                  ...(register ? [{ key: "register", href: "/register", base: "/register", hidden: false } as const] : []),
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
                    {dots.includes(n.key) && <Dot className="ml-3" />}
                  </Link>
                ))}
              </nav>
              <div className="shrink-0 border-t border-line bg-coal p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {user ? (
                  <div className="flex items-center gap-3">
                    <Link href="/me" onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-3 hover:text-rose-hi">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {user.image && <img src={user.image} alt="" className="size-9 object-cover" />}
                      <span className="min-w-0 flex-1 truncate text-sm font-display font-black">{user.name}</span>
                      {meDot && <Dot />}
                    </Link>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => start(() => logout())}
                      className="flex min-h-11 items-center gap-2 border border-line px-3 text-[0.8rem] font-display font-bold text-ash transition hover:text-paper disabled:opacity-60"
                    >
                      <LogOut className="size-4" /> {t.nav.logout}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(() => login(path))}
                    className="flex min-h-11 w-full items-center justify-center border border-line text-sm font-display font-bold text-paper transition hover:border-rose disabled:opacity-60"
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
