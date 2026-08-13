import { LinkTabs } from "@/components/site/tabs";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page";
import { getLog, getLogCtx } from "@/db/admin";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { groupOf, LOG_GROUPS, LogTable } from "./log-table";

export default async function AdminLog({ searchParams }: PageProps<"/admin/log">) {
  const [t, lang, viewer, rows, ctx, sp] = await Promise.all([getDict(), getLang(), getViewer(), getLog(500), getLogCtx(), searchParams]);
  if (!can(viewer?.role, "log")) notFound();
  const filter = typeof sp.type === "string" && sp.type in LOG_GROUPS ? sp.type : null;
  const shown = filter ? rows.filter((r) => groupOf(r.action) === filter) : rows;
  return (
    <>
      <PageTitle>{t.admin.menu.log}</PageTitle>
      <LinkTabs
        className="mb-6"
        label={t.admin.menu.log}
        items={[null, ...Object.keys(LOG_GROUPS)].map((g) => ({ href: g ? `/admin/log?type=${g}` : "/admin/log", active: filter === g, label: g ? t.admin.logGroups[g] : t.admin.all }))}
      />
      <LogTable key={filter ?? "all"} rows={shown} ctx={ctx} lang={lang} t={t} empty={t.admin.noLog} />
    </>
  );
}
