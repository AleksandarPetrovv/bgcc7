import { headers } from "next/headers";
import { SlantButton } from "@/components/site/slant";
import { ErrorPage } from "@/components/site/error-page";
import { getPoolStages } from "@/db/mappools";
import { getTeams } from "@/db/tournament";
import { teamFromHref, type Team } from "@/lib/data";
import { poolPack } from "@/lib/authz";
import { PATH_HEADER } from "@/lib/links";
import { getDict } from "@/lib/i18n/server";

type Why = "pool" | "poolHidden" | "packMissing" | "download" | "team" | "match" | "pickems";

/** notFound() carries no reason, so the path says which thing is missing (and for pools and packs, why; for a team ruled out, which one) */
async function why(path: string): Promise<Why | Team | null> {
  const [, section, slug] = path.split("/");
  if (section === "teams") {
    const team = teamFromHref(await getTeams(), slug ?? "");
    if (team?.out) return team;
  }
  if (section === "mappool" || section === "download") {
    const stage = slug ? (await getPoolStages()).find((s) => s.slug === slug) : undefined;
    if (!stage) return section === "mappool" ? "pool" : "download";
    if (!(await poolPack(stage.released))) return "poolHidden";
    return section === "download" && !stage.pack ? "packMissing" : null;
  }
  return ({ teams: "team", results: "match", matches: "match", pickems: "pickems" } as const)[section] ?? null;
}

export default async function NotFound() {
  const [t, path] = await Promise.all([getDict(), headers().then((h) => h.get(PATH_HEADER) ?? "")]);
  const w = await why(path);
  const { title, text } = !w ? t.notFound : typeof w === "string" ? t.notFound[w] : t.notFound.out[w.out!](w.name);
  return (
    <ErrorPage code={404} title={title} text={text}>
      <SlantButton href="/" tone="paper" className="px-5 py-2.5 text-base">
        {t.notFound.home}
      </SlantButton>
      <SlantButton href="/info" tone="outline" className="px-5 py-2.5 text-base">
        {t.home.readRules}
      </SlantButton>
    </ErrorPage>
  );
}
