import Link from "next/link";
import { Tv, MessageCircle, Sheet } from "lucide-react";
import { LangSwitch } from "./lang";
import { TriTick } from "./graphics";
import { getDict } from "@/lib/i18n/server";
import { DISCORD_URL, TWITCH_URL } from "@/lib/links";
import { getSettings } from "@/db/settings";

export async function SiteFooter({ sponsors }: { sponsors: boolean }) {
  const [t, settings] = await Promise.all([getDict(), getSettings()]);
  const SOCIALS = [
    { label: "Discord", icon: MessageCircle, href: DISCORD_URL },
    { label: "Twitch", icon: Tv, href: TWITCH_URL },
    { label: "Spreadsheet", icon: Sheet, href: settings.links.sheets },
  ].filter((s) => s.href);
  return (
    <footer className="mt-24 border-t border-dashed border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <TriTick className="h-3 w-[22px] opacity-70" />
          <span className="font-display text-sm font-black lowercase text-ash">bgcc7</span>
        </div>
        <div className="flex items-center gap-1">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-ash transition-colors hover:text-paper"
            >
              <s.icon className="size-4" />
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs font-black uppercase tracking-wide text-ash">
          {sponsors && (
            <Link href="/staff/sponsors" className="transition-colors hover:text-paper">
              {t.footer.sponsors}
            </Link>
          )}
          <LangSwitch />
        </div>
      </div>
    </footer>
  );
}
