import { ExternalLink } from "lucide-react";
import { Container, PageTitle, SubHeading, Wide } from "@/components/site/page";
import { ScoreMatrix } from "@/components/site/score-matrix";
import { getDict, getLang } from "@/lib/i18n/server";
import { requireSection } from "@/lib/authz";
import { getQualResults } from "@/db/qualifiers";
import { getLobbies, mpIds } from "@/db/lobbies";
import { getSettings } from "@/db/settings";
import { fmtSofia } from "@/lib/time";

export default async function Scores() {
  await requireSection("qualScores");
  const [t, lang, qualifiers, settings, lobbies] = await Promise.all([getDict(), getLang(), getQualResults(), getSettings(), getLobbies()]);
  const played = lobbies.filter((l) => mpIds(l.mpLinks).length > 0);
  return (
    <Container>
      <PageTitle mark="squiggle" right={<span className="max-w-md text-sm text-ash">{t.qual.scoresHint}</span>}>
        {t.qual.scoresTitle}
      </PageTitle>
      {qualifiers.players.length ? (
        <Wide>
          <ScoreMatrix qualifiers={qualifiers} cut={settings.qualifyCount} />
        </Wide>
      ) : (
        <p className="py-10 text-center text-ash">{t.qual.noResults}</p>
      )}
      {played.length > 0 && (
        <section className="mt-12">
          <SubHeading>{t.qual.mpTitle}</SubHeading>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {played.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-line bg-coal px-3 py-2 text-sm">
                <span className="font-black">{l.name}</span>
                <span className="num text-ash">{fmtSofia(l.startsAt, lang === "bg" ? "bg-BG" : "en-GB")}</span>
                <span className="ml-auto flex gap-3">
                  {mpIds(l.mpLinks).map((id, i, all) => (
                    <a key={id} href={`https://osu.ppy.sh/community/matches/${id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-ash hover:text-paper">
                      {all.length > 1 ? `#${i + 1}` : "mp"} <ExternalLink className="size-3.5" />
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
