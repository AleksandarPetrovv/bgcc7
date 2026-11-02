import { Crown } from "lucide-react";
import { notFound } from "next/navigation";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page";
import { ActionForm, Panel, Field } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { getQualResults } from "@/db/qualifiers";
import { getBwsLock, getRegistrations } from "@/db/registrations";
import { fmtSofia } from "@/lib/time";
import { getSettings } from "@/db/settings";
import { getTeams } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { fmtNum } from "@/lib/data";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { createTeam, deleteTeam, seedTeams, generateTeams, placeMember, setBadges, updateTeam } from "./actions";
import { getFormat } from "@/db/edition";
import { rankBws } from "@/lib/bws";
import { Dropdown } from "@/components/admin/dropdown";
import { RemoveMember } from "./remove-member";
import { avatarPath } from "@/lib/avatar";
import { isBGCC6 } from "@/db";
import { Cascade } from "@/components/site/cascade";
import { RuleDiamond } from "@/components/site/rule";
import { localeOf } from "@/lib/i18n/locale";
import { getPlayerSeeds } from "@/db/seeds";

const bwsGrid = "grid grid-cols-[1.5rem_minmax(0,1fr)_2.75rem_4rem] items-center gap-x-2 px-2 sm:gap-x-3 sm:px-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_6rem_10rem_6rem]";
export default async function AdminTeams() {
  const [t, lang, viewer, teams, results, regs, settings, f, locked] = await Promise.all([getDict(), getLang(), getViewer(), getTeams(), getQualResults(), getRegistrations(), getSettings(), getFormat(), getBwsLock()]);
  if (!can(viewer?.roles, "teams")) notFound();
  const suiji = !isBGCC6();
  const need = f.teams * f.teamSize;
  const ranked = rankBws(regs.filter((r) => r.status === "approved"));
  const taken = new Set(teams.flatMap((x) => x.players.map((p) => p.userId)));
  const seedOf = await getPlayerSeeds();
  const tag = suiji ? "B#" : "Q#";
  const pool = (
    suiji
      ? ranked.map((p) => ({ osuId: p.osuId, username: p.username }))
      : [
          ...results.players.map((p) => ({ osuId: p.id, username: p.username })),
          ...regs.filter((r) => r.status === "approved" && !seedOf.has(r.osuId)).map((r) => ({ osuId: r.osuId, username: r.username })),
        ]
  ).filter((p) => !taken.has(p.osuId));
  const avg = (ids: number[]) => {
    const v = ids.map((id) => seedOf.get(id)).filter((x): x is number => typeof x === "number");
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  return (
    <>
      <PageTitle mark="team">{t.admin.menu.teams}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={suiji ? t.admin.bwsHelp(need) : t.admin.teamsHelp(settings.qualifyCount)} d={0.15} s={0.012} />
      </p>

      {suiji && (
        <Panel title={t.admin.bwsRanking} className="mb-6">
          <p className={cn("mb-3 text-xs font-display font-bold", locked ? "text-balkan-hi" : "text-ash")}>
            {locked ? t.admin.bwsLocked(fmtSofia(locked, localeOf(lang))) : t.admin.bwsLive}
          </p>
          {ranked.length === 0 ? (
            <p className="text-sm text-ash">{t.admin.noRegs}</p>
          ) : (
            <Cascade className="border-y border-line" step={0.03}>
              <div className={cn(bwsGrid, "border-b border-line py-2 text-[0.62rem] font-display font-bold text-ash")}>
                <span className="text-right">#</span>
                <span>{t.admin.player}</span>
                <span className="text-center">{t.admin.tierCol}</span>
                <span className="hidden text-center sm:block">{t.admin.globalRank}</span>
                <span className="hidden text-center sm:block">{t.admin.badges}</span>
                <span className="text-center">BWS</span>
              </div>
              <ol className="divide-y divide-line">
                {ranked.map((p, i) => {
                  const tier = p.bws === null || i >= need ? 0 : i < f.teams ? 1 : 2;
                  return (
                    <li key={p.osuId} data-cascade className={cn(bwsGrid, "in-left py-1.5 text-sm", tier === 0 && "opacity-45")}>
                      <span className={cn("num text-right text-base", tier ? "text-paper" : "text-ash")}>{p.bws === null ? "–" : i + 1}</span>
                      <span className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.avatarUrl ?? avatarPath(p.osuId)} alt="" className="size-7 shrink-0" />
                        <span className="min-w-0 truncate font-display font-bold">{p.username}</span>
                      </span>
                      <span className="flex justify-center">
                        {tier ? (
                          <span
                            className={cn(
                              "heading-slam grid h-7 w-9 -skew-x-12 place-items-center text-base leading-none",
                              tier === 1 ? "bg-gold text-on-fill shadow-[2px_2px_0_0_var(--gold-deep)]" : "bg-silver text-on-fill shadow-[2px_2px_0_0_var(--silver-deep)]",
                            )}
                          >
                            <span className="skew-x-12">{tier === 1 ? "A" : "B"}</span>
                          </span>
                        ) : (
                          <span className="text-ash">–</span>
                        )}
                      </span>
                      <span className="num hidden text-center text-ash sm:block">{p.rank ? `#${fmtNum(p.rank)}` : "–"}</span>
                      <ActionForm key={`${p.osuId}-${p.badgeOverride}`} action={setBadges.bind(null, p.osuId)} submit="✓" ghost className="relative hidden items-center justify-center sm:flex [&>div]:absolute [&>div]:left-[calc(50%+2.25rem)] [&>div]:flex-nowrap">
                        <Field
                          name="badges"
                          type="number"
                          min={0}
                          max={99}
                          defaultValue={p.badgeOverride ?? p.badges ?? 0}
                          aria-label={`${t.admin.badges} · ${p.username}`}
                          title={p.badgeOverride !== null ? t.admin.badgesEdited(p.badges ?? 0) : undefined}
                          className={cn("num w-14 text-center", p.badgeOverride !== null && "[&_input]:text-gold-hi")}
                        />
                      </ActionForm>
                      <span className="num text-center font-display font-bold text-paper">{p.bws === null ? "–" : fmtNum(p.bws)}</span>
                    </li>
                  );
                })}
              </ol>
            </Cascade>
          )}
        </Panel>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {suiji ? (
          <Panel title={t.admin.draw} help={t.admin.drawHelp}>
            {teams.length !== f.teams && <p className="mb-3 text-xs font-display font-bold text-rose-hi">{t.admin.teamsNeeded(teams.length, f.teams)}</p>}
            <ActionForm action={seedTeams} submit={t.admin.draw} confirm={t.admin.confirmDraw} />
          </Panel>
        ) : (
          <Panel title={t.admin.generate} help={t.admin.generateHelp}>
            <ActionForm action={generateTeams} submit={t.admin.generate} confirm={t.admin.confirmGenerate} />
          </Panel>
        )}
        <Panel title={t.admin.newTeam} i={1}>
          <ActionForm action={createTeam} submit={t.admin.create} className="flex items-center gap-3">
            <Field name="name" required maxLength={40} placeholder={t.admin.teamName} aria-label={t.admin.teamName} className="flex-1 sm:max-w-sm" />
          </ActionForm>
        </Panel>
      </div>

      {teams.length === 0 && <p className="border-b border-line py-4 text-sm text-ash">{t.admin.noTeams}</p>}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 2xl:grid-cols-2">
        {teams.map((team, n) => (
          <section key={team.id} className="in-up relative border-b border-line" style={{ "--i": Math.min(n, 16), "--s": "0.07s", "--d": "0.2s" } as React.CSSProperties}>
            <RuleDiamond />
            <div className="flex items-center gap-3 border-b border-line pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {team.image && <img src={team.image} alt="" className="size-9 object-cover" />}
              <span className="num text-xl text-balkan-hi">#{team.seed}</span>
              <span className="heading-slam min-w-0 truncate text-xl sm:text-2xl">{team.name}</span>
              {suiji && avg(team.players.map((p) => p.userId)) !== null && (
                <span className="num ml-auto shrink-0 text-xs text-ash">
                  {t.admin.avgBws} {avg(team.players.map((p) => p.userId))}
                </span>
              )}
              <span className={cn("num shrink-0 text-sm text-ash", !suiji && "ml-auto")}>
                {team.players.length}/{f.teamSize}
              </span>
            </div>
            <div className="space-y-4 py-4">
              <ActionForm key={`${team.id}-${team.name}-${team.seed}-${team.players.map((p) => p.userId + String(p.isCaptain)).join()}`} action={updateTeam.bind(null, team.id)} className="space-y-3">
                <div className="grid gap-2">
                  <label className={labelCls}>
                    {t.admin.teamName}
                    <Field name="name" required maxLength={40} defaultValue={team.name} />
                  </label>
                  <p className="self-end text-xs text-ash">{t.admin.seedLocked}</p>
                </div>
                <label className={labelCls}>
                  {t.admin.teamImage}
                  <Field name="image" maxLength={500} placeholder="https://…" defaultValue={team.players[0] && team.rawImage === team.players[0].avatar ? "" : team.rawImage} />
                </label>
                {team.players.length > 0 && (
                  <fieldset>
                    <legend className="mb-1.5 text-[0.68rem] font-display font-bold text-ash">{t.common.captain}</legend>
                    <div className={cn("grid grid-cols-1 gap-2", suiji ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
                      {team.players.map((p) => (
                        <label
                          key={p.userId}
                          className="group relative flex h-12 min-w-0 -skew-x-12 cursor-pointer items-center border border-line bg-field px-2.5 text-ash transition-[border-color,background-color,box-shadow,color] duration-200 hover:border-paper/40 hover:text-paper has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:checked]:text-paper has-[:checked]:shadow-[4px_4px_0_0_var(--gold-deep)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose"
                        >
                          <input type="radio" name="captain" value={p.userId} defaultChecked={p.isCaptain} className="peer sr-only" />
                          <span className="flex min-w-0 flex-1 skew-x-12 items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.avatar} alt="" className="size-7 shrink-0 grayscale transition group-has-[:checked]:grayscale-0" />
                            <span className="min-w-0 flex-1 truncate text-sm font-display font-black">{p.username}</span>
                            <Crown className="size-4 shrink-0 scale-50 fill-current text-gold-hi opacity-0 transition-[opacity,transform,translate,scale,rotate] duration-300 group-has-[:checked]:scale-100 group-has-[:checked]:opacity-100" />
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </ActionForm>

              <ul className="divide-y divide-line border-y border-line">
                {team.players.map((p) => (
                  <li key={p.userId} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.avatar} alt="" className="size-7" />
                    <span className="font-display font-bold">{p.username}</span>
                    {seedOf.has(p.userId) && <span className="num text-xs text-ash">{tag}{seedOf.get(p.userId)}</span>}
                    {p.rank > 0 && <span className="num text-xs text-ash">#{fmtNum(p.rank)}</span>}
                    <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                      {teams.length > 1 && (
                        <ActionForm action={placeMember} submit={t.admin.move} ghost className="flex flex-1 items-center gap-2 sm:flex-none">
                          <input type="hidden" name="osuId" value={p.userId} />
                          <Dropdown name="teamId" required placeholder={t.admin.moveTo} aria-label={t.admin.moveTo} className="w-full sm:w-44" options={teams.filter((o) => o.id !== team.id).map((o) => ({ value: o.id, label: o.name, hint: String(o.players.length) }))} />
                        </ActionForm>
                      )}
                      <RemoveMember osuId={p.userId} captain={p.isCaptain} mates={team.players.filter((o) => o.userId !== p.userId).map((o) => ({ id: o.userId, name: o.username, avatar: o.avatar }))} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-end justify-between gap-3">
                {pool.length > 0 ? (
                  <ActionForm action={placeMember} submit={t.admin.add} ghost className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <input type="hidden" name="teamId" value={team.id} />
                    <Dropdown name="osuId" required placeholder={t.admin.addToTeam} aria-label={t.admin.addToTeam} className="w-full sm:w-56" options={pool.map((p) => ({ value: String(p.osuId), label: p.username, hint: seedOf.has(p.osuId) ? `${tag}${seedOf.get(p.osuId)}` : undefined }))} />
                  </ActionForm>
                ) : (
                  <span />
                )}
                <ActionForm action={deleteTeam.bind(null, team.id)} submit={t.admin.deleteTeam} ghost confirm={t.admin.confirmDeleteTeam} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
