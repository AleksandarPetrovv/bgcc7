import { pageMeta } from "@/lib/page-meta";
import { currentOsuId } from "@/auth";
import { getLeaderboard, getPicks } from "@/db/queries";
import { getFormat } from "@/db/edition";
import { getMatches } from "@/db/tournament";
import { pickemsState } from "@/db/pickems";
import { lockedOf } from "@/lib/pickems";
import { PickemsView } from "./pickems-view";
import { requireSection } from "@/lib/authz";

export const generateMetadata = pageMeta("pickems");

export default async function Pickems() {
  await requireSection("pickems");
  const osuId = await currentOsuId();
  const [saved, leaderboard, f, matches] = await Promise.all([osuId ? getPicks(osuId) : null, getLeaderboard(), getFormat(), getMatches()]);
  const { open, closesAt } = await pickemsState(f, matches);
  return <PickemsView osuId={osuId} saved={saved} leaderboard={leaderboard} open={open} closesAt={closesAt} locked={lockedOf(matches)} />;
}
