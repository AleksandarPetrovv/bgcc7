import Link from "next/link";
import { Scoreline } from "@/components/site/match-row";
import { CalendarClock, ChevronDown, Gavel, Link2, Radio, Video } from "lucide-react";
import { ActionForm, DateTimeField, Field } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { Dropdown } from "@/components/admin/dropdown";
import { MpLinks } from "@/components/admin/mp-links";
import { RefSwapGuard } from "./ref-swap-guard";
import type { MatchRow } from "@/db/tournament";
import type { Dict } from "@/lib/i18n/dict";
import { getFormat } from "@/db/edition";
import { matchLabel, matchStamp } from "@/lib/matches";
import { Pic } from "@/components/site/pfp";
import { dayTime, toSofiaInput } from "@/lib/time";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import { clearCache, saveMatch } from "./actions";
import { osuMp } from "@/lib/links";
import { mpIds } from "@/lib/mp-links";

const group = "relative border-t border-line pt-5";

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -top-3 left-0 isolate px-2 py-0.5 text-[0.62rem] font-display font-bold text-paper/80">
      <SlantBg className="border border-line bg-ink" />
      {children}
    </span>
  );
}

export function MatchCard({ m, t, locale, teams, refs, host, pools, live }: { m: MatchRow; t: Dict; locale: string; teams: { id: string; name: string; image: string }[]; refs: { referee: string[]; streamer: string[]; commentator: string[] }; host: boolean; pools: { slug: string; title: string }[]; live?: { lobby: boolean } }) {
  const f = getFormat();
  const name = (id: string | null) => teams.find((x) => x.id === id)?.name ?? t.common.tbd;
  const teamPic = (id: string | null) => {
    const src = teams.find((x) => x.id === id)?.image;
    return src ? <Pic src={src} className="size-7 shrink-0 rounded-full object-cover" /> : <span className="size-7 shrink-0 rounded-full bg-slate" aria-hidden />;
  };
  const mp = mpIds(m.mpLinks);
  const status = m.winner ? "done" : mp.length ? "live" : m.startsAt ? "soon" : "tbd";
  const tone = { done: "bg-balkan", live: "bg-crimson", soon: "bg-azure", tbd: "bg-line" }[status];
  const side = (n: 1 | 2) => {
    const won = m.winner === n;
    const lost = !!m.winner && !won;
    return cn(
      "min-w-0 truncate text-sm sm:text-base",
      won ? "font-display font-black text-paper" : lost ? "font-display font-bold text-ash" : "font-display font-bold text-paper/90",
      !(n === 1 ? m.team1Id : m.team2Id) && "italic text-ash",
    );
  };
  // no score yet: a plain VS instead of two empty boxes
  const scored = m.score1 != null || m.score2 != null;
  const score = (n: 1 | 2) => <span className={cn("num text-2xl italic leading-none", !m.winner || m.winner === n ? "text-paper" : "text-ash")}>{(n === 1 ? m.score1 : m.score2) ?? 0}</span>;

  return (
    <details
      data-cascade
      className="adm-match group in-left relative border-b border-line transition-colors duration-200 hover:border-paper/25 open:border-paper/30"
    >
      {/* equal side columns and a fixed-width middle keep the teams centred in the row */}
      <summary className="relative grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] [&::-webkit-details-marker]:hidden">
        <span className={cn("absolute inset-y-0 left-0 w-1", tone)} aria-hidden />
        <span className="hidden min-w-0 flex-col gap-1 sm:flex">
          <span className="hidden flex-col gap-1 md:flex">
          <span className="text-[0.65rem] font-display font-bold leading-tight text-ash">{matchLabel(f, t, m.id)}</span>
          <span
            className={cn(
              "relative isolate w-fit px-1.5 py-0.5 text-[0.6rem] font-display font-bold",
              { done: "text-balkan-hi", live: "text-rose-hi", soon: "text-azure-hi", tbd: "text-ash" }[status],
            )}
          >
            <SlantBg className={{ done: "bg-balkan/15", live: "bg-rose/15", soon: "bg-azure/15", tbd: "bg-line/60" }[status]} />
            {t.admin.mStatus[status]}
          </span>
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:hidden">
          {([1, 2] as const).map((n) => (
            <span key={n} className="flex items-center gap-2.5">
              {teamPic(n === 1 ? m.team1Id : m.team2Id)}
              <span className={cn(side(n), "flex-1")}>{name(n === 1 ? m.team1Id : m.team2Id)}</span>
              {scored && score(n)}
            </span>
          ))}
          <span className="num flex items-center gap-1.5 pl-3.5 text-[0.7rem] text-ash">
            <CalendarClock className="size-3 shrink-0" />
            <span className="min-w-0 truncate">{m.startsAt ? dayTime(toSofiaInput(m.startsAt), locale.startsWith("bg") ? "bg" : "en") : t.common.tbd}</span>
            <span className="ml-auto shrink-0 font-display font-bold">{t.admin.mStatus[status]}</span>
          </span>
        </span>

        <span className="hidden min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:grid sm:w-[18rem] lg:w-[22rem] xl:w-[28rem]">
          <span className="flex min-w-0 items-center justify-end gap-2">
            <span className={side(1)}>{name(m.team1Id)}</span>
            {teamPic(m.team1Id)}
          </span>
          {/* the home match cards' scoreline and VS */}
          {scored ? (
            <Scoreline score={[m.score1, m.score2]} winner={m.winner} className="text-3xl" />
          ) : (
            <span className="heading-slam w-8 text-center text-sm text-ash sm:text-lg">{t.common.vs}</span>
          )}
          <span className="flex min-w-0 items-center gap-2">
            {teamPic(m.team2Id)}
            <span className={side(2)}>{name(m.team2Id)}</span>
          </span>
        </span>

        <span className="flex min-w-0 items-center justify-end gap-3">
        <span className="hidden min-w-0 flex-col items-end gap-1 text-xs lg:flex">
          <span className={cn("num flex items-center gap-1.5 whitespace-nowrap", m.startsAt ? "text-paper/85" : "text-ash")}>
            <CalendarClock className="size-3.5 text-ash" />
            {m.startsAt ? dayTime(toSofiaInput(m.startsAt), locale.startsWith("bg") ? "bg" : "en") : t.common.tbd}
          </span>
          <span className="flex items-center gap-3 text-ash">
            {m.referee && (
              <span className="flex max-w-28 items-center gap-1 truncate" title={t.admin.referee}>
                <Gavel className="size-3 shrink-0" /> <span className="truncate">{m.referee}</span>
              </span>
            )}
            {m.streamer && <Radio className="size-3.5 shrink-0" aria-label={t.admin.streamer} />}
            {mp.length > 0 && (
              <span className="num flex items-center gap-1">
                <Link2 className="size-3" /> {mp.length}
              </span>
            )}
            {m.vodUrl && <Video className="size-3.5 shrink-0" aria-label={t.admin.vodUrl} />}
          </span>
        </span>

        <span className="relative isolate grid size-8 shrink-0 place-items-center text-ash transition-colors group-hover:text-paper group-open:text-white">
          <SlantBg className="border border-line transition-colors group-hover:border-paper/40 group-open:border-rose group-open:bg-rose" />
          <ChevronDown className="size-4 transition-transform duration-300 group-open:rotate-180" aria-hidden />
        </span>
        </span>
      </summary>

      <div className="border-t border-line pb-5 pl-4 pt-6">
        <ActionForm key={JSON.stringify(m)} action={saveMatch.bind(null, m.id)} className="space-y-5">
          <input type="hidden" name="stamp" value={matchStamp(m)} />
          <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <fieldset className={group}>
              <Legend>{t.admin.secResult}</Legend>
              <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-x-3 gap-y-3">
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 bg-crimson" /> {t.admin.teamN(1)}
                  </span>
                  <Dropdown name="team1Id" defaultValue={m.team1Id ?? ""} options={[{ value: "", label: t.common.tbd }, ...teams.map((x) => ({ value: x.id, label: x.name }))]} />
                </label>
                <label className={labelCls}>
                  {t.admin.scoreShort}
                  <Field type="number" name="score1" min={0} max={99} defaultValue={m.score1 ?? ""} className="text-center" />
                </label>
                <label className={cn(labelCls, "col-start-2 row-start-2")}>
                  {t.admin.scoreShort}
                  <Field type="number" name="score2" min={0} max={99} defaultValue={m.score2 ?? ""} className="text-center" />
                </label>
                <label className={cn(labelCls, "col-start-1 row-start-2")}>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 bg-azure" /> {t.admin.teamN(2)}
                  </span>
                  <Dropdown name="team2Id" defaultValue={m.team2Id ?? ""} options={[{ value: "", label: t.common.tbd }, ...teams.map((x) => ({ value: x.id, label: x.name }))]} />
                </label>
                <label className={cn(labelCls, "col-span-2")}>
                  {t.admin.winner}
                  <Dropdown
                    name="winner"
                    defaultValue="auto"
                    options={[
                      { value: "auto", label: t.admin.winnerAuto },
                      { value: "1", label: name(m.team1Id), color: "var(--crimson)" },
                      { value: "2", label: name(m.team2Id), color: "var(--azure)" },
                      { value: "none", label: t.admin.winnerNone },
                    ]}
                  />
                </label>
              </div>
              {f.feed[m.id] && (
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-xs font-display font-bold text-paper/85">
                  <input type="checkbox" name="manual" defaultChecked={m.manual} className="size-4 accent-rose" />
                  {t.admin.lockTeams}
                </label>
              )}
            </fieldset>

            <fieldset className={group}>
              <Legend>{t.admin.secStaff}</Legend>
              <div className="grid grid-cols-2 gap-3">
                <label className={cn(labelCls, "col-span-2 sm:col-span-1")}>
                  {t.admin.startsAt}
                  <DateTimeField name="startsAt" defaultValue={toSofiaInput(m.startsAt)} className="w-full" />
                </label>
                <label className={labelCls}>
                  {t.admin.matchPool}
                  <Dropdown
                    name="poolSlug"
                    defaultValue={m.poolSlug ?? m.stageSlug}
                    options={pools.map((p) => ({ value: p.slug, label: p.slug === m.stageSlug ? `${p.title} · ${t.admin.matchPoolRound}` : p.title }))}
                  />
                </label>
                <label className={labelCls}>
                  {t.admin.referee}
                  {host ? (
                    <>
                      <RefSwapGuard live={!!live} lobby={!!live?.lobby} from={m.referee ?? ""} />
                      <Dropdown name="referee" defaultValue={m.referee ?? ""} options={[{ value: "", label: t.common.tbd }, ...refs.referee.map((r) => ({ value: r, label: r }))]} />
                    </>
                  ) : (
                    <Field value={m.referee ?? ""} disabled />
                  )}
                </label>
                <label className={labelCls}>
                  {t.admin.streamer}
                  {host ? (
                    <Dropdown name="streamer" multiple placeholder={t.common.tbd} defaultValue={m.streamer ?? ""} options={refs.streamer.map((r) => ({ value: r, label: r }))} />
                  ) : (
                    <Field value={m.streamer ?? ""} placeholder={t.common.tbd} disabled />
                  )}
                </label>
                <label className={cn(labelCls, "col-span-2")}>
                  {t.admin.commentators}
                  {host ? (
                    <Dropdown name="commentators" multiple placeholder={t.common.tbd} defaultValue={m.commentators ?? ""} options={refs.commentator.map((r) => ({ value: r, label: r }))} />
                  ) : (
                    <Field value={m.commentators ?? ""} placeholder={t.common.tbd} disabled />
                  )}
                </label>
              </div>
            </fieldset>
          </div>

          <fieldset className={group}>
            <Legend>{t.admin.secLinks}</Legend>
            <div className="grid gap-3 md:grid-cols-2">
              <label className={labelCls}>
                {t.admin.mpLinks}
                <MpLinks name="mpLinks" initial={mp.map((x) => osuMp(x))} />
              </label>
              <label className={labelCls}>
                {t.admin.vodUrl}
                <Field name="vodUrl" maxLength={300} placeholder="https://…" defaultValue={m.vodUrl ?? ""} />
              </label>
            </div>
          </fieldset>
        </ActionForm>

        {mp.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Link
              href={`/admin/matches/${m.id}`}
              className="group/ms relative isolate inline-flex min-h-10 items-center px-4 text-xs font-display font-bold text-on-fill hover:text-ink"
            >
              <SlantBg className="bg-balkan group-hover/ms:bg-paper" />
              {t.admin.ms.open}
            </Link>
            <ActionForm action={clearCache.bind(null, m.id)} submit={t.admin.clearCache} ghost />
          </div>
        )}
      </div>
    </details>
  );
}
