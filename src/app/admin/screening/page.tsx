import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
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
      <h1 className="heading-slam mb-2 text-4xl sm:text-5xl">{t.admin.menu.screening}</h1>
      <p className="mb-6 max-w-2xl text-sm text-ash">{t.admin.screeningHelp}</p>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
        <Panel title={t.admin.addPlayer} help={t.admin.addPlayerHelp}>
          <ActionForm action={addPlayer} submit={t.admin.add} className="flex flex-wrap items-center gap-3">
            <input name="q" required maxLength={32} placeholder={t.admin.addPlaceholder} aria-label={t.admin.addPlaceholder} className={cn(inputCls, "w-64")} />
          </ActionForm>
        </Panel>
        <div className="flex flex-wrap content-start gap-3 border border-line bg-coal p-4">
          <ActionForm action={approveAllPending} submit={t.admin.approveAll} ghost confirm={t.admin.confirmApproveAll} />
          <ActionForm action={refreshStats} submit={t.admin.refreshStats} ghost />
        </div>
      </div>

      <nav className="mb-4 flex overflow-x-auto border border-line" aria-label={t.admin.menu.screening}>
        {[null, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/screening?status=${s}` : "/admin/screening"}
            className={cn(
              "flex shrink-0 items-center gap-2 border-r border-line px-4 py-2.5 text-sm font-black uppercase last:border-r-0",
              filter === s ? "bg-paper text-ink" : "text-ash hover:bg-slate hover:text-paper",
            )}
          >
            {s ? t.status[s] : t.admin.all} <span className="num text-base">{count(s)}</span>
          </Link>
        ))}
      </nav>

      {shown.length ? (
        <div className="space-y-2">
          {shown.map((p) => (
            <ScreeningRow key={`${p.osuId}-${p.status}`} p={p} signedAt={fmtSofia(p.createdAt, locale)} />
          ))}
        </div>
      ) : (
        <p className="border border-line bg-coal p-4 text-sm text-ash">{t.admin.noRegs}</p>
      )}
    </>
  );
}
