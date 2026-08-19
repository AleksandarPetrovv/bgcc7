import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page";
import { ActionForm, inputCls, labelCls, Panel } from "@/components/admin/form";
import { getSettings } from "@/db/settings";
import { getSponsors } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { LINK_KEYS } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { addSponsor, saveLinks, wipeTestData } from "./actions";
import { PackUploader } from "./pack-uploader";
import { SponsorList } from "./sponsor-list";

export default async function AdminSite() {
  const [t, lang, viewer, settings, sponsors, stages] = await Promise.all([getDict(), getLang(), getViewer(), getSettings(), getSponsors(), getPoolStages()]);
  if (!can(viewer?.role, "phase")) notFound();

  return (
    <>
      <PageTitle>{t.admin.menu.site}</PageTitle>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Panel title={t.admin.links} help={t.admin.linksHelp}>
            <ActionForm action={saveLinks} className="space-y-4">
              {LINK_KEYS.map((k) => (
                <label key={k} className={labelCls}>
                  {t.admin.linkNames[k]}
                  <input name={k} maxLength={500} placeholder="https://…" defaultValue={settings.links[k] ?? ""} className={inputCls} />
                </label>
              ))}
            </ActionForm>
          </Panel>

          <Panel title={t.admin.packs} help={t.admin.packsHelp} i={2}>
            <PackUploader stages={stages.map((s) => ({ slug: s.slug, title: s.title, pack: s.pack }))} locale={lang === "bg" ? "bg-BG" : "en-GB"} />
          </Panel>
        </div>

        <Panel title={t.admin.sponsors} help={t.admin.sponsorHelp} i={1}>
          <ActionForm action={addSponsor} submit={t.admin.add} className="mb-5 flex flex-wrap items-end gap-3">
            <label className={cn(labelCls, "min-w-56 flex-1")}>
              {t.admin.sponsorQ}
              <input name="q" required maxLength={200} placeholder="https://osu.ppy.sh/users/…" className={inputCls} />
            </label>
          </ActionForm>
          <SponsorList key={sponsors.map((s) => `${s.id}:${s.name}`).join()} sponsors={sponsors} />
        </Panel>

        {viewer?.role === "host" && (
          <Panel title={t.admin.danger} help={t.admin.wipeHelp} className="border-rose/50 xl:col-span-2" i={3}>
            <ActionForm action={wipeTestData} submit={t.admin.wipe} confirm={t.admin.confirmWipe} />
          </Panel>
        )}
      </div>
    </>
  );
}
