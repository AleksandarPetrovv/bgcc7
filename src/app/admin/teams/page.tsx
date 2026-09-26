import { Crown } from "lucide-react";
import { notFound } from "next/navigation";
import { InView } from "@/components/site/in-view";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page";
import { ActionForm, inputCls, Panel, Field } from "@/components/admin/form";
import { getQualResults } from "@/db/qualifiers";
import { getRegistrations } from "@/db/registrations";
import { getSettings } from "@/db/settings";
import { getTeams } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { fmtNum } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { createTeam, deleteTeam, generateTeams, placeMember, updateTeam } from "./actions";
import { Dropdown } from "@/components/admin/dropdown";
import { RemoveMember } from "./remove-member";

const label = "flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors";

export default async function AdminTeams() {
  const [t, viewer, teams, results, regs, settings] = await Promise.all([getDict(), getViewer(), getTeams(), getQualResults(), getRegistrations(), getSettings()]);
  if (!can(viewer?.roles, "teams")) notFound();
  const taken = new Set(teams.flatMap((x) => x.players.map((p) => p.userId)));
  const seedOf = new Map(results.players.map((p, i) => [p.id, i + 1]));
  const pool = [
    ...results.players.map((p) => ({ osuId: p.id, username: p.username })),
    ...regs.filter((r) => r.status === "approved" && !seedOf.has(r.osuId)).map((r) => ({ osuId: r.osuId, username: r.username })),
  ].filter((p) => !taken.has(p.osuId));

  return (
    <>
      <PageTitle>{t.admin.menu.teams}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.teamsHelp(settings.qualifyCount)} d={0.15} s={0.012} />
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title={t.admin.generate} help={t.admin.generateHelp}>
          <ActionForm action={generateTeams} submit={t.admin.generate} confirm={t.admin.confirmGenerate} />
        </Panel>
        <Panel title={t.admin.newTeam} i={1}>
          <ActionForm action={createTeam} submit={t.admin.create} className="flex items-center gap-3">
            <Field name="name" required maxLength={40} placeholder={t.admin.teamName} aria-label={t.admin.teamName} className={cn(inputCls, "flex-1 sm:max-w-sm")} />
          </ActionForm>
        </Panel>
      </div>

      {teams.length === 0 && <p className="border border-line bg-coal p-4 text-sm text-ash">{t.admin.noTeams}</p>}
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {teams.map((team, n) => (
          <InView as="section" self key={team.id} className="in-flip border border-line bg-coal" style={{ "--i": n < 8 ? n % 2 : 0, "--s": "0.12s", "--d": "0.3s" } as React.CSSProperties}>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {team.image && <img src={team.image} alt="" className="in-spin size-9 object-cover [--d:0.45s]" />}
              <span className="in-slam num text-xl text-balkan [--d:0.55s]">#{team.seed}</span>
              <span className="in-wipe heading-slam min-w-0 truncate text-xl sm:text-2xl [--d:0.55s]">{team.name}</span>
              <span className="num ml-auto shrink-0 text-sm text-ash">{team.players.length}/3</span>
            </div>
            <div className="space-y-4 p-4">
              <ActionForm key={`${team.id}-${team.name}-${team.seed}-${team.players.map((p) => p.userId + String(p.isCaptain)).join()}`} action={updateTeam.bind(null, team.id)} className="space-y-3">
                <div className="grid gap-2">
                  <label className={label}>
                    {t.admin.teamName}
                    <Field name="name" required maxLength={40} defaultValue={team.name} className={inputCls} />
                  </label>
                  <p className="self-end text-xs text-ash">{t.admin.seedLocked}</p>
                </div>
                <label className={label}>
                  {t.admin.teamImage}
                  <Field name="image" maxLength={500} placeholder="https://…" defaultValue={team.players[0] && team.rawImage === team.players[0].avatar ? "" : team.rawImage} className={inputCls} />
                </label>
                {team.players.length > 0 && (
                  <fieldset>
                    <legend className="mb-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash">{t.common.captain}</legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {team.players.map((p) => (
                        <label
                          key={p.userId}
                          className="group relative flex h-12 min-w-0 -skew-x-12 cursor-pointer items-center border border-line bg-[#111412] px-2.5 text-ash transition-[border-color,background-color,box-shadow,color] duration-200 hover:border-paper/40 hover:text-paper has-[:checked]:border-[#e8c547] has-[:checked]:bg-[#e8c547]/10 has-[:checked]:text-paper has-[:checked]:shadow-[4px_4px_0_0_#9c7f1f] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose"
                        >
                          <input type="radio" name="captain" value={p.userId} defaultChecked={p.isCaptain} className="peer sr-only" />
                          <span className="flex min-w-0 flex-1 skew-x-12 items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.avatar} alt="" className="size-7 shrink-0 grayscale transition group-has-[:checked]:grayscale-0" />
                            <span className="min-w-0 flex-1 truncate text-sm font-black">{p.username}</span>
                            <Crown className="size-4 shrink-0 scale-50 fill-current text-[#e8c547] opacity-0 transition-[opacity,transform] duration-300 group-has-[:checked]:scale-100 group-has-[:checked]:opacity-100" />
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </ActionForm>

              <ul className="divide-y divide-line border border-line">
                {team.players.map((p, k) => (
                  <li key={p.userId} style={{ "--i": k, "--s": "0.08s", "--d": "0.7s" } as React.CSSProperties} className="in-left flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.avatar} alt="" className="size-7" />
                    <span className="font-bold">{p.username}</span>
                    {seedOf.has(p.userId) && <span className="num text-xs text-ash">Q#{seedOf.get(p.userId)}</span>}
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
                    <Dropdown name="osuId" required placeholder={t.admin.addToTeam} aria-label={t.admin.addToTeam} className="w-full sm:w-56" options={pool.map((p) => ({ value: String(p.osuId), label: p.username, hint: seedOf.has(p.osuId) ? `Q#${seedOf.get(p.osuId)}` : undefined }))} />
                  </ActionForm>
                ) : (
                  <span />
                )}
                <ActionForm action={deleteTeam.bind(null, team.id)} submit={t.admin.deleteTeam} ghost confirm={t.admin.confirmDeleteTeam} />
              </div>
            </div>
          </InView>
        ))}
      </div>
    </>
  );
}
