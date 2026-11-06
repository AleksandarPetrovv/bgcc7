import { notFound } from "next/navigation";
import { Download, Link2, Unlink } from "lucide-react";
import { helperSig } from "@/lib/helper-sig";
import { HelperPoll, LinkGate } from "./link-gate";
import { PageTitle, SlantButton } from "@/components/site/page";
import { ActionForm, Field, Panel, labelCls } from "@/components/admin/form";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { appOf, appRunning, relayOnline } from "@/lib/relay";
import { cn } from "@/lib/utils";
import { Cascade } from "@/components/site/cascade";
import { linkApp, unlinkApp } from "./actions";
import { linkHelper, unlinkHelper } from "../overlay/actions";
import { currentStreamMatch } from "@/db/stream";
import { getLive } from "@/lib/live-scores";
import { getLang } from "@/lib/i18n/server";
import { fmtSofia } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function RefApp() {
  const [t, viewer] = await Promise.all([getDict(), getViewer()]);
  if (!viewer || !(can(viewer.roles, "matches") || can(viewer.roles, "overlay"))) notFound();
  const ref = can(viewer.roles, "matches");
  const app = await appOf(viewer.osuId);
  const online = appRunning(viewer.osuId);
  const irc = relayOnline(viewer.osuId);
  const r = t.admin.refApp;
  const streamer = can(viewer.roles, "overlay");
  const [match, lang, sig] = await Promise.all([streamer ? currentStreamMatch(viewer.osuId) : null, getLang(), helperSig(viewer.osuId)]);
  const live = match ? getLive(match.id) : null;
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const tile = "in-up flex min-w-0 flex-col gap-1.5 border border-line bg-ink/50 px-4 py-3";
  const k = "in-wipe text-[0.68rem] font-display font-bold text-ash";

  return (
    <>
      <PageTitle mark="whistle">{t.admin.menu.refapp}</PageTitle>
      <HelperPoll sig={sig} />
      <Cascade className="grid max-w-3xl gap-6 [--d:0.35s]" step={0.08}>
        <LinkGate linked={!!app}>
          <Panel title={r.linkTitle} i={1}>
            <ActionForm action={ref ? linkApp : linkHelper.bind(null, "refapp")} submit={r.link} icon={<Link2 className="size-4" />} className="flex flex-wrap items-end gap-3">
              <label className={labelCls}>
                {r.linkCode}
                <Field name="code" required maxLength={64} autoComplete="off" spellCheck={false} className="w-64" />
              </label>
            </ActionForm>
          </Panel>
        </LinkGate>
        <Panel
          title={t.admin.menu.refapp}
          i={2}
          aside={
            <>
              <SlantButton href="/download/helper" download tone="rose">
                <Download className="size-4" /> {r.download}
              </SlantButton>
              {app && <ActionForm action={ref ? unlinkApp : unlinkHelper} submit={r.unlink} ghost confirm={r.unlinkAsk} icon={<Unlink className="size-3.5" />} />}
            </>
          }
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
                {ref && <span data-cascade className="in-pop"><span className="inline-block -skew-x-12 bg-rose px-2.5 py-0.5 text-xs font-display font-bold text-white"><span className="inline-block skew-x-12">{r.referee}</span></span></span>}
                {streamer && <span data-cascade className="in-pop"><span className="inline-block -skew-x-12 bg-azure px-2.5 py-0.5 text-xs font-display font-bold text-white"><span className="inline-block skew-x-12">{r.streamer}</span></span></span>}
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
