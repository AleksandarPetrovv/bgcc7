import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page";
import { getLog, getLogCtx, getStaff } from "@/db/admin";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { LogTable } from "./log-table";
import { StaffFilter } from "./staff-filter";

export default async function AdminLog({ searchParams }: PageProps<"/admin/log">) {
  const [t, lang, viewer, sp] = await Promise.all([getDict(), getLang(), getViewer(), searchParams]);
  if (!can(viewer?.roles, "log")) notFound();
  const staff = await getStaff();
  const raw = typeof sp.user === "string" && /^\d+$/.test(sp.user) ? Number(sp.user) : null;
  const filter = raw !== null && Number.isSafeInteger(raw) && raw > 0 && (raw === viewer?.osuId || staff.some((s) => s.osuId === raw)) ? raw : undefined;
  const [rows, ctx] = await Promise.all([getLog(500, filter), getLogCtx()]);
  const options = staff.filter((s) => s.osuId > 0).map((s) => ({ value: String(s.osuId), label: s.username, avatar: s.avatarUrl ?? `https://a.ppy.sh/${s.osuId}`, hint: s.permRoles.map((r) => t.admin.roles[r] ?? r).join(" · ") }));
  if (viewer && !options.some((o) => o.value === String(viewer.osuId))) {
    options.unshift({ value: String(viewer.osuId), label: ctx.user.get(viewer.osuId) ?? `#${viewer.osuId}`, avatar: `https://a.ppy.sh/${viewer.osuId}`, hint: viewer.roles.map((r) => t.admin.roles[r] ?? r).join(" · ") });
  }
  return (
    <>
      <PageTitle>{t.admin.menu.log}</PageTitle>
      <StaffFilter options={options} value={filter === undefined ? "" : String(filter)} label={t.admin.audit.filterStaff} all={t.admin.audit.allStaff} />
      <LogTable key={filter ?? "all"} rows={rows} ctx={ctx} lang={lang} t={t} empty={t.admin.noLog} />
    </>
  );
}
