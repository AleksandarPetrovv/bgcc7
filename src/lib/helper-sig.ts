import "server-only";
import { appOf, appRunning, relayOnline } from "@/lib/relay";
import { currentStreamMatch } from "@/db/stream";
import { getLive } from "@/lib/live-scores";

// everything the helper pages show about the viewer's helper, flattened so a change is one string compare
export async function helperSig(osuId: number) {
  const [app, match] = await Promise.all([appOf(osuId), currentStreamMatch(osuId)]);
  const live = match ? getLive(match.id) : null;
  return [app?.ircName ?? "", +appRunning(osuId), +relayOnline(osuId), match?.id ?? "", live?.clients.length ?? -1].join("|");
}
