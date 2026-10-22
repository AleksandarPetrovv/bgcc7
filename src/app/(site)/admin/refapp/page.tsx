import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { PageTitle, SlantButton } from "@/components/site/page";
import { ActionForm, Panel } from "@/components/admin/form";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { appOf, appRunning, linkWord, relayOnline, validState } from "@/lib/relay";
import { cn } from "@/lib/utils";
import { linkApp, unlinkApp } from "./actions";
import { linkHelper, unlinkHelper } from "../overlay/actions";
import { currentStreamMatch } from "@/db/stream";
import { getLive } from "@/lib/live-scores";
import { getLang } from "@/lib/i18n/server";
import { fmtSofia } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function RefApp({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [t, viewer, { link }] = await Promise.all([getDict(), getViewer(), searchParams]);
  const st = typeof link === "string" && validState(link) ? link : null;
  if (!viewer || !(can(viewer.roles, "matches") || can(viewer.roles, "overlay"))) notFound();
  const ref = can(viewer.roles, "matches");
  const app = await appOf(viewer.osuId);
  const online = appRunning(viewer.osuId);
  const irc = relayOnline(viewer.osuId);
  const r = t.admin.refApp;
  const streamer = can(viewer.roles, "overlay");
  const [match, lang] = await Promise.all([streamer ? currentStreamMatch(viewer.osuId) : null, getLang()]);
  const live = match ? getLive(match.id) : null;
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const tile = "flex min-w-0 flex-col gap-1.5 border border-line bg-ink/50 px-4 py-3";
  const k = "text-[0.68rem] font-display font-bold text-ash";

  return (
    <>
      <PageTitle mark="chevrons">{t.admin.menu.refapp}</PageTitle>
      <div className="grid max-w-3xl gap-6">
        {st && (
          <Panel title={r.linkTitle} i={1}>
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className="in-pop inline-flex -skew-x-12 border border-rose bg-rose/10 px-5 py-2 shadow-[4px_4px_0_0_var(--rose-deep)]">
                  <span className="num inline-block skew-x-12 text-4xl tracking-[0.2em] text-paper">{linkWord(st)}</span>
                </span>
                <span className="text-sm font-display font-bold text-ash">{r.linkCode}</span>
              </div>
              <ActionForm action={(ref ? linkApp.bind(null, st) : linkHelper.bind(null, st, "refapp"))} submit={r.link} />
            </div>
          </Panel>
        )}
        <Panel title={t.admin.menu.refapp} i={st ? 2 : 1}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2.5 text-sm font-display font-bold">
              <span className={cn("size-2.5 rotate-45", online ? "bg-balkan" : app ? "bg-gold" : "bg-line")} aria-hidden />
              <span className={online ? "text-paper" : "text-ash"}>{online ? r.online : app ? r.offline : r.none}</span>
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-3">
              <SlantButton href="/download/helper" download tone="paper">
                <Download className="size-4" /> {r.download}
              </SlantButton>
              {app && <ActionForm action={ref ? unlinkApp : unlinkHelper} submit={r.unlink} ghost confirm={r.unlinkAsk} />}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className={tile}>
              <span className={k}>{r.account}</span>
              <span className="truncate text-base font-display font-black">{app?.ircName.replace(/_/g, " ") ?? "—"}</span>
            </div>
            <div className={tile}>
              <span className={k}>{r.modes}</span>
              <span className="flex flex-wrap gap-2">
                {ref && <span className="-skew-x-12 bg-rose px-2.5 py-0.5 text-xs font-display font-bold text-white"><span className="inline-block skew-x-12">{r.referee}</span></span>}
                {streamer && <span className="-skew-x-12 bg-azure px-2.5 py-0.5 text-xs font-display font-bold text-white"><span className="inline-block skew-x-12">{r.streamer}</span></span>}
                {!ref && !streamer && <span className="text-sm text-ash">{r.noModes}</span>}
              </span>
            </div>
            <div className={tile}>
              <span className={k}>{r.lastSeen}</span>
              <span className="num text-base font-display font-black">{online ? r.online : app?.seenAt ? fmtSofia(app.seenAt, locale) : r.never}</span>
            </div>
            {ref && (
              <div className={tile}>
                <span className={k}>{r.irc}</span>
                <span className={cn("text-base font-display font-black", irc ? "text-balkan-hi" : "text-ash")}>{irc ? r.ircOn : r.ircOff}</span>
              </div>
            )}
            {streamer && (
              <div className={tile}>
                <span className={k}>{r.streaming}</span>
                <span className="truncate text-base font-display font-black">{match ? `${match.team1.name} vs ${match.team2.name}` : r.noMatch}</span>
                {match && <span className={cn("text-xs font-display font-bold", live ? "text-balkan-hi" : "text-ash")}>{live ? r.liveOn(live.clients.length) : r.liveOff}</span>}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
