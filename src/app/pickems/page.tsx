import { currentOsuId } from "@/auth";
import { getLeaderboard, getPicks } from "@/db/queries";
import { PickemsView } from "./pickems-view";
import { requireSection } from "@/lib/authz";

export default async function Pickems() {
  await requireSection("pickems");
  const osuId = await currentOsuId();
  const [saved, leaderboard] = await Promise.all([osuId ? getPicks(osuId) : null, getLeaderboard()]);
  return <PickemsView osuId={osuId} saved={saved} leaderboard={leaderboard} />;
}
