import { Tv, MessageCircle } from "lucide-react";
import { LangSwitch } from "./lang";
import { TriTick } from "./graphics";
import { DISCORD_URL, TWITCH_URL } from "@/lib/links";
import { getFormat } from "@/db/edition";

export function SiteFooter() {
  const SOCIALS = [
    { label: "Discord", icon: MessageCircle, href: DISCORD_URL },
    { label: "Twitch", icon: Tv, href: TWITCH_URL },
  ];
  return (
    <footer className="mt-24 border-t border-dashed border-line">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-center gap-x-5 gap-y-3 px-4 py-5 sm:px-6 lg:px-10 2xl:px-14">
        <div className="flex items-center gap-3">
          <TriTick className="h-3 w-[22px] opacity-70" />
          <span className="font-display text-sm font-black lowercase text-ash">{getFormat().name}</span>
        </div>
        <span className="size-1 rotate-45 bg-line" aria-hidden />
        <div className="flex items-center gap-1">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer" className="p-2 text-ash transition-colors hover:text-paper">
              <s.icon className="size-4" />
            </a>
          ))}
        </div>
        <span className="size-1 rotate-45 bg-line" aria-hidden />
        <LangSwitch />
      </div>
    </footer>
  );
}
