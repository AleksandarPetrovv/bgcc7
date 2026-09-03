import { notFound } from "next/navigation";
import { InView } from "@/components/site/in-view";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
import { getQualResults } from "@/db/qualifiers";
import { getRegistrations } from "@/db/registrations";
import { getSettings } from "@/db/settings";
import { getTeams } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { fmtNum } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { createTeam, deleteTeam, generateTeams, placeMember, removeMember, updateTeam } from "./actions";

const label = "flex flex-col gap-1 text-xs font-bold uppercase text-ash";

export default async function AdminTeams() {
  const [t, viewer, teams, results, regs, settings] = await Promise.all([getDict(), getViewer(), getTeams(), getQualResults(), getRegistrations(), getSettings()]);
  if (!can(viewer?.role, "teams")) notFound();
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
          <ActionForm action={createTeam} submit={t.admin.create} className="flex flex-wrap items-center gap-3">
            <input name="name" required maxLength={40} placeholder={t.admin.teamName} aria-label={t.admin.teamName} className={cn(inputCls, "w-64")} />
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
              <span className="in-wipe heading-slam truncate text-2xl [--d:0.55s]">{team.name}</span>
              <span className="num ml-auto text-sm text-ash">{team.players.length}/3</span>
            </div>
            <div className="space-y-4 p-4">
              <ActionForm key={`${team.id}-${team.name}-${team.seed}-${team.players.map((p) => p.userId + String(p.isCaptain)).join()}`} action={updateTeam.bind(null, team.id)} className="space-y-3">
                <div className="grid gap-2">
                  <label className={label}>
                    {t.admin.teamName}
                    <input name="name" required maxLength={40} defaultValue={team.name} className={inputCls} />
                  </label>
                  <p className="self-end text-xs text-ash">{t.admin.seedLocked}</p>
                </div>
                <label className={label}>
                  {t.admin.teamImage}
                  <input name="image" maxLength={500} placeholder="https://…" defaultValue={team.players[0] && team.image === team.players[0].avatar ? "" : team.image} className={inputCls} />
                </label>
                {team.players.length > 0 && (
                  <fieldset>
                    <legend className="mb-1 text-xs font-bold uppercase text-ash">{t.common.captain}</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {team.players.map((p) => (
                        <label
                          key={p.userId}
                          className="cursor-pointer border border-line px-2 py-1.5 text-xs font-black uppercase text-ash has-[:checked]:border-rose has-[:checked]:bg-rose has-[:checked]:text-white"
                        >
                          <input type="radio" name="captain" value={p.userId} defaultChecked={p.isCaptain} className="sr-only" />
                          {p.username}
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
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {teams.length > 1 && (
                        <ActionForm action={placeMember} submit={t.admin.move} ghost className="flex items-center gap-2">
                          <input type="hidden" name="osuId" value={p.userId} />
                          <select name="teamId" defaultValue="" required aria-label={t.admin.moveTo} className={cn(inputCls, "w-40")}>
                            <option value="" disabled>
                              {t.admin.moveTo}
                            </option>
                            {teams
                              .filter((o) => o.id !== team.id)
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name} ({o.players.length})
                                </option>
                              ))}
                          </select>
                        </ActionForm>
                      )}
                      <ActionForm action={removeMember.bind(null, p.userId)} submit={t.admin.remove} ghost />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-end justify-between gap-3">
                {pool.length > 0 ? (
                  <ActionForm action={placeMember} submit={t.admin.add} ghost className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="teamId" value={team.id} />
                    <select name="osuId" defaultValue="" required aria-label={t.admin.addToTeam} className={cn(inputCls, "w-56")}>
                      <option value="" disabled>
                        {t.admin.addToTeam}
                      </option>
                      {pool.map((p) => (
                        <option key={p.osuId} value={p.osuId}>
                          {seedOf.has(p.osuId) ? `Q#${seedOf.get(p.osuId)} · ` : ""}
                          {p.username}
                        </option>
                      ))}
                    </select>
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
