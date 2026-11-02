import { SiteNav } from "@/components/site/site-nav";
import { Backdrop } from "@/components/site/backdrop";
import { SiteFooter } from "@/components/site/site-footer";
import { Flash } from "@/components/site/flash";
import { DetailsMotion } from "@/components/site/details-motion";
import { AlertPopups } from "@/components/site/alert-popups";
import { TournamentProvider } from "@/components/site/tournament";
import { meStyle } from "@/components/site/me";
import { getMatches, getTeams } from "@/db/tournament";
import { getSettings } from "@/db/settings";
import { isPlayer, myOpenDraft } from "@/db/drafts";
import { getMe, regOpen, schedNav } from "@/db/viewer";
import { getVisibility } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { hasAdmin } from "@/lib/roles";
import { adminMenu } from "./admin/menu";
import { buildNav } from "@/lib/sections";
import { getLive } from "@/lib/twitch";
import { isLive } from "@/lib/matches";
import { avatarPath } from "@/lib/avatar";
import { currentEdition } from "@/db";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [viewer, vis, teams, matches, settings, dict] = await Promise.all([getMe(), getVisibility(), getTeams(), getMatches(), getSettings(), getDict()]);
  const user = viewer?.name ? { name: viewer.name, image: avatarPath(viewer.osuId, true), admin: hasAdmin(viewer.roles) ? (adminMenu(viewer.roles)[0]?.href ?? "/admin") : null } : null;
  const [captain, twitch, sched] = await Promise.all([viewer ? isPlayer(viewer.osuId) : false, vis.sections.streams || vis.staff ? getLive().then(Boolean) : false, schedNav().catch(() => null)]);
  const match = captain && viewer ? await myOpenDraft(viewer.osuId).catch(() => null) : null;
  const meCss = meStyle(viewer?.osuId ?? null, viewer?.teamOf ?? null, dict.common.meYou, dict.common.meTeam);
  const live = [...(twitch ? ["streams"] : []), ...(matches.some((m) => isLive(m)) && (vis.sections.schedule || vis.staff) ? ["schedule"] : [])];
  return (
    <>
      {meCss && <style dangerouslySetInnerHTML={{ __html: meCss }} />}
      <Backdrop />
      <SiteNav user={user} nav={buildNav(vis.sections, vis.staff, vis.off)} register={regOpen(settings, vis.sections)} live={live} captain={captain} match={match} sched={sched} />
      <TournamentProvider teams={teams} matches={matches} edition={currentEdition()}>
        <main className="flex-1">{children}</main>
      </TournamentProvider>
      <SiteFooter />
      <Flash />
      <DetailsMotion />
      {viewer?.roles.length ? <AlertPopups /> : null}
    </>
  );
}
