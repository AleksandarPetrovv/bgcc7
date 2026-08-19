import { notFound } from "next/navigation";
import { InView } from "@/components/site/in-view";
import { PageTitle } from "@/components/site/page";
import { ActionForm, dateCls, inputCls, Panel } from "@/components/admin/form";
import { getLobbies, type Lobby } from "@/db/lobbies";
import { getRegistrations } from "@/db/registrations";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dict";
import { can } from "@/lib/roles";
import { fmtSofiaDay, fmtSofiaTime, toSofiaInput } from "@/lib/time";
import { cn } from "@/lib/utils";
import { createLobby, deleteLobby, placePlayer, unbook, updateLobby } from "./actions";

const label = "flex flex-col gap-1 text-xs font-bold uppercase text-ash";

function LobbyFields({ t, l }: { t: Dict; l?: Lobby }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.2fr_1.3fr_0.6fr_1fr]">
      <label className={label}>
        {t.admin.lobbyName}
        <input name="name" required maxLength={40} defaultValue={l?.name} className={inputCls} />
      </label>
      <label className={label}>
        {t.admin.startsAt}
        <input type="datetime-local" name="startsAt" required defaultValue={toSofiaInput(l?.startsAt)} className={dateCls} />
      </label>
      <label className={label}>
        {t.admin.capacity}
        <input type="number" name="capacity" min={1} max={32} required defaultValue={l?.capacity ?? 8} className={inputCls} />
      </label>
      <label className={label}>
        {t.admin.referee}
        <input name="referee" maxLength={60} defaultValue={l?.referee ?? ""} className={inputCls} />
      </label>
      {l && (
        <label className={cn(label, "col-span-2 md:col-span-4")}>
          {t.admin.mpLinks}
          <input name="mpLinks" defaultValue={l.mpLinks.split(",").filter(Boolean).map((id) => `https://osu.ppy.sh/mp/${id}`).join(", ")} className={inputCls} />
        </label>
      )}
    </div>
  );
}

export default async function AdminLobbies() {
  const [t, lang, viewer, lobbies, regs] = await Promise.all([getDict(), getLang(), getViewer(), getLobbies(), getRegistrations()]);
  if (!can(viewer?.role, "lobbies")) notFound();
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const booked = new Set(lobbies.flatMap((l) => l.players.map((p) => p.osuId)));
  const approved = regs.filter((r) => r.status === "approved");
  const free = approved.filter((r) => !booked.has(r.osuId));

  return (
    <>
      <PageTitle>{t.admin.menu.lobbies}</PageTitle>

      <Panel title={t.admin.newLobby} className="mb-6">
        <ActionForm action={createLobby} submit={t.admin.create} className="space-y-4">
          <LobbyFields t={t} />
        </ActionForm>
      </Panel>

      {free.length > 0 && (
        <p className="in-left mb-4 border border-line bg-coal px-4 py-3 text-sm [--d:0.35s]">
          <span className="font-black text-rose-hi">{t.admin.notBooked(free.length)}:</span>{" "}
          <span className="text-ash">{free.map((r) => r.username).join(", ")}</span>
        </p>
      )}

      <div className="space-y-4">
        {lobbies.map((l, n) => (
          <InView as="section" self key={l.id} className="in-up border border-line bg-coal" style={{ "--i": n < 6 ? n : 0, "--s": "0.1s", "--d": "0.3s" } as React.CSSProperties}>
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <span className="in-wipe heading-slam text-2xl [--d:0.45s]">{l.name}</span>
              <span className="in-drop num text-sm text-ash [--d:0.55s]">
                {fmtSofiaDay(l.startsAt, locale)} · {fmtSofiaTime(l.startsAt)}
              </span>
              <span className={cn("in-slam num ml-auto text-lg [--d:0.6s]", l.players.length >= l.capacity ? "text-rose-hi" : "text-balkan")}>
                {l.players.length}/{l.capacity}
              </span>
            </div>
            <div className="space-y-4 p-4">
              <ActionForm key={`${l.id}-${l.startsAt.getTime()}-${l.mpLinks}`} action={updateLobby.bind(null, l.id)} className="space-y-3">
                <LobbyFields t={t} l={l} />
              </ActionForm>

              {l.players.length > 0 && (
                <ul className="divide-y divide-line border border-line">
                  {l.players.map((p, k) => (
                    <li key={p.osuId} style={{ "--i": k, "--s": "0.05s", "--d": "0.7s" } as React.CSSProperties} className="in-left flex flex-wrap items-center gap-3 px-3 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.avatarUrl && <img src={p.avatarUrl} alt="" className="in-pop size-7 [--d:0.8s]" />}
                      <span className="font-bold">{p.username}</span>
                      <div className="ml-auto flex flex-wrap items-center gap-2">
                        {lobbies.length > 1 && (
                          <ActionForm action={placePlayer} submit={t.admin.move} ghost className="flex items-center gap-2">
                            <input type="hidden" name="osuId" value={p.osuId} />
                            <select name="lobbyId" defaultValue="" required aria-label={t.admin.moveTo} className={cn(inputCls, "h-10 w-40")}>
                              <option value="" disabled>
                                {t.admin.moveTo}
                              </option>
                              {lobbies
                                .filter((o) => o.id !== l.id)
                                .map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.name} ({o.players.length}/{o.capacity})
                                  </option>
                                ))}
                            </select>
                          </ActionForm>
                        )}
                        <ActionForm action={unbook.bind(null, p.osuId)} submit={t.admin.unbook} ghost />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-end justify-between gap-3">
                {free.length > 0 ? (
                  <ActionForm action={placePlayer} submit={t.admin.addToLobby} ghost className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="lobbyId" value={l.id} />
                    <select name="osuId" defaultValue="" required aria-label={t.admin.addToLobby} className={cn(inputCls, "w-56")}>
                      <option value="" disabled>
                        {t.admin.addToLobby}
                      </option>
                      {free.map((r) => (
                        <option key={r.osuId} value={r.osuId}>
                          {r.username}
                        </option>
                      ))}
                    </select>
                  </ActionForm>
                ) : (
                  <span />
                )}
                <ActionForm action={deleteLobby.bind(null, l.id)} submit={t.admin.deleteLobby} ghost confirm={t.admin.confirmDeleteLobby} />
              </div>
            </div>
          </InView>
        ))}
      </div>
    </>
  );
}
