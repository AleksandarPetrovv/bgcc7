import { notFound } from "next/navigation";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
import { getSettings } from "@/db/settings";
import { getSponsors } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { LINK_KEYS } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { addSponsor, deleteSponsor, saveLinks, updateSponsor, wipeTestData } from "./actions";

const label = "flex flex-col gap-1 text-xs font-bold uppercase text-ash";

export default async function AdminSite() {
  const [t, viewer, settings, sponsors] = await Promise.all([getDict(), getViewer(), getSettings(), getSponsors()]);
  if (!can(viewer?.role, "phase")) notFound();

  return (
    <>
      <h1 className="heading-slam mb-6 text-4xl sm:text-5xl">{t.admin.menu.site}</h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title={t.admin.links} help={t.admin.linksHelp}>
          <ActionForm action={saveLinks} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {LINK_KEYS.map((k) => (
                <label key={k} className={label}>
                  {t.admin.linkNames[k]}
                  <input name={k} maxLength={500} placeholder="https://…" defaultValue={settings.links[k] ?? ""} className={inputCls} />
                </label>
              ))}
            </div>
          </ActionForm>
        </Panel>

        <Panel title={t.admin.sponsors}>
          <ActionForm action={addSponsor} submit={t.admin.add} className="mb-5 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className={label}>
                {t.admin.sponsorName}
                <input name="name" required maxLength={60} className={inputCls} />
              </label>
              <label className={label}>
                {t.admin.sponsorImage}
                <input name="image" maxLength={500} placeholder="https://…" className={inputCls} />
              </label>
              <label className={label}>
                {t.admin.sponsorUrl}
                <input name="url" maxLength={500} placeholder="https://…" className={inputCls} />
              </label>
            </div>
          </ActionForm>
          <div className="space-y-2">
            {sponsors.map((s, i) => (
              <div key={s.id} className="flex flex-col gap-3 border border-line p-3 sm:flex-row sm:items-end">
                <ActionForm key={JSON.stringify(s)} action={updateSponsor.bind(null, s.id)} className="flex flex-1 flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_4rem]">
                    <input name="name" required maxLength={60} defaultValue={s.name} aria-label={t.admin.sponsorName} className={inputCls} />
                    <input name="image" maxLength={500} defaultValue={s.image} placeholder={t.admin.sponsorImage} aria-label={t.admin.sponsorImage} className={inputCls} />
                    <input name="url" maxLength={500} defaultValue={s.url ?? ""} placeholder={t.admin.sponsorUrl} aria-label={t.admin.sponsorUrl} className={inputCls} />
                    <input type="number" name="order" min={0} max={999} defaultValue={i} aria-label={t.admin.order} className={inputCls} />
                  </div>
                </ActionForm>
                <ActionForm action={deleteSponsor.bind(null, s.id)} submit={t.admin.remove} ghost confirm={t.admin.confirmDeleteSponsor} />
              </div>
            ))}
          </div>
        </Panel>

        {viewer?.role === "host" && (
          <Panel title={t.admin.danger} help={t.admin.wipeHelp} className={cn("border-rose/50 xl:col-span-2")}>
            <ActionForm action={wipeTestData} submit={t.admin.wipe} confirm={t.admin.confirmWipe} />
          </Panel>
        )}
      </div>
    </>
  );
}
