import { forbidden } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageTitle } from "@/components/site/page-title";
import { Panel } from "@/components/admin/form";
import { CopyLink } from "@/components/admin/copy-link";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { userPath } from "@/lib/data";
import { fill } from "@/lib/dates";
import { overlayUrl } from "@/lib/links";
import { getFormat } from "@/db/edition";
import { overlayName } from "@/db/stream";
import { HelperLink, HelperPoll, HelperStatus } from "@/components/admin/link-gate";
import { helperView } from "@/lib/helper-sig";
import { SlantBg } from "@/components/site/slant";

export const dynamic = "force-dynamic";

export default async function Overlay() {
  const [t, viewer] = await Promise.all([getDict(), getViewer()]);
  if (!viewer || !can(viewer.roles, "overlay")) forbidden();
  const [{ app, online, sig }, name] = await Promise.all([helperView(viewer.osuId), overlayName(viewer.osuId)]);
  const o = t.admin.overlay;
  const url = overlayUrl(userPath(name ?? String(viewer.osuId)));
  let i = 1;

  return (
    <>
      <PageTitle mark="layers">{t.admin.menu.overlay}</PageTitle>
      <HelperPoll sig={sig} />
      <div className="grid max-w-3xl gap-6">
        <HelperLink linked={!!app} i={i++} />
        <Panel title={o.link} i={i++}>
          <div className="grid gap-4">
            <CopyLink url={url} />
            <a href="/overlay/demo" target="_blank" rel="noopener noreferrer" className="group relative isolate inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-display font-bold text-paper">
              <SlantBg className="border border-line group-hover:border-rose" /><ExternalLink className="size-4" />{o.test}
            </a>
          </div>
        </Panel>
        <Panel title={o.helper} i={i++}>
          <HelperStatus linked={!!app} online={online} state />
        </Panel>
        <Panel title={o.setup} i={i++}>
          <ol className="grid gap-3">
            {o.steps.map((s, n) => (
              <li key={n} className="flex items-baseline gap-3 text-sm text-paper/90">
                <span className="num w-5 shrink-0 text-right font-black text-rose-hi">{n + 1}</span>
                <span>{fill(s, { team: String(getFormat().teamSize) })}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
