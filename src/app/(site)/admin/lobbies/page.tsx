import { notFound } from "next/navigation";
import { getFormat } from "@/db/edition";
import { InView } from "@/components/site/in-view";
import { PageTitle } from "@/components/site/page";
import { ActionForm, dateCls, inputCls, Panel, Field } from "@/components/admin/form";
import { getLobbies, type Lobby } from "@/db/lobbies";
import { getRegistrations } from "@/db/registrations";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dict";
import { can } from "@/lib/roles";
import { fmtSofiaDay, fmtSofiaTime, nextHour, toSofiaInput } from "@/lib/time";
import { cn } from "@/lib/utils";
import { createLobby, deleteLobby, placePlayer, unbook, updateLobby } from "./actions";
import { Dropdown } from "@/components/admin/dropdown";
import { osuMp } from "@/lib/links";

const label = "flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors";

function LobbyFields({ t, l }: { t: Dict; l?: Lobby }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.3fr_0.6fr_1fr]">
      <label className={label}>
        {t.admin.lobbyName}
        <Field name="name" required maxLength={40} defaultValue={l?.name} className={inputCls} />
      </label>
      <label className={label}>
        {t.admin.startsAt}
        <Field type="datetime-local" name="startsAt" required defaultValue={toSofiaInput(l?.startsAt ?? nextHour())} className={dateCls} />
      </label>
      <label className={label}>
        {t.admin.capacity}
        <Field type="number" name="capacity" min={1} max={32} required defaultValue={l?.capacity ?? 8} className={inputCls} />
      </label>
      <label className={label}>
        {t.admin.referee}
        <Field name="referee" maxLength={60} defaultValue={l?.referee ?? ""} className={inputCls} />
      </label>
      {l && (
        <label className={cn(label, "sm:col-span-2 lg:col-span-4")}>
          {t.admin.mpLinks}
          <Field name="mpLinks" defaultValue={l.mpLinks.split(",").filter(Boolean).map((id) => osuMp(id)).join(", ")} className={inputCls} />
        </label>
      )}
    </div>
  );
}

export default async function AdminLobbies() {
  const [t, lang, viewer, lobbies, regs] = await Promise.all([getDict(), getLang(), getViewer(), getLobbies(), getRegistrations()]);
  if (!can(viewer?.roles, "lobbies") || getFormat().edition !== "bgcc6") notFound();
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
          <InView as="section" self scrub key={l.id} className="sr in-up border border-line bg-coal" style={{ "--i": n < 6 ? n : 0, "--s": "0.1s", "--d": "0.3s" } as React.CSSProperties}>
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <span className="sr in-wipe heading-slam text-2xl [--d:0.45s]">{l.name}</span>
              <span className="sr in-drop num text-sm text-ash [--d:0.55s]">
                {fmtSofiaDay(l.startsAt, locale)} · {fmtSofiaTime(l.startsAt)}
              </span>
              <span className={cn("sr in-slam num ml-auto text-lg [--d:0.6s]", l.players.length >= l.capacity ? "text-rose-hi" : "text-balkan")}>
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
                    <li key={p.osuId} style={{ "--i": k, "--s": "0.05s", "--d": "0.7s" } as React.CSSProperties} className="sr in-left flex flex-wrap items-center gap-3 px-3 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.avatarUrl && <img src={p.avatarUrl} alt="" className="sr in-pop size-7 [--d:0.8s]" />}
                      <span className="min-w-0 truncate font-bold">{p.username}</span>
                      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                        {lobbies.length > 1 && (
                          <ActionForm action={placePlayer} submit={t.admin.move} ghost className="flex flex-1 items-center gap-2 sm:flex-none">
                            <input type="hidden" name="osuId" value={p.osuId} />
                            <Dropdown name="lobbyId" required placeholder={t.admin.moveTo} aria-label={t.admin.moveTo} className="w-full sm:w-44" options={lobbies.filter((o) => o.id !== l.id).map((o) => ({ value: String(o.id), label: o.name, hint: `${o.players.length}/${o.capacity}` }))} />
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
                  <ActionForm action={placePlayer} submit={t.admin.addToLobby} ghost className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <input type="hidden" name="lobbyId" value={l.id} />
                    <Dropdown name="osuId" required placeholder={t.admin.addToLobby} aria-label={t.admin.addToLobby} className="w-full sm:w-56" options={free.map((r) => ({ value: String(r.osuId), label: r.username }))} />
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
