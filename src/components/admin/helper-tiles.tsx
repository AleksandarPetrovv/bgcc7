import { SlantBg } from "@/components/site/slant";
import type { Dict } from "@/lib/i18n/dict";
import type { helperView } from "@/lib/helper-sig";
import { fmtSofia } from "@/lib/time";
import { cn } from "@/lib/utils";

const tile = "in-up flex min-w-0 flex-col gap-1.5 border border-line bg-ink/50 px-4 py-3";
const k = "in-wipe text-[0.68rem] font-display font-bold text-ash";

/** everything about a viewer's helper, as tiles; sits inside a Cascade */
export function HelperTiles({ t, locale, h, referee, streamer, className }: { t: Dict; locale: string; h: Awaited<ReturnType<typeof helperView>>; referee: boolean; streamer: boolean; className?: string }) {
  const r = t.admin.refApp;
  const { app, online, irc } = h;
  const match = streamer ? h.match : null;
  const live = match ? h.live : null;
  const mode = "relative isolate inline-block px-2.5 py-0.5 text-xs font-display font-bold text-white";
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div data-cascade className={tile}>
        <span data-cascade className={k}>{r.status}</span>
        <span className={cn("text-base font-display font-black", online ? "text-balkan-hi" : "text-ash")}>{online ? r.online : app ? r.offline : r.none}</span>
      </div>
      <div data-cascade className={tile}>
        <span data-cascade className={k}>{r.account}</span>
        <span className="truncate text-base font-display font-black">{app?.ircName.replace(/_/g, " ") ?? "—"}</span>
      </div>
      <div data-cascade className={tile}>
        <span data-cascade className={k}>{r.modes}</span>
        <span className="flex flex-wrap gap-2">
          {referee && <span data-cascade className="in-pop"><span className={mode}><SlantBg className="bg-rose" />{r.referee}</span></span>}
          {streamer && <span data-cascade className="in-pop"><span className={mode}><SlantBg className="bg-azure" />{r.streamer}</span></span>}
          {!referee && !streamer && <span className="text-sm text-ash">{r.noModes}</span>}
        </span>
      </div>
      <div data-cascade className={tile}>
        <span data-cascade className={k}>{r.lastSeen}</span>
        <span className="num text-base font-display font-black">{online ? r.now : app?.seenAt ? fmtSofia(app.seenAt, locale) : r.never}</span>
      </div>
      {referee && (
        <div data-cascade className={tile}>
          <span data-cascade className={k}>{r.irc}</span>
          <span className={cn("text-base font-display font-black", irc ? "text-balkan-hi" : "text-ash")}>{irc ? r.ircOn : r.ircOff}</span>
        </div>
      )}
      {streamer && (
        <div data-cascade className={tile}>
          <span data-cascade className={k}>{r.streaming}</span>
          <span className="truncate text-base font-display font-black">{match ? `${match.team1.name} vs ${match.team2.name}` : r.noMatch}</span>
          {match && <span className={cn("text-xs font-display font-bold", live ? "text-balkan-hi" : "text-ash")}>{live ? r.liveOn(live.clients.length) : r.liveOff}</span>}
        </div>
      )}
    </div>
  );
}
