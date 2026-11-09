"use client";

import { Fragment, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, Pause, Swords } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkle, Wordmark } from "./graphics";
import { useDict } from "./lang";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { SlantPfp } from "./pfp";
import { SlantBg } from "./slant";
import { LiveTag } from "./live-tag";
import { MatchClock } from "./countdown";
import { useSSE } from "./use-sse";
import { TeamBell, type BellFeed } from "./team-bell";
import { login, logout } from "@/actions/auth";
import { isActive, type NavItem } from "@/lib/sections";

const bar = "pointer-events-none absolute left-0 h-1 w-[100px] origin-left opacity-0 transition-[transform,opacity,translate,scale,rotate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform";

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

type Props = { user: { name: string; image: string | null; admin: string | null } | null; nav: NavItem[]; register: boolean; live: string[]; captain: boolean; match: string | null; sched: { show: boolean; dot: boolean; discord: boolean; team: boolean } | null; bell: BellFeed | null };

type Clock = { end: number | null; pause: boolean; offset: number };

function useMatch(captain: boolean, initial: string | null) {
  const [slug, setSlug] = useState(initial);
  const [clock, setClock] = useState<Clock>({ end: null, pause: false, offset: 0 });
  useSSE(captain ? "/api/draft/mine" : null, (data) => {
    try {
      const m = JSON.parse(data) as { slug: string | null; end: number | null; pause: boolean; now: number } | null;
      setSlug(m?.slug ?? null);
      setClock({ end: m?.end ?? null, pause: !!m?.pause, offset: m ? m.now - Date.now() : 0 });
    } catch (err) {
      console.error("[draft/mine]", err);
    }
  });
  return { slug, clock };
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
          "group/match relative inline-flex items-center font-display font-bold text-white",
          big ? "heading-slam min-h-12 w-full px-6 text-2xl" : "h-9 px-2.5 text-[0.8rem] sm:px-3.5",
        )}
      >
        {/* only the background is slanted, so the text isn't skewed twice (that renders it blurry) */}
        <span className={cn("absolute inset-0 -skew-x-12", big ? "match-cta" : "border border-rose", on ? "bg-rose-deep" : "bg-rose group-hover/match:bg-rose-deep")} aria-hidden>
          {!on && (
            <svg className="pointer-events-none absolute inset-px size-[calc(100%-2px)] overflow-visible" aria-hidden>
              <rect width="100%" height="100%" fill="none" stroke="white" strokeWidth={2} pathLength={100} strokeDasharray="16 84" className="match-run" />
            </svg>
          )}
        </span>
        <span className={cn("relative inline-flex items-center", big ? "gap-2" : "gap-1.5")}>
          <Swords className={big ? "size-5" : "size-3.5"} strokeWidth={2.6} />
          <span className={cn(!big && "max-sm:sr-only")}>{t.nav.match}</span>
          {!on &&
            (clock.pause ? (
              <span className="ml-0.5 inline-flex items-center gap-1 text-white/85">
                <Pause className="size-3 fill-current" /> {t.draft.paused}
              </span>
            ) : (
              clock.end != null && <MatchClock end={clock.end} offset={clock.offset} pause={clock.pause} />
            ))}
        </span>
      </Link>
    </motion.span>
  );
}

const dotAt = (base: string, me: boolean, sched: boolean) => (me && base === "/me") || (sched && base === "/scheduling");

function Dot({ className }: { className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full bg-rose shadow-[0_0_0_2px_var(--ink)]", className)} aria-hidden />;
}

export function SiteNav({ user, nav, register, live, captain, match: initialMatch, sched, bell }: Props) {
  const desk: (Omit<NavItem, "key"> & { key: NavItem["key"] | "admin" })[] = user?.admin ? [...nav, { key: "admin", href: user.admin, base: "/admin", hidden: false }] : nav;
  const meDot = !!(sched?.discord || sched?.team);
  const schedDot = !!sched?.dot;
  const dots = [...(sched?.dot ? ["scheduling"] : []), ...(meDot ? ["me"] : [])];
  const { slug: match, clock } = useMatch(captain, initialMatch);
  const path = usePathname();
  const [pending, start] = useTransition();
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(path);
  const navRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const glintRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<boolean | null>(null);
  const [shift, setShift] = useState<number | null>(null);
  const [tight, setTight] = useState(false);
  const wideW = useRef(0);
  const [clicked, setClicked] = useState<{ base: string; from: string } | null>(null);
  // a nav click only highlights early until the route changes; otherwise returning to `from` (e.g. via the logo) revives it
  if (clicked && clicked.from !== path) setClicked(null);
  const target = clicked && clicked.from === path ? clicked.base : null;
  const on = (n: { base: string; alias?: string }) => (target ? target === n.base : isActive(path, n));
  const activeBase = desk.find((n) => on(n))?.base ?? "";

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
      if (glintRef.current && dotAt(activeBase, meDot, schedDot)) glintRef.current.style.opacity = "0";
      placed.current = true;
      navRef.current?.setAttribute("data-placed", "");
    };
    place(true);
    const again = () => place(true);
    // links resize when a late font (e.g. cyrillic) swaps in
    const ro = new ResizeObserver(again);
    navRef.current?.querySelectorAll("a").forEach((a) => ro.observe(a));
    return () => ro.disconnect();
  }, [activeBase, meDot, schedDot, fit]);

  useLayoutEffect(() => {
    const row = rowRef.current, nav = navRef.current, right = rightRef.current;
    if (!row || !nav || !right) return;
    const measure = () => {
      const rowGap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const toggle = nav.previousElementSibling as HTMLElement | null;
      const left = (toggle?.previousElementSibling?.getBoundingClientRect().right ?? 0) + rowGap + (toggle?.offsetWidth ?? 0);
      const kids = [...right.children].filter((k) => !(k as HTMLElement).dataset.compact && k.getBoundingClientRect().width > 0);
      const gap = parseFloat(getComputedStyle(right).columnGap) || 0;
      const rightW = kids.reduce((s, k) => s + k.getBoundingClientRect().width, 0) + gap * Math.max(0, kids.length - 1);
      const r = row.getBoundingClientRect();
      const end = r.right - (parseFloat(getComputedStyle(row).paddingRight) || 0) - rightW;
      const flowStart = left + rowGap;
      const check = (navW: number) => {
        const start = r.left + (r.width - navW) / 2;
        const centered = start - left >= rowGap + 8 && end - (start + navW) >= rowGap + 8;
        return { centered, ok: window.innerWidth >= 1024 && (centered || end - (flowStart + navW) >= rowGap + 8) };
      };
      if (!tight) wideW.current = nav.offsetWidth;
      const wide = check(wideW.current || nav.offsetWidth);
      if (!tight && !wide.ok) return setTight(true);
      if (tight && wide.ok) return setTight(false);
      const c = tight ? check(nav.offsetWidth) : wide;
      setFit(c.ok);
      setShift(c.centered ? null : Math.round(flowStart - r.left));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    ro.observe(right);
    nav.querySelectorAll("a").forEach((a) => ro.observe(a));
    return () => ro.disconnect();
  }, [desk.length, user, register, match, tight]);
  const compact = fit === null ? "min-[1700px]:hidden" : fit ? "hidden" : "";
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-field/90 backdrop-blur-md">
      <div ref={rowRef} className="relative flex h-16 items-center gap-1.5 pr-3 sm:gap-6 lg:h-20 lg:pr-6">
        <Link href="/" className="group flex h-full items-center gap-1 pl-3 sm:pl-4 lg:pl-6" aria-label={t.nav.homeLabel}>
          <Wordmark size="md" className="text-paper max-sm:text-[1.6rem]" />
        </Link>
        {/* centred by margins, not -translate-x-1/2: a half-pixel translate draws the text blurry (safari) */}
        <ThemeToggle className={fit === null ? "max-[1699px]:absolute max-[1699px]:inset-x-0 max-[1699px]:mx-auto max-[1699px]:w-fit" : fit ? undefined : "absolute inset-x-0 mx-auto w-fit"} />

        <nav
          ref={navRef}
          className={cn(
            "h-full items-stretch",
            fit === null ? "absolute inset-x-0 top-0 mx-auto hidden w-max min-[1700px]:flex" : fit ? (shift === null ? "absolute inset-x-0 top-0 mx-auto flex w-max" : "absolute top-0 flex") : "pointer-events-none invisible absolute right-0 top-0 flex w-max", // anchored right so it overflows left, which never widens the page on phones
          )}
          style={fit && shift !== null ? { left: shift } : undefined}
          aria-label={t.nav.main}
          aria-hidden={fit === false || undefined}
        >
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
            const active = on(n);
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
                    "group relative flex items-center whitespace-nowrap font-display font-bold transition-colors",
                    tight ? "px-1.5 text-[0.72rem]" : "px-2 text-[0.78rem]",
                    active ? "text-paper" : "text-paper/70 hover:text-rose-hi",
                  )}
                >
                  {/* server-drawn copy of the sliding bar, so a reload never shows the nav without it; hidden once js places the real one */}
                  {active && (
                    <span className="pointer-events-none [nav[data-placed]_&]:hidden" aria-hidden>
                      <span className="absolute inset-x-2 bottom-0 block h-1 translate-x-[3px] -skew-x-[30deg] bg-rose-deep" />
                      <span className="absolute inset-x-2 bottom-1 block h-1 -skew-x-[30deg] bg-rose" />
                      {!dotAt(n.base, meDot, schedDot) && <Sparkle className="absolute -right-0.5 top-4 size-3.5 text-rose-hi" />}
                    </span>
                  )}
                  <span className={cn("relative transition-transform duration-200 group-hover:-translate-y-px", n.hidden && "opacity-40")}>{t.nav[n.key]}</span>
                  {live.includes(n.key) && <LiveTag className="pointer-events-none absolute inset-x-0 bottom-2.5 mx-auto w-fit shrink-0 text-[0.55rem]" />}
                  {dots.includes(n.key) && <Dot className="absolute right-1 top-5" />}
                </Link>
              </Fragment>
            );
          })}
        </nav>

        <div ref={rightRef} className="ml-auto flex items-center gap-1 sm:gap-2">
          {register && (
          <Link
            href="/register"
            className="group/reg relative isolate hidden h-9 items-center px-4 text-[0.8rem] font-display font-bold text-ink hover:text-white sm:inline-flex"
          >
            <SlantBg className="bg-paper group-hover/reg:bg-rose" />
            <span className="relative">{t.nav.register}</span>
          </Link>
          )}
          <AnimatePresence>{match && <MatchLink key={match} slug={match} path={path} clock={clock} />}</AnimatePresence>
          <TeamBell feed={bell} />
          {user ? (
            <div className="relative isolate hidden h-9 items-center md:flex">
              <SlantBg className="border border-line" />
              <Link
                href="/me"
                title={t.nav.me}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) setClicked({ base: "/me", from: path });
                }}
                className="relative flex h-full items-center gap-2.5 pr-3 hover:text-rose-hi">
                {user.image && <SlantPfp src={user.image} className="h-full w-10" layer="-left-[12.5%] top-0 h-full w-[125%]" />}
                <span className={cn("max-w-32 truncate text-[0.8rem] font-display font-black leading-none", !user.image && "pl-3")}>{user.name}</span>
                {meDot && <Dot className="-ml-1" />}
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(() => logout())}
                aria-label={t.nav.logout}
                title={t.nav.logout}
                className="group/out relative isolate flex h-full items-center px-2.5 text-ash hover:text-white"
              >
                <SlantBg className="border-l border-line group-hover/out:bg-rose" />
                <LogOut className="relative size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(() => login(path))}
              className="group/in relative isolate hidden h-9 items-center whitespace-nowrap px-3.5 text-[0.8rem] font-display font-black text-paper hover:text-white disabled:opacity-60 md:inline-flex"
            >
              <SlantBg className="border border-line group-hover/in:border-rose group-hover/in:bg-rose" />
              <span className="relative">{t.nav.login}</span>
            </button>
          )}
          {user?.admin && (
            <Link
              href={user.admin}
              data-compact="1"
              aria-label={t.nav.admin}
              title={t.nav.admin}
              aria-current={isActive(path, { base: "/admin" }) ? "page" : undefined}
              className={cn(
                "group relative -mr-2 flex size-10 items-center justify-center",
                compact,
                isActive(path, { base: "/admin" }) && "adm-on",
              )}
            >
              <AdminCrest on={false} />
            </Link>
          )}
          <Sheet open={open} onOpenChange={(o) => { if (o) setMenuPath(path); setOpen(o); }}>
            <SheetTrigger data-compact="1" className={cn("relative p-2 text-paper", compact)} aria-label={t.nav.openMenu}>
              <Menu className="size-6" />
              {(live.length > 0 || dots.length > 0 || meDot) && <span className="absolute right-1.5 top-1.5 size-2 animate-pulse rounded-full bg-rose" aria-hidden />}
            </SheetTrigger>
            <SheetContent side="right" className="flex h-dvh w-full max-w-sm flex-col overflow-hidden overscroll-none border-line bg-ink p-0 max-lg:data-ending-style:duration-300 max-lg:data-ending-style:ease-[cubic-bezier(0.4,0,0.2,1)]">
              <SheetTitle className="sr-only">{t.nav.menu}</SheetTitle>
              <nav className="min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-contain pt-14" aria-label={t.nav.main}>
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
                    aria-current={isActive(menuPath, n) ? "page" : undefined}
                    className={cn(
                      "heading-slam flex min-h-12 items-center border-b border-line px-6 py-2.5 text-2xl",
                      isActive(menuPath, n) ? "bg-rose text-white" : "text-paper hover:bg-slate",
                      n.hidden && "opacity-40",
                    )}
                  >
                    {t.nav[n.key]}
                    {live.includes(n.key) && <LiveTag className="ml-2 shrink-0 text-xs" />}
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
