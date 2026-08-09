import { Container, PageTitle, Tag } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { signups, fmtNum, flagUrl } from "@/lib/data";
import { osuUser } from "@/lib/links";
import { requireSection } from "@/lib/authz";

export default async function Players() {
  await requireSection("players");
  const t = await getDict();
  return (
    <Container>
      <PageTitle right={<span className="num text-2xl text-balkan">{t.common.players(signups.length)}</span>}>{t.teams.playersTitle}</PageTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {signups.map((p, i) => (
          <div key={p.userId} className="flex items-stretch border border-line bg-coal transition hover:border-balkan">
            <span className="num flex w-12 items-center justify-center bg-slate text-lg text-ash">{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatar} alt="" className="size-16 object-cover" />
            <div className="min-w-0 flex-1 px-3 py-2">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(p.country)} alt="" className="h-2.5" />
                <a href={osuUser(p.userId)} target="_blank" rel="noreferrer" className="truncate font-black hover:text-rose-hi">{p.username}</a>
                <Tag tone={p.status === "approved" ? "balkan" : p.status === "pending" ? "paper" : "rose"} className="ml-auto">
                  {t.status[p.status]}
                </Tag>
              </div>
              <div className="num mt-1 flex gap-4 text-sm text-paper/70">
                <span>#{fmtNum(p.rank)}</span>
                <span>BG #{p.countryRank}</span>
                <span>{fmtNum(Math.round(p.pp))}pp</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
