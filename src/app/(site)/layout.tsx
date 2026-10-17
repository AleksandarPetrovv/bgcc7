import { SiteNav } from "@/components/site/site-nav";
import { Backdrop } from "@/components/site/backdrop";
import { LiteSettle } from "@/components/site/lite-settle";
import { SiteFooter } from "@/components/site/site-footer";
import { Flash } from "@/components/site/flash";
import { TournamentProvider } from "@/components/site/tournament";
import { meStyle } from "@/components/site/me";
import { getMatches, getTeams } from "@/db/tournament";
import { getSettings } from "@/db/settings";
import { isPlayer, myOpenDraft } from "@/db/drafts";
import { auth } from "@/auth";
import { getViewer, getVisibility } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { hasAdmin } from "@/lib/roles";
import { buildNav } from "@/lib/sections";
import { getLive } from "@/lib/twitch";
import { isLive } from "@/lib/matches";
import { windowState } from "@/lib/time";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [session, viewer, vis, teams, matches, settings, dict] = await Promise.all([auth(), getViewer(), getVisibility(), getTeams(), getMatches(), getSettings(), getDict()]);
  const user = session?.user?.name ? { name: session.user.name, image: session.user.image ?? null, admin: hasAdmin(viewer?.roles) } : null;
  const [captain, twitch] = await Promise.all([viewer ? isPlayer(viewer.osuId) : false, vis.sections.streams || vis.staff ? getLive().then(Boolean) : false]);
  const match = captain && viewer ? await myOpenDraft(viewer.osuId).catch(() => null) : null;
  const regOpen = vis.sections.register && settings.phase === "registration" && windowState(settings.regOpensAt, settings.regClosesAt) === "open";
  const me = viewer?.osuId ?? null;
  const myTeam = me ? (teams.find((x) => x.players.some((p) => p.userId === me))?.id ?? null) : null;
  const meCss = meStyle(me, myTeam, dict.common.meYou, dict.common.meTeam);
  const live = [...(twitch ? ["streams"] : []), ...(matches.some(isLive) && (vis.sections.schedule || vis.staff) ? ["schedule"] : [])];
  return (
    <>
      {meCss && <style dangerouslySetInnerHTML={{ __html: meCss }} />}
      <Backdrop />
      <LiteSettle />
      <SiteNav user={user} nav={buildNav(vis.sections, vis.staff, vis.off)} register={regOpen} live={live} captain={captain} match={match} />
      <TournamentProvider teams={teams} matches={matches} edition={settings.edition}>
        <main className="flex-1">{children}</main>
      </TournamentProvider>
      <SiteFooter />
      <Flash />
    </>
  );
}
