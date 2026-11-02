import "server-only";
import { appOf, appRunning, relayOnline } from "@/lib/relay";
import { currentStreamMatch } from "@/db/stream";
import { getLive } from "@/lib/live-scores";

/** everything the helper pages show about the viewer's helper; `sig` flattens it so the page polls one string */
export async function helperView(osuId: number) {
  const [app, match] = await Promise.all([appOf(osuId), currentStreamMatch(osuId)]);
  const live = match ? getLive(match.id) : null;
  const online = appRunning(osuId);
  const irc = relayOnline(osuId);
  return { app, online, irc, match, live, sig: [app?.ircName ?? "", app?.seenAt?.getTime() ?? "", +online, +irc, match?.id ?? "", live?.clients.length ?? -1].join("|") };
}
