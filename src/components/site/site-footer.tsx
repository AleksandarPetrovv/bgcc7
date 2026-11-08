import { DiscordLogo } from "./discord-logo";
import { TwitchLogo } from "./twitch-logo";
import { LangSwitch } from "./lang";
import { EditionView } from "./edition-view-bgcc6";
import { DISCORD_URL, TWITCH_URL } from "@/lib/links";
import { FORMATS, type Edition } from "@/lib/format";

export function SiteFooter({ edition }: { edition: Edition }) {
  const SOCIALS = [
    { label: "Discord", icon: DiscordLogo, href: DISCORD_URL },
    { label: "Twitch", icon: TwitchLogo, href: TWITCH_URL },
  ];
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-center gap-x-5 gap-y-3 px-4 py-5 sm:px-6 lg:px-10 2xl:px-14">
        <span className="font-display text-sm font-black lowercase text-ash">{FORMATS[edition].name}</span>
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
        <EditionView className="lg:h-8 lg:text-[0.75rem]" />
      </div>
    </footer>
  );
}
