import { forbidden } from "next/navigation";
import { CalendarClock, ChevronDown, Radio } from "lucide-react";
import { PageTitle } from "@/components/site/page-title";
import { Panel } from "@/components/admin/form";
import { CopyLink } from "@/components/admin/copy-link";
import { SlantBg } from "@/components/site/slant";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { overlayUrl } from "@/lib/links";
import { fmtSofia } from "@/lib/time";
import { streamMatches } from "@/db/stream";
import { getLive, getReject } from "@/lib/live-scores";
import { SceneButtons } from "./scene-buttons";
import { OverlayPreview, PanelFeedProvider } from "./overlay-preview";
import { Cascade } from "@/components/site/cascade";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";

export const dynamic = "force-dynamic";

export default async function Stream() {
  const [t, lang, viewer] = await Promise.all([getDict(), getLang(), getViewer()]);
  if (!viewer || !can(viewer.roles, "stream")) forbidden();
  const all = can(viewer.roles, "host");
  const list = await streamMatches(viewer.osuId, all);
  const upcoming = list.filter((m) => !m.past);
  const past = list.filter((m) => m.past);
  const s = t.admin.stream;

  const panel = (m: (typeof list)[number], i: number) => (
    <Panel key={m.id} title={roundName(t, m.round)} i={i + 1} className={m.mine ? "border-2 border-gold shadow-[6px_6px_0_0_var(--gold-deep)]" : undefined}>
      <PanelFeedProvider>
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span data-cascade className="in-left flex min-w-0 items-center gap-2 text-lg font-display font-black">
            <span className="h-5 w-1 shrink-0 bg-crimson" aria-hidden />
            <span className="truncate">{m.team1.name}</span>
            <span className="font-display text-[0.62rem] text-ash">VS</span>
            <span className="truncate">{m.team2.name}</span>
            <span className="h-5 w-1 shrink-0 bg-azure" aria-hidden />
          </span>
          <span data-cascade className="in-up num flex items-center gap-1.5 text-xs text-paper/85">
            <CalendarClock className="size-3.5 text-ash" />
            {m.datetime ? fmtSofia(new Date(m.datetime), localeOf(lang)) : t.common.tbd}
          </span>
          <span data-cascade className={m.mine ? "in-right flex items-center gap-1.5 text-xs font-display font-bold text-gold-hi" : "in-right flex items-center gap-1.5 text-xs text-ash"}>
            <Radio className="size-3.5" />
            {m.mine ? s.you : (m.streamer ?? t.common.tbd)}
          </span>
        </div>
        <div data-cascade className="in-up">
        <OverlayPreview slug={m.slug} title={s.preview} view={s.view} label={s.liveScores} offline={s.noLiveScores} clientsLabel={s.clients} delayLabel={s.delay} initialAt={getLive(m.id)?.at ?? null} initialClients={getLive(m.id)?.clients.length ?? 0} />
        </div>
        {getReject(m.id) && <p data-cascade className="in-wipe text-xs font-display font-bold text-rose-hi">{s.reject[getReject(m.id)!]}</p>}
        <div data-cascade className="in-up">
          <SceneButtons id={m.id} initial={m.scene} />
        </div>
        <div data-cascade className="in-up">
          <CopyLink url={overlayUrl(m.slug)} />
        </div>
      </div>
      </PanelFeedProvider>
    </Panel>
  );

  return (
    <>
      <PageTitle mark="camera">{t.admin.menu.stream}</PageTitle>
      <Cascade className="grid max-w-4xl grid-cols-1 gap-6" step={0.06}>
        {upcoming.length === 0 && <p className="text-sm font-bold text-ash">{all ? s.noneAll : s.none}</p>}
        {upcoming.map((m, i) => panel(m, i))}
        {past.length > 0 && (
          <details data-cascade className="group/past in-up">
            <summary className="group/sum flex cursor-pointer list-none items-center gap-3 border-b border-line pb-2.5 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-display font-black text-paper">{s.past}</span>
              <span className="num text-xs text-ash">{past.length}</span>
              <span className="relative isolate ml-auto grid size-8 shrink-0 place-items-center text-ash transition-colors group-hover/sum:text-paper group-open/past:text-white">
                <SlantBg className="border border-line transition-colors group-hover/sum:border-paper/40 group-open/past:border-rose group-open/past:bg-rose" />
                <ChevronDown className="size-4 transition-transform duration-300 group-open/past:rotate-180" aria-hidden />
              </span>
            </summary>
            <div className="grid grid-cols-1 gap-6 pt-6">{past.map((m, i) => panel(m, upcoming.length + i))}</div>
          </details>
        )}
      </Cascade>
    </>
  );
}
