import Link from "next/link";
import { Code, Tv, CirclePlay, MessageCircle, Sheet } from "lucide-react";
import { LangSwitch } from "./lang";
import { getDict } from "@/lib/i18n/server";
import { DISCORD_URL, TWITCH_URL } from "@/lib/links";

const SOCIALS = [
  { label: "Discord", icon: MessageCircle, href: DISCORD_URL },
  { label: "Twitch", icon: Tv, href: TWITCH_URL },
  { label: "YouTube", icon: CirclePlay, href: "#" },
  { label: "Spreadsheet", icon: Sheet, href: "#" },
  { label: "GitHub", icon: Code, href: "#" },
];

export async function SiteFooter() {
  const t = await getDict();
  return (
    <footer className="mt-24">
      <div className="bg-balkan text-ink">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-1">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target={s.href === "#" ? undefined : "_blank"}
                rel={s.href === "#" ? undefined : "noreferrer"}
                className="p-2.5 transition hover:bg-ink/10"
              >
                <s.icon className="size-5" />
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm font-black">
            <Link href="/staff/sponsors" className="hover:underline">{t.footer.sponsors}</Link>
            <LangSwitch />
          </div>
        </div>
      </div>
    </footer>
  );
}
