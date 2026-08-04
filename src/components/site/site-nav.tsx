"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SpeedMark, StitchRule, Wordmark } from "./graphics";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/info", label: "Info" },
  { href: "/qualifiers", label: "Qualifiers" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule" },
  { href: "/mappool", label: "Mappool" },
  { href: "/pickems", label: "Pick'ems" },
  { href: "/stats", label: "Stats" },
  { href: "/streams", label: "Streams" },
  { href: "/staff", label: "Staff" },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function SiteNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
      <div className="flex h-16 items-center gap-6 pr-4 lg:h-[72px] lg:pr-6">
        <Link href="/" className="group flex h-full items-center gap-1 pl-0" aria-label="BGCC7 home">
          <SpeedMark className="h-8 w-24 transition-transform duration-300 group-hover:translate-x-1 lg:h-10 lg:w-28" />
          <Wordmark size="md" className="text-paper" />
        </Link>

        <nav className="ml-auto hidden h-full items-stretch xl:flex" aria-label="Main">
          {NAV.map((n) => {
            const active = isActive(path, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center px-2.5 text-[0.78rem] font-extrabold uppercase tracking-wide transition-colors 2xl:px-4",
                  active ? "text-paper" : "text-paper/60 hover:text-paper",
                )}
              >
                {n.label}
                {active && <StitchRule tone="balkan" className="absolute inset-x-2.5 bottom-3 2xl:inset-x-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-4">
          <Link
            href="/register"
            className="hidden -skew-x-12 bg-balkan px-4 py-2 text-[0.8rem] font-black uppercase tracking-wide text-ink transition hover:bg-paper sm:inline-block"
          >
            <span className="inline-block skew-x-12">Register</span>
          </Link>
          <Link href="/admin" className="hidden px-3 py-2 text-[0.8rem] font-extrabold uppercase text-ash hover:text-paper 2xl:inline-block">
            Admin
          </Link>
          <button type="button" className="hidden items-center gap-2 whitespace-nowrap border border-line px-3 py-2 text-[0.8rem] font-extrabold text-paper transition hover:border-rose md:flex">
            osu! LOGIN
          </button>
          <Sheet>
            <SheetTrigger className="p-2 text-paper xl:hidden" aria-label="Open menu">
              <Menu className="size-6" />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm border-line bg-ink p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex flex-col pt-14">
                {[...NAV, { href: "/register", label: "Register" }, { href: "/admin", label: "Admin" }].map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "heading-slam border-b border-line px-6 py-4 text-3xl",
                      isActive(path, n.href) ? "bg-rose text-white" : "text-paper hover:bg-slate",
                    )}
                  >
                    {n.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
