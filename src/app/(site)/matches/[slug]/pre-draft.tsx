import { Container } from "@/components/site/page";
import { PageTitle } from "@/components/site/page-title";
import { Pic } from "@/components/site/pfp";
import { getFormat } from "@/db/edition";
import { matchLabel } from "@/lib/matches";
import { getDict, getLang } from "@/lib/i18n/server";
import { localeOf } from "@/lib/i18n/locale";
import { fmtSofia } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/data";

type Side = Pick<Team, "name" | "image"> | undefined;

export async function PreDraft({ id, startsAt, teams }: { id: string; startsAt: string | null; teams: [Side, Side] }) {
  const [t, lang] = await Promise.all([getDict(), getLang()]);
  const d = (n: number) => ({ "--d": `${n}s` }) as React.CSSProperties;
  return (
    <Container plain>
      <PageTitle mark="clock">{matchLabel(getFormat(), t, id)}</PageTitle>
      <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        {teams.map((team, i) => (
          <div key={i} className={cn("flex min-w-0 items-center gap-2 sm:gap-4", i === 1 ? "in-right order-3 flex-row-reverse text-right" : "in-left")} style={d(0.15)}>
            {team && <Pic src={team.image} className="size-10 shrink-0 rounded-full object-cover sm:size-16" />}
            <span className="line-clamp-2 min-w-0 break-words text-sm font-display font-black leading-tight sm:text-2xl">{team?.name ?? t.common.tbd}</span>
          </div>
        ))}
        <span className="in-pop heading-slam order-2 text-lg text-ash sm:text-3xl" style={d(0.3)}>{t.common.vs}</span>
      </div>
      <p className="in-up num mt-6 text-center text-sm text-paper/75 sm:text-base" style={d(0.4)}>
        {startsAt ? fmtSofia(new Date(startsAt), localeOf(lang)) : t.common.tbd}
      </p>
      <p className="in-up mt-3 text-center text-sm font-bold text-ash" style={d(0.5)}>{t.draft.notOpen}</p>
    </Container>
  );
}
