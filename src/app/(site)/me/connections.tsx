"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, Pencil, Unlink } from "lucide-react";
import { SlantButton } from "@/components/site/page";
import { DiscordLogo } from "@/components/site/discord-logo";
import { OsuLogo } from "@/components/site/osu-logo";
import { useDict } from "@/components/site/lang";
import { logout } from "@/app/(site)/pickems/actions";
import { osuUser } from "@/lib/links";
import { cn } from "@/lib/utils";
import { at } from "@/components/site/rich";
import { unlinkDiscord } from "./discord-actions";
import { DiscordPrompt } from "./discord-prompt";

function Row({ avatar, edge, platform, name, n, children }: { avatar: string | null; edge: string; platform: React.ReactNode; name: React.ReactNode; n: number; children: React.ReactNode }) {
  return (
    <div style={at(0.3, n, 0.15)} className="in-left in-slow relative flex grow flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden border border-line bg-ink p-4">
      {avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-15 blur-md" aria-hidden />
      )}
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className={cn("relative size-14 shrink-0 border-b-[3px] object-cover", edge)} />
      ) : (
        <span className={cn("relative size-14 shrink-0 border-b-[3px] border-dashed bg-slate", edge)} />
      )}
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[0.65rem] font-display font-bold text-ash">{platform}</div>
        <div className="heading-slam mt-0.5 truncate text-xl leading-tight">{name}</div>
      </div>
      <div className="relative flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Connections({ osu, discord }: { osu: { id: number; name: string; avatar: string }; discord?: { name: string | null; avatar: string | null } }) {
  const t = useDict();
  const d = t.sched.dc;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(0);
  const [pending, start] = useTransition();
  const btn = "w-28 justify-center px-3 py-1.5 text-xs";
  return (
    <div className="flex h-full flex-col gap-3">
      <Row
        avatar={osu.avatar}
        edge="border-rose"
        n={0}
        platform={
          <>
            <OsuLogo className="size-3.5" /> osu!
          </>
        }
        name={osu.name}
      >
        <SlantButton tone="outline" href={osuUser(osu.id)} className={btn}>
          {t.me.open} <ExternalLink className="size-3.5" />
        </SlantButton>
        <SlantButton tone="outline" disabled={pending} onClick={() => start(() => logout())} className={btn}>
          {t.nav.logout} <LogOut className="size-3.5" />
        </SlantButton>
      </Row>
      {discord && (
        <Row
          avatar={discord.avatar}
          edge="border-azure"
          n={1}
          platform={
            <>
              <DiscordLogo className="size-3" /> Discord
            </>
          }
          name={discord.name ?? <span className="text-ash">{t.me.notLinked}</span>}
        >
          <SlantButton tone={discord.name ? "outline" : "balkan"} onClick={() => {
            setN((k) => k + 1);
            setOpen(true);
          }} className={btn}>
            {discord.name ? d.change : d.missing} <Pencil className="size-3.5" />
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
              {d.unlink} <Unlink className="size-3.5" />
            </SlantButton>
          )}
        </Row>
      )}
      <DiscordPrompt key={n} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
