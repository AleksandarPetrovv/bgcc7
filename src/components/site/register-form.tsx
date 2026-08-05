"use client";

import { useState } from "react";
import { Check, ImagePlus, UserPlus } from "lucide-react";
import { SlantButton, Tag } from "./page";
import { useDict } from "./lang";
import { Input } from "@/components/ui/input";
import { signups, flagUrl, fmtNum } from "@/lib/data";

export function RegisterForm() {
  const t = useDict();
  const [cap, ...rest] = signups.slice(3, 6);
  const [banner, setBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="border border-line bg-coal"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(true);
      }}
      onChange={() => setSaved(false)}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="text-sm font-black uppercase tracking-wide">{t.register.yourTeam}</span>
        <span className="text-xs font-black uppercase tracking-widest text-ash">{saved ? t.common.saved : t.register.draft}</span>
      </div>
      <div className="space-y-6 p-5 sm:p-7">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wide text-ash">{t.register.teamName}</span>
          <Input
            name="team"
            required
            maxLength={40}
            defaultValue="Rakia Rush"
            className="mt-1.5 h-11 rounded-none border-line bg-ink text-lg font-bold text-paper focus-visible:border-balkan"
          />
        </label>

        <div>
          <span className="text-xs font-black uppercase tracking-wide text-ash">{t.register.banner}</span>
          <label className="relative mt-1.5 flex h-28 cursor-pointer items-center justify-center gap-3 overflow-hidden border-2 border-dashed border-line bg-ink/60 px-4 text-center text-sm font-bold text-ash transition hover:border-balkan hover:text-paper">
            {banner && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={banner} alt="" className="absolute inset-0 size-full object-cover opacity-60" />
            )}
            <span className="relative flex items-center gap-3">
              <ImagePlus className="size-5 shrink-0" /> {banner ? t.register.changeBanner : t.register.bannerDrop}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (banner) URL.revokeObjectURL(banner);
                setBanner(URL.createObjectURL(file));
              }}
            />
          </label>
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-wide text-ash">{t.register.roster}</span>
          <div className="mt-2 space-y-2">
            {[{ p: cap, captain: true }, ...rest.map((p) => ({ p, captain: false }))].map(({ p, captain }) => (
              <div key={p.userId} className="flex items-center gap-3 border border-line bg-ink p-2 pr-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.avatar} alt="" className="size-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(p.country)} alt="" className="h-3" />
                <span className="truncate font-bold">{p.username}</span>
                <span className="num ml-auto text-ash">#{fmtNum(p.rank)}</span>
                <Tag tone={captain ? "rose" : "paper"}>{captain ? t.common.captain : t.common.invited}</Tag>
              </div>
            ))}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-line p-3 text-sm font-black uppercase text-ash transition hover:border-balkan hover:text-balkan"
            >
              <UserPlus className="size-4" /> {t.register.inviteSub}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm font-black uppercase text-balkan">
              <Check className="size-4" /> {t.common.saved}
            </span>
          ) : (
            <SlantButton tone="balkan" type="submit">
              {t.register.save}
            </SlantButton>
          )}
          <span className="text-sm text-ash">{t.register.waiting}</span>
        </div>
      </div>
    </form>
  );
}
