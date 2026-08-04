import Link from "next/link";
import { Code, Tv, CirclePlay, MessageCircle, Sheet } from "lucide-react";

const SOCIALS = [
  { label: "Discord", icon: MessageCircle },
  { label: "Twitch", icon: Tv },
  { label: "YouTube", icon: CirclePlay },
  { label: "Spreadsheet", icon: Sheet },
  { label: "GitHub", icon: Code },
];

export function SiteFooter() {
  return (
    <footer className="mt-24">
      <div className="bg-balkan text-ink">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-1">
            {SOCIALS.map((s) => (
              <a key={s.label} href="#" aria-label={s.label} className="p-2.5 transition hover:bg-ink/10">
                <s.icon className="size-5" />
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm font-black">
            <Link href="/staff/sponsors" className="hover:underline">Sponsors</Link>
            <span className="flex overflow-hidden border border-ink/40">
              <span className="px-2 py-0.5 opacity-60">BG</span>
              <span className="bg-ink px-2 py-0.5 text-paper">EN</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
