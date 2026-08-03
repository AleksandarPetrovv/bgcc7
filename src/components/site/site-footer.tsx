import Link from "next/link";
import { Code, Tv, CirclePlay, MessageCircle, Sheet } from "lucide-react";
import { Barcode, Shevitsa } from "./graphics";

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
      <div className="stitch-bg h-7 bg-ink" style={{ backgroundSize: "34px 28px" }} aria-hidden />
      <div className="bg-balkan text-white">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-1">
            {SOCIALS.map((s) => (
              <a key={s.label} href="#" aria-label={s.label} className="p-2 transition hover:bg-white/15">
                <s.icon className="size-5" />
              </a>
            ))}
          </div>
          <p className="text-sm font-semibold">
            BGCC7 is a community tournament and is not affiliated with ppy Pty Ltd.
          </p>
          <div className="ml-auto flex items-center gap-4 text-sm font-black">
            <Link href="/staff/sponsors" className="hover:underline">Sponsors</Link>
            <span className="flex overflow-hidden border border-white/40">
              <span className="px-2 py-0.5 opacity-60">BG</span>
              <span className="bg-white px-2 py-0.5 text-balkan-deep">EN</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-6 bg-ink px-4 py-5 text-ash lg:px-6">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em]">
          <Shevitsa size={18} /> Bulgarian osu! community · since BGCC1
        </div>
        <Barcode value="BGCC7-2026" className="hidden h-6 w-48 text-line sm:block" />
      </div>
    </footer>
  );
}
