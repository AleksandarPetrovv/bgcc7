import { currentOsuId } from "@/auth";
import { getLeaderboard, getPicks } from "@/db/queries";
import { getSettings } from "@/db/settings";
import { getMatches } from "@/db/tournament";
import { lockedMatches } from "@/lib/pickems";
import { PickemsView } from "./pickems-view";
import { requireSection } from "@/lib/authz";

export default async function Pickems() {
  await requireSection("pickems");
  const osuId = await currentOsuId();
  const [saved, leaderboard, settings, matches] = await Promise.all([osuId ? getPicks(osuId) : null, getLeaderboard(), getSettings(), getMatches()]);
  return <PickemsView osuId={osuId} saved={saved} leaderboard={leaderboard} open={settings.pickemsOpen} locked={lockedMatches(matches)} />;
}
