import { currentOsuId } from "@/auth";
import { getLeaderboard, getPicks } from "@/db/queries";
import { getSettings } from "@/db/settings";
import { PickemsView } from "./pickems-view";
import { requireSection } from "@/lib/authz";

export default async function Pickems() {
  await requireSection("pickems");
  const osuId = await currentOsuId();
  const [saved, leaderboard, settings] = await Promise.all([osuId ? getPicks(osuId) : null, getLeaderboard(), getSettings()]);
  return <PickemsView osuId={osuId} saved={saved} leaderboard={leaderboard} open={settings.pickemsOpen} locked={[]} />;
}
