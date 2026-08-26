import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page";
import { ActionForm, inputCls, labelCls, Panel } from "@/components/admin/form";
import { getSponsors } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { addSponsor, wipeTestData } from "./actions";
import { PackUploader } from "./pack-uploader";
import { SponsorList } from "./sponsor-list";

export default async function AdminSite() {
  const [t, lang, viewer, sponsors, stages] = await Promise.all([getDict(), getLang(), getViewer(), getSponsors(), getPoolStages()]);
  if (!can(viewer?.role, "phase")) notFound();

  return (
    <>
      <PageTitle>{t.admin.menu.site}</PageTitle>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Panel title={t.admin.packs} help={t.admin.packsHelp}>
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
