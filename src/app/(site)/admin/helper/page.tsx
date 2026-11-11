import { forbidden } from "next/navigation";
import { helperView } from "@/lib/helper-sig";
import { HelperLink, HelperPoll, HelperStatus } from "@/components/admin/link-gate";
import { PageTitle } from "@/components/site/page-title";
import { Panel } from "@/components/admin/form";
import { getViewer, helperAccess } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { Cascade } from "@/components/site/cascade";
import { getLang } from "@/lib/i18n/server";
import { localeOf } from "@/lib/i18n/locale";
import { HelperTiles } from "@/components/admin/helper-tiles";

export const dynamic = "force-dynamic";

export default async function HelperPage() {
  const [t, viewer] = await Promise.all([getDict(), getViewer()]);
  const access = viewer && helperAccess(viewer.roles);
  if (!viewer || !access?.any) forbidden();
  const { ref, stream: streamer } = access;
  const [h, lang] = await Promise.all([helperView(viewer.osuId), getLang()]);
  const { app, online, sig } = h;
  const locale = localeOf(lang);

  return (
    <>
      <PageTitle mark="whistle">{t.admin.menu.helper}</PageTitle>
      <HelperPoll sig={sig} />
      <Cascade className="grid max-w-3xl gap-6 [--d:0.35s]" step={0.08}>
        <HelperLink linked={!!app} i={1} />
        <Panel
          title={t.admin.menu.helper}
          i={2}
          aside={<HelperStatus linked={!!app} online={online} />}
        >
          <HelperTiles t={t} locale={locale} h={h} referee={ref} streamer={streamer} />
        </Panel>
      </Cascade>
    </>
  );
}
