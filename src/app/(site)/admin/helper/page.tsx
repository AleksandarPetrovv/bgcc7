import { forbidden } from "next/navigation";
import { helperView } from "@/lib/helper-sig";
import { HelperLink, HelperPoll, HelperStatus } from "@/components/admin/link-gate";
import { PageTitle } from "@/components/site/page-title";
import { Panel } from "@/components/admin/form";
import { getViewer, helperAccess } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { Cascade } from "@/components/site/cascade";
import { getLang } from "@/lib/i18n/server";
import { fmtSofia } from "@/lib/time";
import { localeOf } from "@/lib/i18n/locale";
import { SlantBg } from "@/components/site/slant";

export const dynamic = "force-dynamic";

export default async function HelperPage() {
  const [t, viewer] = await Promise.all([getDict(), getViewer()]);
  const access = viewer && helperAccess(viewer.roles);
  if (!viewer || !access?.any) forbidden();
  const { ref, stream: streamer } = access;
  const r = t.admin.refApp;
  const [h, lang] = await Promise.all([helperView(viewer.osuId), getLang()]);
  const { app, online, irc, sig } = h;
  const match = streamer ? h.match : null;
  const live = match ? h.live : null;
  const locale = localeOf(lang);
  const tile = "in-up flex min-w-0 flex-col gap-1.5 border border-line bg-ink/50 px-4 py-3";
  const k = "in-wipe text-[0.68rem] font-display font-bold text-ash";

  return (
    <>
      <PageTitle mark="whistle">{t.admin.menu.helper}</PageTitle>
      <HelperPoll sig={sig} />
      <Cascade className="grid max-w-3xl gap-6 [--d:0.35s]" step={0.08}>
        <HelperLink linked={!!app} i={1} />
        <Panel
          title={t.admin.menu.helper}
          i={2}
          aside={<HelperStatus linked={!!app} online={online} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
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
                {ref && <span data-cascade className="in-pop"><span className="relative isolate inline-block px-2.5 py-0.5 text-xs font-display font-bold text-white"><SlantBg className="bg-rose" />{r.referee}</span></span>}
                {streamer && <span data-cascade className="in-pop"><span className="relative isolate inline-block px-2.5 py-0.5 text-xs font-display font-bold text-white"><SlantBg className="bg-azure" />{r.streamer}</span></span>}
                {!ref && !streamer && <span className="text-sm text-ash">{r.noModes}</span>}
              </span>
            </div>
            <div data-cascade className={tile}>
              <span data-cascade className={k}>{r.lastSeen}</span>
              <span className="num text-base font-display font-black">{online ? r.now : app?.seenAt ? fmtSofia(app.seenAt, locale) : r.never}</span>
            </div>
            {ref && (
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
        </Panel>
      </Cascade>
    </>
  );
}
