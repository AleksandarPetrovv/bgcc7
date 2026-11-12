import { ChevronDown, Crown, TriangleAlert } from "lucide-react";
import { forbidden } from "next/navigation";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page-title";
import { ActionForm, Panel, Field } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { getBwsLock, getRegistrations } from "@/db/registrations";
import { getSettings } from "@/db/settings";
import { getMatches, getTeams } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { fmtNum } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { forfeitsOf, nextMatchOf } from "@/lib/matches";
import { OUT_TAG } from "@/lib/out";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { placeMember, updateTeam } from "./actions";
import { generateTeams } from "./(bgcc6)/actions";
import { getFormat } from "@/db/edition";
import { rankBws } from "@/lib/bws";
import { Dropdown } from "@/components/admin/dropdown";
import { RemoveMember } from "./remove-member";
import { TeamOut } from "./team-out";
import { BwsLock } from "./bws-lock";
import { avatarPath } from "@/lib/avatar";
import { isBGCC6 } from "@/db";
import { Cascade } from "@/components/site/cascade";
import { RuleDiamond } from "@/components/site/rule";
import { SlantBg } from "@/components/site/slant";
import { bwsRanking, frozenSeeds, getPlayerSeeds } from "@/db/seeds";

const bwsGrid = "grid grid-cols-[1.5rem_minmax(0,1fr)_2.75rem_4rem] items-center gap-x-2 px-2 sm:gap-x-3 sm:px-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_6rem_4rem_6rem]";
export default async function AdminTeams() {
  const [t, viewer, teams, regs, settings, f, matches, bwsLock, frozen] = await Promise.all([getDict(), getViewer(), getTeams(), getRegistrations(), getSettings(), getFormat(), getMatches(), getBwsLock(), frozenSeeds()]);
  const drawn = frozen.length > 0;
  if (!can(viewer?.roles, "teams")) forbidden();
  const host = can(viewer?.roles, "host");
  const suiji = !isBGCC6();
  const need = f.teams * f.teamSize;
  const ranked = drawn ? await bwsRanking() : rankBws(regs.filter((r) => r.status === "approved"));
  const seedOf = await getPlayerSeeds();
  const tag = suiji ? "B#" : "Q#";
  const avg = (ids: number[]) => {
    const v = ids.map((id) => seedOf.get(id)).filter((x): x is number => typeof x === "number");
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const best = (ids: number[]) => Math.min(...ids.map((id) => seedOf.get(id) ?? Infinity));
  // same order seedBracket gives: best average seed first, best single seed breaks ties, empty teams last; disabled teams below all of them
  const sorted = [...teams].sort((a, b) => {
    const ia = a.players.map((p) => p.userId), ib = b.players.map((p) => p.userId);
    return +!!a.out - +!!b.out || (avg(ia) ?? Infinity) - (avg(ib) ?? Infinity) || best(ia) - best(ib) || a.seed - b.seed;
  });
  const showTeams = !suiji || teams.length > 0;

  const bwsPanel = suiji && (
        <Panel
          title={t.admin.bwsRanking}
          i={showTeams ? 3 : 0}
          aside={
<BwsLock locked={!!bwsLock} host={host} drawn={drawn} />}
        >
          {ranked.length === 0 ? (
            <p className="text-sm text-ash">{t.admin.noRegs}</p>
          ) : (
            <Cascade className="border-b border-line" step={0.03}>
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
                        <img src={p.avatarUrl ?? avatarPath(p.osuId)} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                        <span className="min-w-0 truncate font-display font-bold">{p.username}</span>
                      </span>
                      <span className="flex justify-center">
                        {tier ? (
                          <span
                            className={cn(
                              "heading-slam relative isolate grid h-7 w-9 place-items-center text-base leading-none text-on-fill",
                            )}
                          >
                            <SlantBg className={tier === 1 ? "bg-gold shadow-[2px_2px_0_0_var(--gold-deep)]" : "bg-silver shadow-[2px_2px_0_0_var(--silver-deep)]"} />
                            {tier === 1 ? "A" : "B"}
                          </span>
                        ) : (
                          <span className="text-ash">–</span>
                        )}
                      </span>
                      <span className="num hidden text-center text-ash sm:block">{p.rank ? `#${fmtNum(p.rank)}` : "–"}</span>
                      <span className={cn("num hidden text-center sm:block", p.badgeCount > 0 ? "text-gold-hi" : "text-paper")}>{p.badgeCount}</span>
                      <span className="num text-center font-display font-bold text-paper">{p.bws === null ? "–" : fmtNum(p.bws)}</span>
                    </li>
                  );
                })}
              </ol>
            </Cascade>
          )}
        </Panel>
  );

  return (
    <>
      <PageTitle mark="team">{t.admin.menu.teams}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={suiji ? t.admin.bwsHelp(need) : t.admin.teamsHelp(settings.qualifyCount)} d={0.15} s={0.012} />
      </p>

      {!suiji && (
        <Panel title={t.admin.generate} help={t.admin.generateHelp} className="mb-6">
          <ActionForm action={generateTeams} submit={t.admin.generate} confirm={t.admin.confirmGenerate} />
        </Panel>
      )}

      {showTeams && (
      <Panel title={t.admin.menu.teams} i={suiji ? 0 : 3}>
      {teams.length === 0 && <p className="border-b border-line py-4 text-sm text-ash">{t.admin.noTeams}</p>}
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-y-20 sm:gap-y-24">
        {sorted.map((team, n) => {
          const short = team.players.length < f.teamSize;
          const moveTo = teams.filter((o) => o.id !== team.id && o.players.length < f.teamSize);
          const gaveUp = forfeitsOf(matches, team.id);
          const forfeit = team.out || !gaveUp.length ? null : gaveUp.some((m) => !m.winner) ? "next" : "done";
          return (
          <section key={team.id} className="in-up relative border-b border-line" style={{ "--i": Math.min(n, 16), "--s": "0.08s", "--d": "0.6s" } as React.CSSProperties}>
            <RuleDiamond />
            <details className="group/team">
            <summary className="group/sum flex cursor-pointer list-none items-center gap-3 pb-3 [&::-webkit-details-marker]:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {team.image && <img src={team.image} alt="" className="size-9 rounded-full object-cover" />}
              <span className="num text-xl text-balkan-hi">#{n + 1}</span>
              <span className="heading-slam min-w-0 truncate text-xl sm:text-2xl">{team.name}</span>
              {team.out && <span className="shrink-0 text-sm font-display font-black text-rose-hi">{OUT_TAG[team.out]}</span>}
              <span className={cn("num ml-auto flex shrink-0 items-center gap-1.5 text-sm", short ? "text-rose-hi" : "text-ash")}>
                {short && <TriangleAlert className="size-4 shrink-0" aria-hidden />}
                {team.players.length}/{f.teamSize}
              </span>
              <span className="relative isolate grid size-8 shrink-0 place-items-center text-ash transition-colors group-hover/sum:text-paper group-open/team:text-white">
                <SlantBg className="border border-line transition-colors group-hover/sum:border-paper/40 group-open/team:border-rose group-open/team:bg-rose" />
                <ChevronDown className="size-4 transition-transform duration-300 group-open/team:rotate-180" aria-hidden />
              </span>
            </summary>
            <fieldset disabled={!host} className="min-w-0 space-y-4 border-t border-line py-4 [&:disabled_label]:opacity-45 [&:disabled_input]:opacity-100! [&:disabled_:is(button,label)]:pointer-events-none">
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
                          className="group relative isolate flex h-12 min-w-0 cursor-pointer items-center px-2.5 text-ash transition-colors duration-200 hover:text-paper has-[:checked]:text-paper"
                        >
                          <SlantBg className="border border-line bg-field transition-[border-color,background-color,box-shadow] duration-200 group-hover:border-paper/40 group-has-[:checked]:border-gold group-has-[:checked]:bg-gold/10 group-has-[:checked]:shadow-[4px_4px_0_0_var(--gold-deep)] group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-rose" />
                          <input type="radio" name="captain" value={p.userId} defaultChecked={p.isCaptain} className="peer sr-only" />
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.avatar} alt="" className="size-7 shrink-0 rounded-full object-cover grayscale transition group-has-[:checked]:grayscale-0" />
                            <span className="min-w-0 flex-1 truncate text-sm font-display font-black">{p.username}</span>
                            <Crown className="size-4 shrink-0 translate-y-1 fill-current text-gold-hi opacity-0 transition-[opacity,translate] duration-300 group-has-[:checked]:translate-y-0 group-has-[:checked]:opacity-100" />
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
                    <img src={p.avatar} alt="" className="size-7 rounded-full object-cover" />
                    <span className="font-display font-bold">{p.username}</span>
                    {seedOf.has(p.userId) && <span className="num text-xs text-ash">{tag}{seedOf.get(p.userId)}</span>}
                    {p.rank > 0 && <span className="num text-xs text-ash">#{fmtNum(p.rank)}</span>}
                    <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                      {moveTo.length > 0 && (
                        <ActionForm action={placeMember} submit={t.admin.move} ghost className="flex flex-1 items-center gap-2 sm:flex-none">
                          <input type="hidden" name="osuId" value={p.userId} />
                          <Dropdown name="teamId" required placeholder={t.admin.moveTo} aria-label={t.admin.moveTo} className="w-full sm:w-44" options={moveTo.map((o) => ({ value: o.id, label: o.name, hint: `${o.players.length}/${f.teamSize}` }))} />
                        </ActionForm>
                      )}
                      <RemoveMember osuId={p.userId} captain={p.isCaptain} mates={team.players.filter((o) => o.userId !== p.userId).map((o) => ({ id: o.userId, name: o.username, avatar: o.avatar }))} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className={cn("flex flex-wrap items-end gap-3", short ? "justify-between" : "justify-center")}>
                {short && (
                  <ActionForm action={placeMember} submit={t.admin.add} ghost className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <input type="hidden" name="teamId" value={team.id} />
                    <Field name="q" required inputMode="numeric" pattern="[0-9]+" maxLength={12} autoComplete="off" placeholder={t.admin.osuId} aria-label={t.admin.addToTeam} className="w-full sm:w-56" />
                  </ActionForm>
                )}
                <TeamOut id={team.id} name={team.name} out={team.out} askOnce={nextMatchOf(matches, team.id)?.bracket === "winners"} forfeit={forfeit} />
              </div>
            </fieldset>
            </details>
          </section>
          );
        })}
      </div>
      </Panel>
      )}

      {suiji && showTeams && (
        <div className="py-8 sm:py-10" aria-hidden>
          <div className="in-wipe border-t border-line [--d:0.3s]" />
        </div>
      )}

      {bwsPanel}
    </>
  );
}
