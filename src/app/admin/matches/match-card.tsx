import Link from "next/link";
import { CalendarClock, ChevronDown, Gavel, Link2, Radio, Video } from "lucide-react";
import { ActionForm, dateCls, Field, inputCls } from "@/components/admin/form";
import { Dropdown } from "@/components/admin/dropdown";
import type { MatchRow } from "@/db/tournament";
import type { Dict } from "@/lib/i18n/dict";
import { getFormat } from "@/db/edition";
import { matchSlug } from "@/lib/format";
import { fmtSofia, toSofiaInput } from "@/lib/time";
import { cn } from "@/lib/utils";
import { clearCache, saveMatch } from "./actions";
import { osuMp } from "@/lib/links";

const label = "flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors";
const group = "relative border border-line bg-coal/60 p-3.5 pt-5";

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -top-2.5 left-3 -skew-x-12 border border-line bg-ink px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.14em] text-paper/80">
      <span className="inline-block skew-x-12">{children}</span>
    </span>
  );
}

export function MatchCard({ m, k, t, locale, teams }: { m: MatchRow; k: number; t: Dict; locale: string; teams: { id: string; name: string }[] }) {
  const f = getFormat();
  const name = (id: string | null) => teams.find((x) => x.id === id)?.name ?? t.common.tbd;
  const mp = m.mpLinks.split(",").filter(Boolean);
  const status = m.winner ? "done" : mp.length ? "live" : m.startsAt ? "soon" : "tbd";
  const tone = { done: "bg-balkan", live: "bg-rose", soon: "bg-azure", tbd: "bg-line" }[status];
  const side = (n: 1 | 2) => {
    const won = m.winner === n;
    const lost = !!m.winner && !won;
    return cn(
      "min-w-0 truncate text-sm sm:text-base",
      won ? "font-black text-paper" : lost ? "font-bold text-ash" : "font-bold text-paper/90",
      !(n === 1 ? m.team1Id : m.team2Id) && "italic text-ash",
    );
  };
  const score = (n: 1 | 2) => {
    const v = n === 1 ? m.score1 : m.score2;
    const won = m.winner === n;
    const c = n === 1 ? "rose" : "azure";
    return (
      <span
        className={cn(
          "grid h-10 w-10 -skew-x-12 place-items-center border sm:w-11",
          won
            ? c === "rose"
              ? "border-rose bg-rose text-white"
              : "border-azure bg-azure text-white"
            : c === "rose"
              ? "border-rose/40 text-rose-hi"
              : "border-azure/40 text-azure-hi",
        )}
      >
        <span className="heading-slam skew-x-12 text-xl leading-none">{v ?? "–"}</span>
      </span>
    );
  };

  return (
    <details
      style={{ "--i": Math.min(k, 8), "--s": "0.05s", "--d": "0.55s" } as React.CSSProperties}
      className="adm-match group in-left relative border border-line bg-ink transition-[border-color,box-shadow] duration-200 hover:border-paper/25 open:border-paper/30 open:shadow-[4px_4px_0_0_var(--color-rose-deep)]"
    >
      <summary className="relative flex cursor-pointer list-none items-center gap-3 py-3 pl-4 pr-3 [&::-webkit-details-marker]:hidden">
        <span className={cn("absolute inset-y-0 left-0 w-1", tone)} aria-hidden />
        <span className="hidden w-24 shrink-0 flex-col gap-1 md:flex">
          <span className="num text-[0.65rem] font-bold text-ash">{m.id}</span>
          <span
            className={cn(
              "w-fit -skew-x-12 px-1.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wider",
              status === "done"
                ? "bg-balkan/15 text-balkan"
                : status === "live"
                  ? "bg-rose/15 text-rose-hi"
                  : status === "soon"
                    ? "bg-azure/15 text-azure-hi"
                    : "bg-line/60 text-ash",
            )}
          >
            <span className="inline-block skew-x-12">{t.admin.mStatus[status]}</span>
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:hidden">
          {([1, 2] as const).map((n) => (
            <span key={n} className="flex items-center gap-2.5">
              <span className={cn("h-5 w-1 shrink-0", n === 1 ? "bg-rose" : "bg-azure")} aria-hidden />
              <span className={cn(side(n), "flex-1")}>{name(n === 1 ? m.team1Id : m.team2Id)}</span>
              {score(n)}
            </span>
          ))}
          <span className="num flex items-center gap-1.5 pl-3.5 text-[0.7rem] text-ash">
            <CalendarClock className="size-3" />
            {m.startsAt ? fmtSofia(m.startsAt, locale) : t.common.tbd}
            <span className="ml-auto font-black uppercase">{t.admin.mStatus[status]}</span>
          </span>
        </span>

        <span className="hidden min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:grid">
          <span className="flex min-w-0 items-center justify-end gap-2">
            <span className={side(1)}>{name(m.team1Id)}</span>
            <span className="h-5 w-1 shrink-0 bg-rose" aria-hidden />
          </span>
          <span className="flex items-center gap-1.5">
            {score(1)}
            <span className="text-[0.6rem] font-black uppercase text-ash">vs</span>
            {score(2)}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-5 w-1 shrink-0 bg-azure" aria-hidden />
            <span className={side(2)}>{name(m.team2Id)}</span>
          </span>
        </span>

        <span className="hidden w-44 shrink-0 flex-col items-end gap-1 text-xs lg:flex">
          <span className={cn("num flex items-center gap-1.5", m.startsAt ? "text-paper/85" : "text-ash")}>
            <CalendarClock className="size-3.5 text-ash" />
            {m.startsAt ? fmtSofia(m.startsAt, locale) : t.common.tbd}
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

        <span className="grid size-8 shrink-0 -skew-x-12 place-items-center border border-line text-ash transition-colors group-hover:border-paper/40 group-hover:text-paper group-open:border-rose group-open:bg-rose group-open:text-white">
          <ChevronDown className="size-4 skew-x-12 transition-transform duration-300 group-open:rotate-180" aria-hidden />
        </span>
      </summary>

      <div className="border-t border-line bg-[linear-gradient(180deg,rgb(255_255_255/0.015),transparent)] p-3.5 sm:p-4">
        <ActionForm key={JSON.stringify(m)} action={saveMatch.bind(null, m.id)} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <fieldset className={group}>
              <Legend>{t.admin.secResult}</Legend>
              <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-x-3 gap-y-3">
                <label className={label}>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 bg-rose" /> {t.admin.teamN(1)}
                  </span>
                  <Dropdown name="team1Id" defaultValue={m.team1Id ?? ""} options={[{ value: "", label: t.common.tbd }, ...teams.map((x) => ({ value: x.id, label: x.name }))]} />
                </label>
                <label className={label}>
                  {t.admin.scoreShort}
                  <Field type="number" name="score1" min={0} max={99} defaultValue={m.score1 ?? ""} className={cn(inputCls, "text-center")} />
                </label>
                <label className={cn(label, "col-start-2 row-start-2")}>
                  {t.admin.scoreShort}
                  <Field type="number" name="score2" min={0} max={99} defaultValue={m.score2 ?? ""} className={cn(inputCls, "text-center")} />
                </label>
                <label className={cn(label, "col-start-1 row-start-2")}>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 bg-azure" /> {t.admin.teamN(2)}
                  </span>
                  <Dropdown name="team2Id" defaultValue={m.team2Id ?? ""} options={[{ value: "", label: t.common.tbd }, ...teams.map((x) => ({ value: x.id, label: x.name }))]} />
                </label>
                <label className={cn(label, "col-span-2")}>
                  {t.admin.winner}
                  <Dropdown
                    name="winner"
                    defaultValue="auto"
                    options={[
                      { value: "auto", label: t.admin.winnerAuto },
                      { value: "1", label: name(m.team1Id), color: "var(--color-rose)" },
                      { value: "2", label: name(m.team2Id), color: "var(--color-azure)" },
                      { value: "none", label: t.admin.winnerNone },
                    ]}
                  />
                </label>
              </div>
              {f.feed[m.id] && (
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-xs font-bold uppercase tracking-wide text-paper/85">
                  <input type="checkbox" name="manual" defaultChecked={m.manual} className="size-4 accent-rose" />
                  {t.admin.lockTeams}
                </label>
              )}
            </fieldset>

            <fieldset className={group}>
              <Legend>{t.admin.secStaff}</Legend>
              <div className="grid grid-cols-2 gap-3">
                <label className={cn(label, "col-span-2")}>
                  {t.admin.startsAt}
                  <Field type="datetime-local" name="startsAt" defaultValue={toSofiaInput(m.startsAt)} className={dateCls} />
                </label>
                <label className={label}>
                  {t.admin.referee}
                  <Field name="referee" maxLength={120} defaultValue={m.referee ?? ""} className={inputCls} />
                </label>
                <label className={label}>
                  {t.admin.streamer}
                  <Field name="streamer" maxLength={120} defaultValue={m.streamer ?? ""} className={inputCls} />
                </label>
                <label className={cn(label, "col-span-2")}>
                  {t.admin.commentators}
                  <Field name="commentators" maxLength={120} defaultValue={m.commentators ?? ""} className={inputCls} />
                </label>
              </div>
            </fieldset>
          </div>

          <fieldset className={group}>
            <Legend>{t.admin.secLinks}</Legend>
            <div className="grid gap-3 md:grid-cols-2">
              <label className={label}>
                {t.admin.mpLinks}
                <Field name="mpLinks" defaultValue={mp.map((x) => osuMp(x)).join(", ")} className={inputCls} />
              </label>
              <label className={label}>
                {t.admin.vodUrl}
                <Field name="vodUrl" maxLength={300} placeholder="https://…" defaultValue={m.vodUrl ?? ""} className={inputCls} />
              </label>
            </div>
          </fieldset>
        </ActionForm>

        {mp.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-line pt-4">
            <Link
              href={`/admin/matches/${matchSlug(f, m.id)}`}
              className="lift-sm inline-flex min-h-10 -skew-x-12 items-center bg-balkan px-4 text-xs font-black uppercase tracking-wide text-ink hover:bg-paper"
            >
              <span className="skew-x-12">{t.admin.ms.open}</span>
            </Link>
            <ActionForm action={clearCache.bind(null, m.id)} submit={t.admin.clearCache} ghost />
          </div>
        )}
      </div>
    </details>
  );
}
