import { notFound } from "next/navigation";
import { getFormat } from "@/db/edition";
import { getMatches } from "@/db/tournament";
import { matchIdFromSlug } from "@/lib/format";
import { roundName } from "@/lib/i18n/dict";
import { getDict } from "@/lib/i18n/server";
import Matches from "../../matches/page";

// the matches page with this match's popup open; the popup sets this url itself when opened anywhere
export async function generateMetadata({ params }: PageProps<"/results/[slug]">) {
  const id = matchIdFromSlug(getFormat(), (await params).slug);
  const [t, ms] = await Promise.all([getDict(), getMatches()]);
  const m = ms.find((x) => x.id === id);
  if (!m) return {};
  const title = `${roundName(t, m.round)} · ${m.team1.name} vs ${m.team2.name}`;
  const description = m.winner ? `${m.team1.name} ${m.team1.score ?? 0} - ${m.team2.score ?? 0} ${m.team2.name}` : undefined;
  return { title, description, openGraph: { title, description } };
}

export default async function Result({ params }: PageProps<"/results/[slug]">) {
  if (!matchIdFromSlug(getFormat(), (await params).slug)) notFound();
  return <Matches />;
}
