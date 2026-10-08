import { notFound } from "next/navigation";
import { CalendarClock, Radio } from "lucide-react";
import { PageTitle } from "@/components/site/page";
import { Panel } from "@/components/admin/form";
import { CopyLink } from "@/components/admin/copy-link";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { siteUrl } from "@/lib/links";
import { fmtSofia } from "@/lib/time";
import { streamMatches } from "@/db/stream";
import { getLive } from "@/lib/live-scores";
import { SceneButtons } from "./scene-buttons";
import { OverlayPreview } from "./overlay-preview";

export const dynamic = "force-dynamic";

export default async function Stream() {
  const [t, lang, viewer] = await Promise.all([getDict(), getLang(), getViewer()]);
  if (!viewer || !can(viewer.roles, "stream")) notFound();
  const all = can(viewer.roles, "matches");
  const list = await streamMatches(viewer.osuId, all);
  const s = t.admin.stream;
  const base = siteUrl();

  return (
    <>
      <PageTitle mark="chevrons">{t.admin.menu.stream}</PageTitle>
      <div className="grid max-w-4xl gap-6">
        {list.length === 0 && <p className="text-sm font-bold text-ash">{all ? s.noneAll : s.none}</p>}
        {list.map((m, i) => (
          <Panel key={m.id} title={t.rounds[m.round] ?? m.round} i={i + 1}>
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="flex min-w-0 items-center gap-2 text-lg font-black">
                  <span className="h-5 w-1 shrink-0 bg-rose" aria-hidden />
                  <span className="truncate">{m.team1.name}</span>
                  <span className="text-[0.62rem] uppercase text-ash">vs</span>
                  <span className="truncate">{m.team2.name}</span>
                  <span className="h-5 w-1 shrink-0 bg-azure" aria-hidden />
                </span>
                <span className="num flex items-center gap-1.5 text-xs text-paper/85">
                  <CalendarClock className="size-3.5 text-ash" />
                  {m.datetime ? fmtSofia(new Date(m.datetime), lang === "bg" ? "bg-BG" : "en-GB") : t.common.tbd}
                </span>
                <span className={m.mine ? "flex items-center gap-1.5 text-xs font-black uppercase text-balkan" : "flex items-center gap-1.5 text-xs text-ash"}>
                  <Radio className="size-3.5" />
                  {m.mine ? s.you : (m.streamer ?? t.common.tbd)}
                </span>
              </div>
              <OverlayPreview slug={m.slug} title={s.preview} label={s.liveScores} offline={s.noLiveScores} clientsLabel={s.clients} delayLabel={s.delay} initialAt={getLive(m.id)?.at ?? null} initialClients={getLive(m.id)?.clients.length ?? 0} />
              <SceneButtons id={m.id} initial={m.scene} />
              <CopyLink url={`${base}/overlay/${m.slug}`} />
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
