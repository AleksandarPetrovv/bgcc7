"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkle, SpeedMark, Wordmark } from "./graphics";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";
import { login, logout } from "@/app/pickems/actions";
import type { NavItem } from "@/lib/sections";

const spring = { type: "spring", stiffness: 500, damping: 38 } as const;

const isActive = (path: string, base: string) => (base === "/" ? path === "/" : path === base || path.startsWith(`${base}/`));

type Props = { user: { name: string; image: string | null; admin: boolean } | null; nav: NavItem[]; register: boolean; live: string[] };

function LivePill({ big }: { big?: boolean }) {
  const t = useDict();
  return (
    <span className={cn("ml-2 inline-flex shrink-0 items-center gap-1 bg-rose px-1.5 py-0.5 font-black uppercase leading-none tracking-wider text-white", big ? "text-xs" : "text-[0.55rem]")}>
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
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
      <span className="pointer-events-none absolute inset-x-0 -bottom-px h-px overflow-hidden" aria-hidden>
        <span className="anim-comet absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-transparent via-rose to-transparent" />
      </span>
      <div className="flex h-16 items-center gap-6 pr-4 lg:h-[72px] lg:pr-6">
        <Link href="/" className="group flex h-full items-center gap-1 pl-0" aria-label={t.nav.homeLabel}>
          <SpeedMark className="h-8 w-24 transition-transform duration-300 group-hover:translate-x-1 lg:h-10 lg:w-28" />
          <Wordmark size="md" className="text-paper" />
        </Link>

        <nav className="ml-auto hidden h-full items-stretch xl:flex" aria-label={t.nav.main}>
          {nav.map((n, i) => {
            const active = isActive(path, n.base);
            return (
              <Fragment key={n.href}>
                {i > 0 && <span className="my-auto size-1 shrink-0 rotate-45 bg-line" aria-hidden />}
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center px-2.5 text-[0.78rem] font-extrabold uppercase tracking-wide transition-colors 2xl:px-3.5",
                    active ? "text-paper" : "text-paper/60 hover:text-paper",
                    n.hidden && "opacity-40",
                  )}
                >
                  {!active && <span className="absolute inset-x-0.5 inset-y-4 -skew-x-12 scale-90 bg-white/0 transition duration-200 group-hover:scale-100 group-hover:bg-white/[0.05]" aria-hidden />}
                  <span className="relative transition-transform duration-200 group-hover:-translate-y-px">{t.nav[n.key]}</span>
                  {live.includes(n.key) && <LivePill />}
                  {active && (
                    <>
                      <motion.span layoutId="nav-under-shadow" className="absolute inset-x-2 bottom-0 h-1 translate-x-[3px] -skew-x-[30deg] bg-rose-deep" transition={spring} aria-hidden />
                      <motion.span layoutId="nav-under" className="absolute inset-x-2 bottom-1 h-1 -skew-x-[30deg] bg-rose" transition={spring} aria-hidden />
                      <motion.span layoutId="nav-glint" className="absolute right-0 top-3.5 size-2.5 text-rose-hi" transition={spring} aria-hidden>
                        <Sparkle className="inset-0 size-full" />
                      </motion.span>
                    </>
                  )}
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
              <span className="flex h-full skew-x-12 items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {user.image && <img src={user.image} alt="" className="size-7 object-cover" />}
                <span className="max-w-32 truncate text-[0.8rem] font-black">{user.name}</span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(() => logout())}
                aria-label={t.nav.logout}
                title={t.nav.logout}
                className="ml-1 flex h-full items-center border-l border-line px-2.5 text-ash transition-colors hover:bg-rose hover:text-white"
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {user.image && <img src={user.image} alt="" className="size-9 object-cover" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{user.name}</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => start(() => logout())}
                      className="flex min-h-11 items-center gap-2 border border-line px-3 text-[0.8rem] font-extrabold uppercase text-ash transition hover:text-paper disabled:opacity-60"
                    >
                      <LogOut className="size-4" /> {t.nav.logout}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(() => login(path))}
                    className="flex min-h-11 w-full items-center justify-center border border-line text-sm font-extrabold uppercase text-paper transition hover:border-rose disabled:opacity-60"
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
