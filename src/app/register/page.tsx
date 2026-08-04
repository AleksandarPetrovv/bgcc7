import { Check, ImagePlus, UserPlus } from "lucide-react";
import { Container, PageTitle, SlantButton, Tag } from "@/components/site/page";
import { Input } from "@/components/ui/input";
import { getDict } from "@/lib/i18n/server";
import { signups, flagUrl, fmtNum } from "@/lib/data";
import { cn } from "@/lib/utils";

export default async function Register() {
  const t = await getDict();
  const [cap, ...rest] = signups.slice(3, 6);
  return (
    <Container>
      <PageTitle accent={t.register.accent} right={<Tag tone="balkan" className="text-xs">{t.register.openTag}</Tag>}>
        BGCC7
      </PageTitle>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <ol className="space-y-5">
          {t.register.steps.map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className={cn("num flex size-11 shrink-0 items-center justify-center text-2xl", i < 1 ? "bg-balkan text-ink" : "border border-line text-ash")}>
                {i < 1 ? <Check className="size-5" /> : i + 1}
              </span>
              <div>
                <div className="font-black uppercase">{s.t}</div>
                <p className="text-sm text-ash">{s.d}</p>
              </div>
            </li>
          ))}
          <li className="!mt-10 border border-rose/40 bg-rose/10 p-4 text-sm">
            <div className="mb-1 font-black uppercase text-rose-hi">{t.register.whoTitle}</div>
            {t.register.whoText}
          </li>
        </ol>

        <div className="border border-line bg-coal">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="text-sm font-black uppercase tracking-wide">{t.register.yourTeam}</span>
            <span className="text-xs font-black uppercase tracking-widest text-ash">{t.register.draft}</span>
          </div>
          <div className="space-y-6 p-5 sm:p-7">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-ash">{t.register.teamName}</span>
              <Input defaultValue="Rakia Rush" className="mt-1.5 h-11 rounded-none border-line bg-ink text-lg font-bold text-paper focus-visible:border-balkan" />
            </label>

            <div>
              <span className="text-xs font-black uppercase tracking-wide text-ash">{t.register.banner}</span>
              <div className="mt-1.5 flex h-28 items-center justify-center gap-3 border-2 border-dashed border-line bg-ink/60 px-4 text-center text-sm font-bold text-ash transition hover:border-balkan hover:text-paper">
                <ImagePlus className="size-5 shrink-0" /> {t.register.bannerDrop}
              </div>
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
              <SlantButton tone="balkan">{t.register.save}</SlantButton>
              <span className="text-sm text-ash">{t.register.waiting}</span>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
