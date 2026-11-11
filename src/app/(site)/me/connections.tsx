"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, LogOut, Pencil, Unlink } from "lucide-react";
import { SlantButton } from "@/components/site/slant";
import { DiscordLogo } from "@/components/site/discord-logo";
import { OsuLogo } from "@/components/site/osu-logo";
import { useDict } from "@/components/site/lang";
import { logout } from "@/actions/auth";
import { DISCORD_URL, osuUser } from "@/lib/links";
import { at } from "@/components/site/rich";
import { unlinkDiscord } from "./discord-actions";
import { DiscordPrompt } from "./discord-prompt";

function Row({ avatar, platform, name, n, children }: { avatar: string | null; platform: React.ReactNode; name: React.ReactNode; n: number; children: React.ReactNode }) {
  return (
    <div style={at(0.3, n, 0.15)} className="in-left in-slow relative flex grow flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden border-b border-line py-4 last:border-b-0">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="relative size-14 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-slate"><span className="heading-slam pr-1 text-3xl italic text-ash">?</span></span>
      )}
      <div className="relative min-w-32 flex-1">
        <div className="flex items-center gap-1.5 text-[0.65rem] font-display font-bold text-ash">{platform}</div>
        <div className="heading-slam mt-0.5 truncate text-xl leading-tight">{name}</div>
      </div>
      <div className="relative flex flex-wrap gap-2 px-1.5">{children}</div>
    </div>
  );
}

export function Connections({ osu, discord, canLink = true }: { osu: { id: number; name: string; avatar: string }; discord?: { name: string | null; avatar: string | null }; canLink?: boolean }) {
  const t = useDict();
  const d = t.sched.dc;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(0);
  const [pending, start] = useTransition();
  const btn = "min-w-28 justify-center whitespace-nowrap px-3 py-1.5 text-xs";
  return (
    <div className="flex h-full flex-col">
      <Row
        avatar={osu.avatar}
        n={0}
        platform={
          <>
            <OsuLogo className="size-3.5" /> osu!
          </>
        }
        name={osu.name}
      >
        <SlantButton tone="outline" href={osuUser(osu.id)} className={btn}>
          <ExternalLink className="size-3.5" /> {t.me.open}
        </SlantButton>
        <SlantButton tone="outline" disabled={pending} onClick={() => start(() => logout())} className={btn}>
          <LogOut className="size-3.5" /> {t.nav.logout}
        </SlantButton>
      </Row>
      {discord && (
        <Row
          avatar={discord.avatar}
          n={1}
          platform={
            <>
              <DiscordLogo className="size-3" /> Discord
            </>
          }
          name={discord.name ?? <span className="text-ash">{t.me.notLinked}</span>}
        >
          {!discord.name && (
            <SlantButton tone="outline" href={DISCORD_URL} className={btn}>
              <DiscordLogo className="size-3.5" /> {d.join}
            </SlantButton>
          )}
          <SlantButton tone={discord.name ? "outline" : "balkan"} disabled={!canLink} onClick={() => {
            setN((k) => k + 1);
            setOpen(true);
          }} className={btn}>
            {discord.name ? <><Pencil className="size-3.5" /> {d.change}</> : <><Link2 className="size-3.5" /> {d.link}</>}
          </SlantButton>
          {discord.name && (
            <SlantButton
              tone="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await unlinkDiscord().catch(() => null);
                  router.refresh();
                })
              }
              className={btn}
            >
              <Unlink className="size-3.5" /> {d.unlink}
            </SlantButton>
          )}
        </Row>
      )}
      <DiscordPrompt key={n} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
