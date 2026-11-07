import { notFound } from "next/navigation";
import { Download, ExternalLink, Link2, Unlink } from "lucide-react";
import { PageTitle, SlantButton } from "@/components/site/page";
import { ActionForm, Field, Panel, labelCls } from "@/components/admin/form";
import { CopyLink } from "@/components/admin/copy-link";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { appOf, appRunning } from "@/lib/relay";
import { userPath } from "@/lib/data";
import { fill } from "@/lib/dates";
import { siteUrl } from "@/lib/links";
import { cn } from "@/lib/utils";
import { getFormat } from "@/db/edition";
import { overlayName } from "@/db/stream";
import { linkHelper, unlinkHelper } from "./actions";
import { HelperPoll, LinkGate } from "../helper/link-gate";
import { helperSig } from "@/lib/helper-sig";

export const dynamic = "force-dynamic";

export default async function Overlay() {
  const [t, viewer] = await Promise.all([getDict(), getViewer()]);
  if (!viewer || !can(viewer.roles, "overlay")) notFound();
  const [app, name, sig] = await Promise.all([appOf(viewer.osuId), overlayName(viewer.osuId), helperSig(viewer.osuId)]);
  const online = appRunning(viewer.osuId);
  const o = t.admin.overlay;
  const r = t.admin.refApp;
  const url = `${siteUrl()}/overlay/${userPath(name ?? String(viewer.osuId))}`;
  let i = 1;

  return (
    <>
      <PageTitle mark="layers">{t.admin.menu.overlay}</PageTitle>
      <HelperPoll sig={sig} />
      <div className="grid max-w-3xl gap-6">
        <LinkGate linked={!!app}>
          <Panel title={r.linkTitle} i={i++}>
            <ActionForm action={linkHelper} submit={r.link} icon={<Link2 className="size-4" />} className="flex flex-wrap items-end gap-3">
              <label className={labelCls}>
                {r.linkCode}
                <Field name="code" required maxLength={64} autoComplete="off" spellCheck={false} className="w-64" />
              </label>
            </ActionForm>
          </Panel>
        </LinkGate>
        <Panel title={o.link} i={i++}>
          <div className="grid gap-4">
            <CopyLink url={url} />
            <a href="/overlay/demo" target="_blank" rel="noopener noreferrer" className="group relative isolate inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-display font-bold text-paper">
              <span aria-hidden className="absolute inset-0 -z-10 -skew-x-12 border border-line group-hover:border-rose" /><ExternalLink className="size-4" />{o.test}
            </a>
          </div>
        </Panel>
        <Panel title={o.helper} i={i++}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2.5 text-sm font-display font-bold">
              <span className={cn("size-2.5 rotate-45", online ? "bg-balkan" : app ? "bg-gold" : "bg-line")} aria-hidden />
              <span className={online ? "text-paper" : "text-ash"}>{online ? r.online : app ? r.offline : r.none}</span>
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-3">
              <SlantButton href="/download/helper" download tone="rose">
                <Download className="size-4" /> {r.download}
              </SlantButton>
              {app && <ActionForm action={unlinkHelper} submit={r.unlink} ghost confirm={r.unlinkAsk} icon={<Unlink className="size-3.5" />} />}
            </span>
          </div>
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
