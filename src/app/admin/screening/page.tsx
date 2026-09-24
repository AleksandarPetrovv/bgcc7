import { LinkTabs } from "@/components/site/tabs";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { ActionForm, inputCls, Panel, Field } from "@/components/admin/form";
import { getRegistrations, STATUSES, isStatus } from "@/db/registrations";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { fmtSofia } from "@/lib/time";
import { cn } from "@/lib/utils";
import { addPlayer, approveAllPending, refreshStats } from "./actions";
import { ScreeningRow } from "./screening-row";

export default async function AdminScreening({ searchParams }: PageProps<"/admin/screening">) {
  const [t, lang, viewer, rows, sp] = await Promise.all([getDict(), getLang(), getViewer(), getRegistrations(), searchParams]);
  if (!can(viewer?.role, "screening")) notFound();
  const filter = isStatus(sp.status) ? sp.status : null;
  const shown = filter ? rows.filter((r) => r.status === filter) : rows;
  const count = (s: string | null) => (s ? rows.filter((r) => r.status === s).length : rows.length);
  const locale = lang === "bg" ? "bg-BG" : "en-GB";

  return (
    <>
      <PageTitle>{t.admin.menu.screening}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.screeningHelp} d={0.15} s={0.012} />
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
        <Panel title={t.admin.addPlayer} help={t.admin.addPlayerHelp}>
          <ActionForm action={addPlayer} submit={t.admin.add} className="flex items-center gap-3">
            <Field name="q" required maxLength={32} placeholder={t.admin.addPlaceholder} aria-label={t.admin.addPlaceholder} className={cn(inputCls, "flex-1 sm:max-w-sm")} />
          </ActionForm>
        </Panel>
        <div className="in-right flex flex-col justify-center gap-3 border border-line bg-coal p-5 xl:w-80 [--d:0.3s]">
          <ActionForm action={approveAllPending} submit={t.admin.approveAll} confirm={t.admin.confirmApproveAll} className="[&>div]:w-full [&_button]:min-h-14 [&_button]:w-full [&_button]:text-base" />
          <ActionForm action={refreshStats} submit={t.admin.refreshStats} ghost className="[&>div]:w-full [&_button]:min-h-14 [&_button]:w-full [&_button]:text-base" />
        </div>
        <Panel title={t.admin.exportPlayers} help={t.admin.exportHelp} className="xl:col-span-2">
          <div className="flex flex-wrap gap-3">
            <a href="/admin/screening/export" className="lift-sm inline-flex min-h-10 -skew-x-12 items-center bg-balkan px-4 text-sm font-black uppercase tracking-wide text-ink hover:bg-paper">
              <span className="inline-flex skew-x-12 items-center gap-2">
                <Download className="size-4" /> {t.admin.exportPlayers}
              </span>
            </a>
            <a href="/admin/screening/export?teams=1" className="lift-sm inline-flex min-h-10 -skew-x-12 items-center border border-line px-4 text-sm font-black uppercase tracking-wide text-paper hover:border-rose">
              <span className="inline-flex skew-x-12 items-center gap-2">
                <Download className="size-4" /> {t.admin.exportTeams}
              </span>
            </a>
          </div>
        </Panel>
      </div>

      <LinkTabs
        className="mb-4"
        label={t.admin.menu.screening}
        items={[null, ...STATUSES].map((s) => ({
          href: s ? `/admin/screening?status=${s}` : "/admin/screening",
          active: filter === s,
          label: (
            <>
              {s ? t.status[s] : t.admin.all} <span className="num text-sm opacity-80">{count(s)}</span>
            </>
          ),
        }))}
      />

      {shown.length ? (
        <div className="space-y-2">
          {shown.map((p, i) => (
            <ScreeningRow key={`${p.osuId}-${p.status}`} p={p} i={i} signedAt={fmtSofia(p.createdAt, locale)} />
          ))}
        </div>
      ) : (
        <p className="border border-line bg-coal p-4 text-sm text-ash">{t.admin.noRegs}</p>
      )}
    </>
  );
}
