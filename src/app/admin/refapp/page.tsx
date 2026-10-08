import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { PageTitle, SlantButton } from "@/components/site/page";
import { ActionForm, Panel } from "@/components/admin/form";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { appOf, linkWord, relayOnline, validState } from "@/lib/relay";
import { cn } from "@/lib/utils";
import { linkApp, unlinkApp } from "./actions";

export const dynamic = "force-dynamic";

export default async function RefApp({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [t, viewer, { link }] = await Promise.all([getDict(), getViewer(), searchParams]);
  if (!viewer || !can(viewer.roles, "matches")) notFound();
  const st = typeof link === "string" && validState(link) ? link : null;
  const app = await appOf(viewer.osuId);
  const online = relayOnline(viewer.osuId);
  const r = t.admin.refApp;

  return (
    <>
      <PageTitle mark="chevrons">{t.admin.menu.refapp}</PageTitle>
      <div className="grid max-w-3xl gap-6">
        {st && (
          <Panel title={r.linkTitle} i={1}>
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className="in-pop inline-flex -skew-x-12 border border-rose bg-rose/10 px-5 py-2 shadow-[4px_4px_0_0_var(--color-rose-deep)]">
                  <span className="num inline-block skew-x-12 text-4xl tracking-[0.2em] text-paper">{linkWord(st)}</span>
                </span>
                <span className="text-sm font-bold text-ash">{r.linkCode}</span>
              </div>
              <ActionForm action={linkApp.bind(null, st)} submit={r.link} />
            </div>
          </Panel>
        )}
        <Panel title={t.admin.menu.refapp} i={st ? 2 : 1}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2.5 text-sm font-black uppercase tracking-wide">
              <span className={cn("size-2.5 rotate-45", online ? "bg-balkan" : app ? "bg-gold" : "bg-line")} aria-hidden />
              <span className={online ? "text-paper" : "text-ash"}>{online ? r.online : app ? r.offline : r.none}</span>
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-3">
              <SlantButton href="/download/ref-helper" download tone="paper">
                <Download className="size-4" /> {r.download}
              </SlantButton>
              {app && <ActionForm action={unlinkApp} submit={r.unlink} ghost confirm={r.unlinkAsk} />}
            </span>
          </div>
        </Panel>
      </div>
    </>
  );
}
